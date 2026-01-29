from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class JobApplication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company = db.Column(db.String(100), nullable=False)
    position = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100))
    status = db.Column(db.String(50), default='Applied')
    applied_date = db.Column(db.DateTime, default=datetime.utcnow)
    job_url = db.Column(db.String(500))
    salary_range = db.Column(db.String(50))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'company': self.company,
            'position': self.position,
            'location': self.location,
            'status': self.status,
            'applied_date': self.applied_date.strftime('%Y-%m-%d') if self.applied_date else None,
            'job_url': self.job_url,
            'salary_range': self.salary_range,
            'notes': self.notes,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }