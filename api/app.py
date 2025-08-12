from flask import Flask, request, jsonify
from celery import Celery
from model import db, init_app, Task, CrawlResult




app = Flask(__name__)

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

# Basit bir arka plan görevi
@celery.task(name='celery_app.add_numbers')
def add_numbers(x, y):
    return x + y

@app.route('/add', methods=['POST'])
def add():
    data = request.get_json()
    x = data.get('x')
    y = data.get('y')
    #0.5 saniye bekleme simülasyonu
    import time
    time.sleep(0.5)
    task = add_numbers.apply_async(args=[x, y])
    return jsonify({'task_id': task.id}), 202

@app.route('/result/<task_id>')
def get_result(task_id):
    task = add_numbers.AsyncResult(task_id)
    if task.state == 'SUCCESS':
        return jsonify({'result': task.result})
    return jsonify({'state': task.state})

@app.route('/run-command', methods=['POST'])
def run_system_command():
    data = request.get_json()
    command = data.get('command')
    
    if not command:
        return jsonify({'error': 'Komut gerekli'}), 400
    
    # Güvenlik kontrolü (opsiyonel ama önerilir)
    # Gerçek bir uygulamada daha kapsamlı güvenlik önlemleri alınmalıdır
    if ';' in command or '&&' in command or '|' in command:
        return jsonify({'error': 'Geçersiz komut'}), 400
        
    # Celery görevini başlat
    task = celery.send_task('celery_app.run_command', args=[command])

    #database kaydı oluştur
    new_task = Task(id=task.id, task_type='run_command', status='PENDING', parameters={'command': command})
    db.session.add(new_task)
    db.session.commit()
    

    return jsonify({
        'task_id': task.id,
        'message': f"'{command}' komutu başlatıldı",
        'check_status_url': f"/command-result/{task.id}"
    }), 202


@app.route('/command-result/<task_id>')
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

# Katana Endpointi için task ekleme
@app.route('/run-katana', methods=['POST'])
def run_katana():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL gerekli'}), 400
    
    # Celery görevini başlat
    task = celery.send_task('celery_app.run_katana', args=[url])

    # Veritabanına yeni görev kaydı ekle
    new_task = Task(id=task.id, task_type='run_katana', status='PENDING', parameters={'url': url})
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify({
        'task_id': task.id,
        'message': f"'{url}' için Katana taraması başlatıldı",
        'check_status_url': f"/katana-result/{task.id}"
    }), 202

if __name__ == '__main__':
    app.run(debug=True)