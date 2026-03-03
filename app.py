from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, JobApplication
from datetime import datetime
import random
import google.generativeai as genai
import os
import requests
from bs4 import BeautifulSoup
import json
# Import the function from our new file
from backend.parsing_utils import parse_job_url

# Configure Gemini
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

app = Flask(__name__)
# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

CORS(app)

# Register the new route manually
app.add_url_rule('/api/jobs/parse', view_func=parse_job_url, methods=['POST'])

# Configure database
database_url = os.environ.get("DATABASE_URL", "sqlite:///jobs.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def get_user_id():
    # Keep it simple: use the email from headers
    return request.headers.get('X-User-Email', '')

with app.app_context():
    db.create_all()

# ==================== BASIC ROUTES ====================

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'JobPilot API',
        'version': '2.0',
        'status': 'running'
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Job Tracker API is running'})

@app.route('/api/jobs', methods=['GET'])
def get_all_jobs():
    user_id = get_user_id()
    status_filter = request.args.get('status')
    query = JobApplication.query.filter_by(user_id=user_id)
    if status_filter:
        query = query.filter_by(status=status_filter)
    jobs = query.all()
    return jsonify([job.to_dict() for job in jobs])

@app.route('/api/jobs/<int:job_id>', methods=['GET'])
def get_job(job_id):
    user_id = get_user_id()
    job = JobApplication.query.filter_by(id=job_id, user_id=user_id).first_or_404()
    return jsonify(job.to_dict())

@app.route('/api/jobs', methods=['POST'])
def create_job():
    data = request.get_json()
    if not data.get('company') or not data.get('position'):
        return jsonify({'error': 'Company and position are required'}), 400
    
    new_job = JobApplication(
        user_id=get_user_id(),
        company=data['company'],
        position=data['position'],
        location=data.get('location', ''),
        status=data.get('status', 'Applied'),
        job_url=data.get('job_url', ''),
        salary_range=data.get('salary_range', ''),
        notes=data.get('notes', ''),
        platform=data.get('platform', 'LinkedIn')
    )
    
    if data.get('applied_date'):
        try:
            new_job.applied_date = datetime.strptime(data['applied_date'], '%Y-%m-%d')
        except ValueError:
            pass
    
    db.session.add(new_job)
    db.session.commit()
    return jsonify(new_job.to_dict()), 201

@app.route('/api/jobs/<int:job_id>', methods=['PUT'])
def update_job(job_id):
    user_id = get_user_id()
    job = JobApplication.query.filter_by(id=job_id, user_id=user_id).first_or_404()
    data = request.get_json()
    
    for field in ['company', 'position', 'location', 'status', 'job_url', 'salary_range', 'notes', 'platform']:
        if field in data:
            setattr(job, field, data[field])
    
    job.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(job.to_dict())

@app.route('/api/jobs/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    user_id = get_user_id()
    job = JobApplication.query.filter_by(id=job_id, user_id=user_id).first_or_404()
    db.session.delete(job)
    db.session.commit()
    return jsonify({'message': 'Job application deleted successfully'}), 200

@app.route('/api/stats', methods=['GET'])
def get_stats():
    user_id = get_user_id()
    total = JobApplication.query.filter_by(user_id=user_id).count()
    statuses = ["Applied", "Screening", "Interview", "Offer", "Rejected"]
    
    # Use Title Case for matching and pre-populate all keys
    by_status = {s: JobApplication.query.filter_by(user_id=user_id, status=s).count() for s in statuses}
    
    responses = sum(by_status[s] for s in ["Screening", "Interview", "Offer", "Rejected"])
    response_rate = round((responses / total * 100), 1) if total > 0 else 0
    
    return jsonify({
        'total': total,
        'by_status': by_status,
        'response_rate': response_rate
    })

# ==================== AI FEATURES ====================

@app.route('/api/ai/cover-letter', methods=['POST'])
def generate_cover_letter():
    data = request.get_json()
    company = data.get('company', 'the company')
    position = data.get('position', 'this position')
    job_description = data.get('job_description', 'Standard software engineering role')
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""
        Write a professional cover letter for a {position} role at {company}.
        My skills: Python, React, JavaScript, Full Stack Development.
        Job Description Summary: {job_description}
        Make it enthusiastic but professional. Limit to 300 words.
        """
        
        response = model.generate_content(prompt)
        cover_letter = response.text
    except Exception as e:
        # Fallback if API fails or key is missing
        print(f"Gemini API Error: {e}")
        cover_letter = f"Dear Hiring Manager,\n\nI am writing to express my strong interest in the {position} position at {company}..."

    return jsonify({
        'cover_letter': cover_letter,
        'generated_at': datetime.utcnow().isoformat()
    })

@app.route('/api/ai/interview-questions', methods=['POST'])
def generate_interview_questions():
    data = request.get_json()
    position = data.get('position', 'Software Engineer')
    
    try:
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""
        Generate 3 technical and 2 behavioral interview questions for a {position} role.
        Return the result as a JSON object with keys: 'technical' (list of strings) and 'behavioral' (list of strings).
        Do not include markdown formatting like ```json.
        """
        
        response = model.generate_content(prompt)
        # basic cleanup if the model adds markdown
        text = response.text.replace('```json', '').replace('```', '').strip()
        import json
        questions = json.loads(text)
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        # Fallback
        questions = {
            'technical': ["Tell me about your experience.", "What are your strengths?"],
            'behavioral': ["Describe a challenge you faced."]
        }
    
    return jsonify({
        'questions': questions,
        'position': position,
        'generated_at': datetime.utcnow().isoformat()
    })

@app.route('/api/ai/suggestions', methods=['GET'])
def get_ai_suggestions():
    jobs = JobApplication.query.all()
    suggestions = []
    
    for job in jobs:
        days_since_applied = (datetime.utcnow() - job.applied_date).days
        
        if job.status == 'Applied' and days_since_applied >= 7:
            suggestions.append({
                'type': 'follow_up',
                'priority': 'high',
                'message': f"Follow up on your {job.position} application at {job.company} - {days_since_applied} days since applied",
                'job_id': job.id
            })
        
        if job.status == 'Interview':
            suggestions.append({
                'type': 'interview_prep',
                'priority': 'high',
                'message': f"Prepare for your {job.position} interview at {job.company}",
                'job_id': job.id
            })
    
    if len(jobs) > 0:
        suggestions.append({
            'type': 'motivation',
            'priority': 'medium',
            'message': f"Great progress! You've applied to {len(jobs)} positions. Keep going!",
            'job_id': None
        })
    
    return jsonify({
        'suggestions': suggestions,
        'generated_at': datetime.utcnow().isoformat()
    })

@app.route('/api/company/logo', methods=['GET'])
def get_company_logo():
    company = request.args.get('company', '')
    domain = company.lower().replace(' ', '') + '.com'
    logo_url = f"https://logo.clearbit.com/{domain}"
    
    return jsonify({
        'logo_url': logo_url,
        'company': company
    })

@app.route('/api/salary/estimate', methods=['GET'])
def get_salary_estimate():
    position = request.args.get('position', '').lower()
    
    salary_data = {
        'software engineer': {'min': 80000, 'max': 150000, 'median': 110000},
        'senior software engineer': {'min': 120000, 'max': 200000, 'median': 160000},
        'data scientist': {'min': 90000, 'max': 160000, 'median': 120000},
        'product manager': {'min': 100000, 'max': 180000, 'median': 135000}
    }
    
    estimate = None
    for key in salary_data:
        if key in position:
            estimate = salary_data[key]
            break
    
    if not estimate:
        estimate = {'min': 60000, 'max': 120000, 'median': 85000}
    
    return jsonify({
        'position': position,
        'salary_range': f"${estimate['min']:,} - ${estimate['max']:,}",
        'median': f"${estimate['median']:,}",
        'currency': 'USD'
    })

@app.route('/api/analytics/trends', methods=['GET'])
def get_application_trends():
    user_id = get_user_id()
    jobs = JobApplication.query.filter_by(user_id=user_id).order_by(JobApplication.applied_date).all()
    
    monthly_data = {}
    statuses = ["Applied", "Screening", "Interview", "Offer", "Rejected"]
    status_trends = {s: 0 for s in statuses}
    platform_data = {}
    
    for job in jobs:
        # 1. Monthly Trends
        if job.applied_date:
            month_key = job.applied_date.strftime('%Y-%m')
            monthly_data[month_key] = monthly_data.get(month_key, 0) + 1
        
        # 2. Status Distribution (Normalize to Title Case to match frontend)
        status = (job.status or "Applied").strip().capitalize()
        if status in status_trends:
            status_trends[status] += 1
        else:
            # Fallback for unexpected statuses
            status_trends[status] = status_trends.get(status, 0) + 1

        # 3. Platform Distribution
        platform = job.platform or "Other"
        platform_data[platform] = platform_data.get(platform, 0) + 1
    
    total = len(jobs)
    interviews = status_trends.get('Interview', 0)
    offers = status_trends.get('Offer', 0)
    
    interview_rate = round((interviews / total * 100), 1) if total > 0 else 0
    offer_rate = round((offers / total * 100), 1) if total > 0 else 0
    
    return jsonify({
        'monthly_applications': monthly_data,
        'status_distribution': status_trends,
        'platform_distribution': platform_data,
        'metrics': {
            'total_applications': total,
            'interview_rate': interview_rate,
            'offer_rate': offer_rate
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)