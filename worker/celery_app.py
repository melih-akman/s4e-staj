from datetime import datetime, timezone, timedelta
from celery import Celery
from model import db, init_app, Task, CrawlResult
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