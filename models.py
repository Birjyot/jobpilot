from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

# ──────────────────────────────────────────
# Existing models (unchanged)
# ──────────────────────────────────────────

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100))
    last_ai_suggestions = db.Column(db.Text)
    suggestions_updated_at = db.Column(db.DateTime)
    gmail_credentials = db.Column(db.Text) # Stores JSON string of credentials


class JobApplication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=True)  # Store user email
    company = db.Column(db.String(100), nullable=False)
    position = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100))
    status = db.Column(db.String(50), default='Applied')
    applied_date = db.Column(db.DateTime, default=datetime.utcnow)
    job_url = db.Column(db.String(500))
    salary_range = db.Column(db.String(50))
    notes = db.Column(db.Text)
    platform = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'company': self.company,
            'position': self.position,
            'location': self.location,
            'status': self.status,
            'applied_date': self.applied_date.strftime('%Y-%m-%d') if self.applied_date else None,
            'job_url': self.job_url,
            'salary_range': self.salary_range,
            'notes': self.notes,
            'platform': self.platform,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }


# ──────────────────────────────────────────
# NEW: AI response cache table
# Stores hashed-keyed AI results to avoid repeat API calls.
# ──────────────────────────────────────────

class AICache(db.Model):
    __tablename__ = 'ai_cache'

    id = db.Column(db.Integer, primary_key=True)
    # SHA-256 hash of (task_type + normalized_input) — cache lookup key
    cache_key = db.Column(db.String(64), unique=True, nullable=False, index=True)
    task_type = db.Column(db.String(50), nullable=False)
    # Stored result as JSON string
    result_json = db.Column(db.Text, nullable=False)
    # Which provider produced this result (gemini / groq / openrouter)
    provider_used = db.Column(db.String(50))
    # Estimated tokens that subsequent cache hits save
    tokens_saved = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Row is considered stale after this timestamp
    expires_at = db.Column(db.DateTime, nullable=False)

    def is_expired(self):
        return datetime.utcnow() > self.expires_at

    def to_dict(self):
        return {
            'task_type': self.task_type,
            'provider_used': self.provider_used,
            'tokens_saved': self.tokens_saved,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
        }


# ──────────────────────────────────────────
# NEW: Short link table for sharing ATS results
# ──────────────────────────────────────────

class ShortLink(db.Model):
    __tablename__ = 'short_links'

    id = db.Column(db.Integer, primary_key=True)
    # 8-character random alphanumeric code
    short_code = db.Column(db.String(8), unique=True, nullable=False, index=True)
    # JSON payload to return when the link is resolved
    target_data = db.Column(db.Text, nullable=False)
    # Optional: which user created this link
    user_id = db.Column(db.String(100))
    # Human-readable label (e.g., "ATS result for Google SWE")
    label = db.Column(db.String(200))
    click_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)

    def is_expired(self):
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at

    def to_dict(self):
        return {
            'short_code': self.short_code,
            'label': self.label,
            'click_count': self.click_count,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }