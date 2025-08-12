from datetime import datetime, timezone, timedelta
from celery import Celery
from model import db, init_app, Task, CrawlResult, NmapResult, WhoisResult
from flask import Flask



flask_app = Flask(__name__)
init_app(flask_app)

# RabbitMQ bağlantı bilgileri - Docker Compose'da tanımlanan değerler
BROKER_URL = 'amqp://guest:guest@rabbitmq:5672//'
RESULT_BACKEND = 'rpc://'

# Celery uygulaması oluşturma
app = Celery('worker',
             broker=BROKER_URL,
             backend=RESULT_BACKEND)

# Opsiyonel konfigürasyon ayarları
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Europe/Istanbul',
    enable_utc=True,
    worker_concurrency=4,  # 4 işçi süreci çalıştır
)

# Task tanımlaması
@app.task(name='celery_app.add_numbers')
def add_numbers(x, y):
    return x + y

@app.task(name='celery_app.run_command', bind=True)
def run_command(self, command):

    import subprocess
    import shlex
    
    try:
        # Komut string olarak geldiyse, shlex ile parçala
        if isinstance(command, str):
            cmd = shlex.split(command)
        else:
            cmd = command
            
        # Komutu çalıştır
        result = subprocess.run(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        
        # Veritabanına başarılı görev kaydı ekleme
        with flask_app.app_context():
            existing_task = Task.query.filter_by(id=self.request.id).first()
            if existing_task:
                existing_task.status = 'SUCCESS'
                existing_task.result = result.stdout.replace('\n', ' ').strip() if result.stdout else None
                existing_task.completed_at = datetime.now() + timedelta(hours=3)
                db.session.commit()

        return {
            "status": "success",
            "command": command if isinstance(command, str) else " ".join(command),
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode
        }
        
    except subprocess.CalledProcessError as e:
        # Hata durumunda da veritabanına kaydet
        try:
            with flask_app.app_context():
                existing_task = Task.query.filter_by(id=self.request.id).first()
                if existing_task:
                    existing_task.status = 'FAILURE'
                    existing_task.result = {
                        "status": "error",
                        "command": command if isinstance(command, str) else ",".join(command),
                        "stdout": e.stdout.strip() if e.stdout else None,
                        "stderr": e.stderr.strip() if e.stderr else None,
                        "return_code": e.returncode,
                        "error": str(e)
                    }
                    existing_task.completed_at = datetime.now() + timedelta(hours=3)
                    db.session.commit()
        except Exception as db_error:
            print(f"Database error in subprocess exception: {db_error}")
            
        return {
            "status": "error",
            "command": command if isinstance(command, str) else " ".join(command),
            "stdout": e.stdout,
            "stderr": e.stderr,
            "return_code": e.returncode,
            "error": str(e)
        }
        
    except Exception as e:
        # Genel hata durumu
        try:
            with flask_app.app_context():
                saved_task = Task(
                    id=self.request.id,
                    task_type='run_command', 
                    status='FAILURE',
                    parameters={'command': str(command)},
                    result={
                        "status": "error",
                        "command": str(command),
                        "error": str(e)
                    }
                )
                db.session.add(saved_task)
                db.session.commit()
        except Exception as db_error:
            print(f"Database error in general exception: {db_error}")
            
        return {
            "status": "error",
            "command": str(command),
            "error": str(e)
        }
    

@app.task(name='celery_app.run_katana', bind=True)
def run_katana(self, url):
    import subprocess
    import shlex
    import json
    import os
    
    try:
        # Docker container'ında Katana komutunu çalıştır
        cmd = [
            'docker', 'exec', 'katana_crawler',
            'katana', '-u', url
        ]
        print(f"Running command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True,
            check=True,
            timeout=300  # 5 dakika timeout
        )
        
        crawl_results = []
        if result.stdout:
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    try:
                        crawl_data = json.loads(line)
                        crawl_results.append(crawl_data)
                    except json.JSONDecodeError:
                        # JSON parse edilemeyen satırları text olarak ekle
                        crawl_results.append({"url": line.strip()})
        
        # Veritabanına başarılı görev kaydı ekleme
        with flask_app.app_context():
            existing_task = Task.query.filter_by(id=self.request.id).first()
            if existing_task:
                existing_task.status = 'SUCCESS'
                existing_task.result = {
                    "status": "success",
                    "url": url,
                    "crawl_results": crawl_results,
                    "total_found": len(crawl_results),
                    "raw_output": result.stdout.strip() if result.stdout else None,
                    "found_url": [item.get('url') for item in crawl_results if isinstance(item, dict) and item.get('url')]
                }
                existing_task.completed_at = datetime.now() + timedelta(hours=3)
                db.session.commit()
                
            # CrawlResult tablosuna kaydet
            found_urls = [item.get('url') for item in crawl_results if isinstance(item, dict) and item.get('url')]
            crawl_record = CrawlResult(
                task_id=self.request.id,
                url=url,
                content_length=len(found_urls),
                created_at=datetime.now() + timedelta(hours=3)
            )
            db.session.add(crawl_record)
            db.session.commit()

        return {
            "status": "success",
            "url": url,
            "crawl_results": crawl_results,
            "total_found": len(crawl_results),
            "stdout": result.stdout.strip() if result.stdout else "",
            "stderr": result.stderr.strip() if result.stderr else "",
            "return_code": result.returncode
        }
        
    except subprocess.TimeoutExpired:
        # Timeout durumu
        try:
            with flask_app.app_context():
                existing_task = Task.query.filter_by(id=self.request.id).first()
                if existing_task:
                    existing_task.status = 'FAILURE'
                    existing_task.result = {
                        "status": "timeout",
                        "url": url,
                        "error": "Katana crawling timeout (5 minutes)"
                    }
                    existing_task.completed_at = datetime.now() + timedelta(hours=3)
                    db.session.commit()
        except Exception as db_error:
            print(f"Database error in timeout: {db_error}")
            
        return {
            "status": "timeout",
            "url": url,
            "error": "Katana crawling timeout (5 minutes)"
        }
        
    except subprocess.CalledProcessError as e:
        # Hata durumunda da veritabanına kaydet
        try:
            with flask_app.app_context():
                existing_task = Task.query.filter_by(id=self.request.id).first()
                if existing_task:
                    existing_task.status = 'FAILURE'
                    existing_task.result = {
                        "status": "error",
                        "url": url,
                        "stdout": e.stdout.strip() if e.stdout else None,
                        "stderr": e.stderr.strip() if e.stderr else None,
                        "return_code": e.returncode,
                        "error": str(e)
                    }
                    existing_task.completed_at = datetime.now() + timedelta(hours=3)
                    db.session.commit()
        except Exception as db_error:
            print(f"Database error in subprocess exception: {db_error}")
            
        return {
            "status": "error",
            "url": url,
            "stdout": e.stdout.strip() if e.stdout else "",
            "stderr": e.stderr.strip() if e.stderr else "",
            "return_code": e.returncode,
            "error": str(e)
        }
        
    except Exception as e:
        # Genel hata durumu
        try:
            with flask_app.app_context():
                existing_task = Task.query.filter_by(id=self.request.id).first()
                if existing_task:
                    existing_task.status = 'FAILURE'
                    existing_task.result = {
                        "status": "error",
                        "url": url,
                        "error": str(e)
                    }
                    existing_task.completed_at = datetime.now() + timedelta(hours=3)
                    db.session.commit()
        except Exception as db_error:
            print(f"Database error in general exception: {db_error}")
            
        return {
            "status": "error",
            "url": str(url),
            "error": str(e)
        }


@app.task(name='celery_app.run_nmap', bind=True)
def run_nmap(self, target):
    import subprocess
    import shlex
    
    try:
        # Nmap komutunu çalıştır
        cmd = ['docker', 'exec', 'nmap_scanner', 'nmap', '-sV', target]
        print(f"Running command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True,
            check=True,
            timeout=300  # 5 dakika timeout
        )
        
        # Veritabanına başarılı görev kaydı ekleme
        with flask_app.app_context():
            existing_task = Task.query.filter_by(id=self.request.id).first()
            if existing_task:
                existing_task.status = 'SUCCESS'
                existing_task.result = {
                    "status": "success",
                    "target": target,
                    "scan_result": result.stdout.strip() if result.stdout else None,
                }
                existing_task.completed_at = datetime.now() + timedelta(hours=3)
                db.session.commit()
                
            # NmapResult tablosuna kaydet
            nmap_record = NmapResult(
                task_id=self.request.id,
                target=target,
                scan_result=result.stdout.strip() if result.stdout else None,
                created_at=datetime.now() + timedelta(hours=3)
            )
            db.session.add(nmap_record)
            db.session.commit()

        return {
            "status": "success",
            "target": target,
            "scan_result": result.stdout.strip() if result.stdout else "",
            "stderr": result.stderr.strip() if result.stderr else "",
            "return_code": result.returncode
        }
        
    except subprocess.TimeoutExpired:
        # Timeout durumu
        try:
            with flask_app.app_context():
                existing_task = Task.query.filter_by(id=self.request.id).first()
                if existing_task:
                    existing_task.status = 'FAILURE'
                    existing_task.result = {
                        "status": "timeout",
                        "target": target,
                        "error": "Nmap scan timeout (5 minutes)"
                    }
                    existing_task.completed_at = datetime.now() + timedelta(hours=3)
                    db.session.commit()
        except Exception as db_error:
            print(f"Database error in timeout: {db_error}")
            
        return {
            "status": "timeout",
            "target": target,
            "error": "Nmap scan timeout (5 minutes)"
        }
    
    except subprocess.CalledProcessError as e:
        # Hata durumunda da veritabanına kaydet
        try:
            with flask_app.app_context():
                existing_task = Task.query.filter_by(id=self.request.id).first()
                if existing_task:
                    existing_task.status = 'FAILURE'
                    existing_task.result = {
                        "status": "error",
                        "target": target,
                        "stdout": e.stdout.strip() if e.stdout else None,
                        "stderr": e.stderr.strip() if e.stderr else None,
                        "return_code": e.returncode,
                        "error": str(e)
                    }
                    existing_task.completed_at = datetime.now() + timedelta(hours=3)
                    db.session.commit()
        except Exception as db_error:
            print(f"Database error in subprocess exception: {db_error}")
            
        return {
            "status": "error",
            "target": target,
            "stdout": e.stdout.strip() if e.stdout else "",
            "stderr": e.stderr.strip() if e.stderr else "",
            "return_code": e.returncode,
            "error": str(e)
        }
        
@app.task(name='celery_app.whois_lookup', bind=True)
def whois_lookup(self, ip_address_or_domain):
    import subprocess
    import shlex
    
    try:
        # Whois komutunu çalıştır
        cmd = ['docker', 'exec', 'whois_lookup', 'whois', ip_address_or_domain]
        print(f"Running command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True,
            check=True,
            timeout=300  # 5 dakika timeout
        )
        # Whois sonucu veritabanına kaydet
        with flask_app.app_context():
            existing_task = Task.query.filter_by(id=self.request.id).first()
            if existing_task:
                existing_task.status = 'SUCCESS'
                existing_task.result = {
                    "status": "success",
                    "ip_address_or_domain": ip_address_or_domain,
                    "whois_result": result.stdout.strip() if result.stdout else None,
                }
                existing_task.completed_at = datetime.now() + timedelta(hours=3)
                db.session.commit()
                
            # WhoisResult tablosuna kaydet
            whois_record = WhoisResult(
                task_id=self.request.id,
                domain=ip_address_or_domain,
                created_at=datetime.now() + timedelta(hours=3),
                whois_data=result.stdout.strip() if result.stdout else None
            )
            db.session.add(whois_record)
            db.session.commit()
        


        return {
            "status": "success",
            "ip_address_or_domain": ip_address_or_domain,
            "whois_result": result.stdout.strip() if result.stdout else "",
            "stderr": result.stderr.strip() if result.stderr else "",
            "return_code": result.returncode
        }
        
    except subprocess.TimeoutExpired:
        # Timeout durumu
        try:
    

            with flask_app.app_context():
                existing_task = Task.query.filter_by(id=self.request.id).first()
                if existing_task:
                    existing_task.status = 'FAILURE'
                    existing_task.result = {
                        "status": "timeout",
                        "ip_address_or_domain": ip_address_or_domain,
                        "error": "Whois lookup timeout (5 minutes)"
                    }
                    existing_task.completed_at = datetime.now() + timedelta(hours=3)
                    # WhoisResult tablosuna kaydet
                    whois_record = WhoisResult(
                        task_id=self.request.id,
                        domain=ip_address_or_domain,
                        created_at=datetime.now() + timedelta(hours=3),
                        whois_data=result.stdout.strip() if result.stdout else None
                    )
                    db.session.add(whois_record)
                    db.session.commit()
        except Exception as db_error:
            print(f"Database error in timeout: {db_error}")
            
        return {
            "status": "timeout",
            "ip_address_or_domain": ip_address_or_domain,
            "error": "Whois lookup timeout (5 minutes)"
        }
    
    except subprocess.CalledProcessError as e:
        # Hata durumunda da veritabanına kaydet
        try:
            with flask_app.app_context():
                existing_task = Task.query.filter_by(id=self.request.id).first()
                if existing_task:
                    existing_task.status = 'FAILURE'
                    existing_task.result = {
                        "status": "error",
                        "ip_address_or_domain": ip_address_or_domain,
                        "stdout": e.stdout.strip() if e.stdout else None,
                        "stderr": e.stderr.strip() if e.stderr else None,
                        "return_code": e.returncode,
                        "error": str(e)
                    }
                    existing_task.completed_at = datetime.now() + timedelta(hours=3)
                    # WhoisResult tablosuna kaydet
                    whois_record = WhoisResult(
                        task_id=self.request.id,
                        domain=ip_address_or_domain,
                        created_at=datetime.now() + timedelta(hours=3),
                        whois_data=result.stdout.strip() if result.stdout else None
                    )
                    db.session.add(whois_record)
                    db.session.commit()
        except Exception as db_error:
            print(f"Database error in subprocess exception: {db_error}")
        return {
            "status": "error",
            "ip_address_or_domain": ip_address_or_domain,
            "stdout": e.stdout.strip() if e.stdout else "",
            "stderr": e.stderr.strip() if e.stderr else "",
            "return_code": e.returncode,
            "error": str(e)
        }
