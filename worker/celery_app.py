from celery import Celery

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


@app.task(name='celery_app.run_command')
def run_command(command):
    """
    Sistem komutunu çalıştırır ve sonucu döndürür.
    
    Args:
        command: Çalıştırılacak komut (string veya liste)
    
    Returns:
        dict: Komut çalıştırma sonuçları
    """
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
        
        
        return {
            "status": "success",
            "command": command if isinstance(command, str) else " ".join(command),
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode
        }
    except subprocess.CalledProcessError as e:
        return {
            "status": "error",
            "command": command if isinstance(command, str) else " ".join(command),
            "stdout": e.stdout,
            "stderr": e.stderr,
            "return_code": e.returncode,
            "error": str(e)
        }
    except Exception as e:
        return {
            "status": "error",
            "command": command if isinstance(command, str) else " ".join(command),
            "error": str(e)
        }