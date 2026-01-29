from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, JobApplication
from datetime import datetime
import random

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///jobs.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

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
    status_filter = request.args.get('status')
    if status_filter:
        jobs = JobApplication.query.filter_by(status=status_filter).all()
    else:
        jobs = JobApplication.query.all()
    return jsonify([job.to_dict() for job in jobs])

@app.route('/api/jobs/<int:job_id>', methods=['GET'])
def get_job(job_id):
    job = JobApplication.query.get_or_404(job_id)
    return jsonify(job.to_dict())

@app.route('/api/jobs', methods=['POST'])
def create_job():
    data = request.get_json()
    if not data.get('company') or not data.get('position'):
        return jsonify({'error': 'Company and position are required'}), 400
    
    new_job = JobApplication(
        company=data['company'],
        position=data['position'],
        location=data.get('location', ''),
        status=data.get('status', 'Applied'),
        job_url=data.get('job_url', ''),
        salary_range=data.get('salary_range', ''),
        notes=data.get('notes', '')
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
    job = JobApplication.query.get_or_404(job_id)
    data = request.get_json()
    
    if 'company' in data:
        job.company = data['company']
    if 'position' in data:
        job.position = data['position']
    if 'location' in data:
        job.location = data['location']
    if 'status' in data:
        job.status = data['status']
    if 'job_url' in data:
        job.job_url = data['job_url']
    if 'salary_range' in data:
        job.salary_range = data['salary_range']
    if 'notes' in data:
        job.notes = data['notes']
    
    job.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(job.to_dict())

@app.route('/api/jobs/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    job = JobApplication.query.get_or_404(job_id)
    db.session.delete(job)
    db.session.commit()
    return jsonify({'message': 'Job application deleted successfully'}), 200

@app.route('/api/stats', methods=['GET'])
def get_stats():
    total = JobApplication.query.count()
    applied = JobApplication.query.filter_by(status='Applied').count()
    screening = JobApplication.query.filter_by(status='Screening').count()
    interview = JobApplication.query.filter_by(status='Interview').count()
    offer = JobApplication.query.filter_by(status='Offer').count()
    rejected = JobApplication.query.filter_by(status='Rejected').count()
    
    responses = screening + interview + offer + rejected
    response_rate = round((responses / total * 100), 1) if total > 0 else 0
    
    return jsonify({
        'total': total,
        'by_status': {
            'Applied': applied,
            'Screening': screening,
            'Interview': interview,
            'Offer': offer,
            'Rejected': rejected
        },
        'response_rate': response_rate
    })

# ==================== AI FEATURES ====================

@app.route('/api/ai/cover-letter', methods=['POST'])
def generate_cover_letter():
    data = request.get_json()
    company = data.get('company', 'the company')
    position = data.get('position', 'this position')
    
    cover_letter = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {position} position at {company}. With my background in software development and proven track record of delivering high-quality solutions, I am confident I would be a valuable addition to your team.

Throughout my career, I have developed expertise in full-stack development, working with modern technologies including Python, JavaScript, React, and various databases. I am particularly drawn to {company}'s innovative approach and commitment to excellence.

Key highlights of my qualifications:
- Strong foundation in software engineering principles and best practices
- Experience with agile methodologies and collaborative development
- Proven ability to learn new technologies quickly and adapt to changing requirements
- Excellent problem-solving skills and attention to detail

I am excited about the opportunity to contribute to {company}'s continued success and would welcome the chance to discuss how my skills align with your needs.

Thank you for considering my application. I look forward to speaking with you soon.

Best regards,
[Your Name]"""
    
    return jsonify({
        'cover_letter': cover_letter,
        'generated_at': datetime.utcnow().isoformat()
    })

@app.route('/api/ai/interview-questions', methods=['POST'])
def generate_interview_questions():
    data = request.get_json()
    position = data.get('position', 'Software Engineer')
    
    general_questions = [
        "Tell me about yourself and your background.",
        "Why are you interested in this position?",
        "What are your greatest strengths?",
        "Where do you see yourself in 5 years?",
        "Why should we hire you?"
    ]
    
    technical_questions = {
        'software engineer': [
            "Explain the difference between SQL and NoSQL databases.",
            "What is RESTful API design?",
            "How do you handle errors in your code?",
            "Describe your experience with version control (Git).",
            "What's your approach to writing clean, maintainable code?"
        ],
        'data scientist': [
            "Explain the bias-variance tradeoff.",
            "How do you handle missing data?",
            "What's your experience with machine learning algorithms?",
            "Describe a data analysis project you've worked on.",
            "How do you validate model performance?"
        ]
    }
    
    position_lower = position.lower()
    role_type = 'software engineer'
    
    for key in technical_questions.keys():
        if key in position_lower:
            role_type = key
            break
    
    questions = {
        'general': general_questions,
        'technical': technical_questions.get(role_type, technical_questions['software engineer']),
        'behavioral': [
            "Tell me about a time you faced a challenge at work.",
            "Describe a situation where you had to work with a difficult team member.",
            "Give an example of when you showed leadership.",
            "Tell me about a project you're most proud of.",
            "How do you handle tight deadlines?"
        ]
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
    jobs = JobApplication.query.order_by(JobApplication.applied_date).all()
    
    monthly_data = {}
    status_trends = {}
    
    for job in jobs:
        month_key = job.applied_date.strftime('%Y-%m')
        
        if month_key not in monthly_data:
            monthly_data[month_key] = 0
        monthly_data[month_key] += 1
        
        if job.status not in status_trends:
            status_trends[job.status] = 0
        status_trends[job.status] += 1
    
    total = len(jobs)
    interviews = sum(1 for job in jobs if job.status == 'Interview')
    offers = sum(1 for job in jobs if job.status == 'Offer')
    
    interview_rate = round((interviews / total * 100), 1) if total > 0 else 0
    offer_rate = round((offers / total * 100), 1) if total > 0 else 0
    
    return jsonify({
        'monthly_applications': monthly_data,
        'status_distribution': status_trends,
        'metrics': {
            'total_applications': total,
            'interview_rate': interview_rate,
            'offer_rate': offer_rate
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)