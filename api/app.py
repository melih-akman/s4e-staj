import datetime
from flask import Flask, render_template, request, jsonify
from celery import Celery
from model import db, init_app, Task
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Tüm origins için izin ver

# Veritabanı yapılandırması
init_app(app)

# Uygulama başlatıldığında tabloları oluştur
with app.app_context():
    db.create_all()

# Celery konfigürasyonu (RabbitMQ ile)
app.config['CELERY_BROKER_URL'] = 'amqp://guest:guest@rabbitmq:5672//'
app.config['CELERY_RESULT_BACKEND'] = 'rpc://'  # RabbitMQ ile önerilen backend

celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'], backend=app.config['CELERY_RESULT_BACKEND'])
celery.conf.update(app.config)

def is_valid_url(url):
    # Basit bir URL doğrulama
    return url.startswith('http://') or url.startswith('https://') and url.count('.') >= 1

def is_valid_url_nmap(url):
    return url.count('.') >= 1

def is_valid_url_or_ip(value):
    return is_valid_url_nmap(value) or is_valid_ip(value)

def is_valid_ip(ip):
    # Basit bir IP adresi doğrulama
    parts = ip.split('.')
    if len(parts) != 4:
        return False
    for part in parts:
        if not part.isdigit() or not 0 <= int(part) <= 255:
            return False
    return True

def is_valid_command(command):
    disallowed_commands = ['sudo', 'rm', 'del', 'copy', 'move']
    for cmd in disallowed_commands:
        if cmd in command:
            return False
    return True

@app.route('/api/run-command', methods=['POST'])
def run_system_command():
    data = request.get_json()
    command = data.get('command')
    user_type = request.headers.get('User-Type', 'guest')

    if user_type == 'authenticated':
        user_id = request.headers.get('User-ID')
    else:
        user_id = request.headers.get('Session-ID')   
    if not command:
        return jsonify({'error': 'Komut gerekli'}), 422
    
    # Güvenlik kontrolü (opsiyonel ama önerilir)
    # Gerçek bir uygulamada daha kapsamlı güvenlik önlemleri alınmalıdır
    if ';' in command or '&&' in command or '|' in command:
        return jsonify({'error': 'Geçersiz komut'}), 412

    if not is_valid_command(command):
        return jsonify({'error': 'Geçersiz komut'}), 412

    # Celery görevini başlat
    task = celery.send_task('celery_app.run_command', args=[command,user_id])

    #database kaydı oluştur
    new_task = Task(id=task.id, task_type='run_command', status='PENDING', parameters={'command': command}, user_id=user_id)
    db.session.add(new_task)
    db.session.commit()
    

    return jsonify({
        'task_id': task.id,
        'message': f"'{command}' komutu başlatıldı",
        'check_status_url': f"/command-result/{task.id}"
    }), 202

# Katana Endpointi için task ekleme
@app.route('/api/run-katana', methods=['POST'])
def run_katana():
    data = request.get_json()
    url = data.get('url')
    user_type = request.headers.get('User-Type', 'guest')

    if user_type == 'authenticated':
        user_id = request.headers.get('User-ID')
    else:
        user_id = request.headers.get('Session-ID')
    if not url:
        return jsonify({'error': 'URL gerekli'}), 422
    if not is_valid_url(url):
        return jsonify({'error': 'Geçersiz URL'}), 412
    # Celery görevini başlat
    task = celery.send_task('celery_app.run_katana', args=[url, user_id])

    # Veritabanına yeni görev kaydı ekle
    new_task = Task(id=task.id, task_type='run_katana', status='PENDING', parameters={'url': url}, user_id=user_id)
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify({
        'task_id': task.id,
        'message': f"'{url}' için Katana taraması başlatıldı",
        'check_status_url': f"/katana-result/{task.id}"
    }), 202

@app.route('/api/nmap-scan', methods=['POST'])
def run_nmap_scan():
    data = request.get_json()
    target = data.get('target')
    user_type = request.headers.get('User-Type', 'guest')

    if user_type == 'authenticated':
        user_id = request.headers.get('User-ID')
    else:
        user_id = request.headers.get('Session-ID')
    if not target:
        return jsonify({'error': 'Hedef gerekli'}), 422
    if not is_valid_url_or_ip(target):
        return jsonify({'error': 'Geçersiz URL veya IP adresi'}), 412

    # Celery görevini başlat
    task = celery.send_task('celery_app.run_nmap', args=[target, user_id])

    # Veritabanına yeni görev kaydı ekle
    new_task = Task(id=task.id, task_type='run_nmap', status='PENDING', parameters={'target': target}, user_id=user_id)
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify({
        'task_id': task.id,
        'message': f"'{target}' için Nmap taraması başlatıldı",
        'check_status_url': f"/nmap-result/{task.id}"
    }), 202

