from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta, timezone
import os

# SQLAlchemy instance oluştur
db = SQLAlchemy()

def init_app(app):
    """
    Flask uygulamasına SQLAlchemy'yi yapılandırır ve bağlar
    """
    # Veritabanı bağlantı URL'si Docker Compose'dan alınır
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/postgres')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # SQLAlchemy'yi uygulama ile ilişkilendir
    db.init_app(app)


# Görev modeli
class Task(db.Model):
    __tablename__ = 'tasks'
    
    id = db.Column(db.String(36), primary_key=True)  # Celery task ID'si
    task_type = db.Column(db.String(50), nullable=False)  # Görev tipi (add_numbers, run_command)
    status = db.Column(db.String(20), nullable=False)  # SUCCESS, PENDING, FAILURE
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Görev parametreleri ve sonuçları JSON olarak saklanır
    parameters = db.Column(db.JSON, nullable=True)
    result = db.Column(db.JSON, nullable=True)
    
    def __repr__(self):
        return f"<Task {self.id} ({self.task_type}): {self.status}>"
    
    def to_dict(self):
        """
        Task modelini JSON serileştirilebilir bir sözlüğe dönüştürür
        """
        return {
            'id': self.id,
            'task_type': self.task_type,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'parameters': self.parameters,
            'result': self.result
        }


# Crawl Sonuçları modeli
class CrawlResult(db.Model):
    __tablename__ = 'crawl_results'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.String(36), db.ForeignKey('tasks.id'))
    url = db.Column(db.String(2048), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now() + timedelta(hours=3))
    content_length = db.Column(db.Integer, nullable=True)

    # Görevle ilişki
    task = db.relationship('Task', backref=db.backref('crawl_results', lazy=True))
    
    def __repr__(self):
        return f"<CrawlResult {self.id}: {self.found_url}>"
    

class NmapResult(db.Model):
    __tablename__ = 'nmap_results'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.String(36), db.ForeignKey('tasks.id'))
    target = db.Column(db.String(2048), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now() + timedelta(hours=3))
    scan_result = db.Column(db.Text, nullable=True)

    # Görevle ilişki
    task = db.relationship('Task', backref=db.backref('nmap_results', lazy=True))
    
    def __repr__(self):
        return f"<NmapResult {self.id}: {self.target}>"
    