@app.route('/api/whois-lookup', methods=['POST'])
def whois_lookup():
    data = request.get_json()
    ip_address_or_domain = data.get('ip_address_or_domain')
    user_type = request.headers.get('User-Type', 'guest')

    if user_type == 'authenticated':
        user_id = request.headers.get('User-ID')
    else:
        user_id = request.headers.get('Session-ID')
    print(f"Received WHOIS lookup request for: {ip_address_or_domain} by user {user_id}")

    if not ip_address_or_domain:
        return jsonify({'error': 'IP adresi veya domain gerekli'}), 400
    if not is_valid_url_nmap(ip_address_or_domain) and not is_valid_ip(ip_address_or_domain):
        return jsonify({'error': 'Geçersiz IP adresi veya domain'}), 412

    task = celery.send_task('celery_app.whois_lookup', args=[ip_address_or_domain, user_id])

    # Veritabanına yeni görev kaydı ekle
    new_task = Task(id=task.id, task_type='whois_lookup', status='PENDING', parameters={'ip_address': ip_address_or_domain}, user_id=user_id)
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify({
        'task_id': task.id,
        'message': f"'{ip_address_or_domain}' için WHOIS sorgusu başlatıldı",
        'check_status_url': f"/whois-result/{task.id}",
        'User-ID': user_id
    }), 202

@app.route('/api/command-result/<task_id>')
def get_command_result(task_id):
    # Önce veritabanından kontrol et
    db_task = db.session.query(Task).filter_by(id=task_id).first()
    
    if db_task and db_task.status in ['SUCCESS', 'FAILURE']:
        return jsonify({
            'task_id': db_task.id,
            'status': db_task.status,
            'result': db_task.result
        })
    
    # Veritabanında güncel sonuç yoksa Celery'den kontrol et
    task = celery.AsyncResult(task_id)
    
    if task.state == 'SUCCESS':
        return jsonify({'result': task.result})
    return jsonify({'state': task.state})

@app.route('/api/katana-result/<task_id>')
def get_katana_result(task_id):
    db_task = db.session.query(Task).filter_by(id=task_id).first()

    if db_task and db_task.status in ['SUCCESS', 'FAILURE']:
        return jsonify({
            'task_id': db_task.id,
            'status': db_task.status,
            'result': db_task.result
        })
    
    # Veritabanında güncel sonuç yoksa Celery'den kontrol et
    task = celery.AsyncResult(task_id)
    
    if task.state == 'SUCCESS':
        return jsonify({'result': task.result})
    return jsonify({'state': task.state})

@app.route('/api/nmap-result/<task_id>')
def get_nmap_result(task_id):
    db_task = db.session.query(Task).filter_by(id=task_id).first()

    if db_task and db_task.status in ['SUCCESS', 'FAILURE']:
        return jsonify({
            'task_id': db_task.id,
            'status': db_task.status,
            'result': db_task.result
        })
    
    # Veritabanında güncel sonuç yoksa Celery'den kontrol et
    task = celery.AsyncResult(task_id)
    
    if task.state == 'SUCCESS':
        return jsonify({'result': task.result})
    return jsonify({'state': task.state})

@app.route('/api/whois-result/<task_id>')
def get_whois_result(task_id):
    db_task = db.session.query(Task).filter_by(id=task_id).first()

    if db_task and db_task.status in ['SUCCESS', 'FAILURE']:
        return jsonify({
            'task_id': db_task.id,
            'status': db_task.status,
            'result': db_task.result
        })
    
    # Veritabanında güncel sonuç yoksa Celery'den kontrol et
    task = celery.AsyncResult(task_id)
    
    if task.state == 'SUCCESS':
        return jsonify({'result': task.result})
    return jsonify({'state': task.state})

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for Docker health check"""
    try:
        # Test database connection
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.datetime.now().isoformat(),
            'service': 'CyberLens API'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.datetime.now().isoformat(),
            'service': 'CyberLens API'
        }), 500

@app.route('/api/counterData', methods=['GET'])
def get_counter_data():
    # Örnek sayaç verisi
    taskCount = db.session.query(Task).filter_by(status='PENDING').count()
    completedTaskCount = db.session.query(Task).filter_by(status='SUCCESS').count()
    failedTaskCount = db.session.query(Task).filter_by(status='FAILURE').count()


    counter_data = [
        {'id': 1, 'value': taskCount},
        {'id': 2, 'value': completedTaskCount},
        {'id': 3, 'value': failedTaskCount},
        {'id': 4, 'value': 0}
    ]
    return jsonify(counter_data)

@app.route('/api/history/<user_id>', methods=['GET'])
def get_history(user_id):
    # Kullanıcının geçmiş görevlerini getir
    tasks = db.session.query(Task).filter_by(user_id=user_id).order_by(Task.created_at.desc()).all()
    if not tasks:
        return jsonify({'message': 'No tasks found for this user'}), 401
    return jsonify([{
        'id': task.id,
        'task_type': task.task_type,
        'status': task.status,
        'created_at': task.created_at,
        'completed_at': task.completed_at,
        'result': task.result
    } for task in tasks])

if __name__ == '__main__':
    app.run(debug=True)

