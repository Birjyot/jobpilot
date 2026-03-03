from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, JobApplication
from datetime import datetime
import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

app = Flask(__name__)
CORS(app)

database_url = os.environ.get("DATABASE_URL", "sqlite:///jobs.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

api_key = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=api_key)

def get_user_id():
    return request.headers.get('X-User-Email', '')

def get_real_model():
    try:
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        for preferred in ['models/gemini-1.5-flash', 'models/gemini-1.5-pro', 'models/gemini-pro']:
            if preferred in available_models:
                return genai.GenerativeModel(preferred)
        if available_models:
            return genai.GenerativeModel(available_models[0])
    except Exception as e:
        print(f"DEBUG: Error listing models: {e}")
    return genai.GenerativeModel('gemini-pro')

with app.app_context():
    db.create_all()

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "JobPilot API", "version": "2.0", "status": "running"})

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Job Tracker API is running"})

@app.route("/api/jobs", methods=["GET"])
def get_all_jobs():
    user_id = get_user_id()
    status_filter = request.args.get("status")
    query = JobApplication.query.filter_by(user_id=user_id)
    if status_filter:
        query = query.filter_by(status=status_filter)
    return jsonify([job.to_dict() for job in query.all()])

@app.route("/api/jobs/<int:job_id>", methods=["GET"])
def get_job(job_id):
    user_id = get_user_id()
    job = JobApplication.query.filter_by(id=job_id, user_id=user_id).first_or_404()
    return jsonify(job.to_dict())

@app.route("/api/jobs", methods=["POST"])
def create_job():
    data = request.get_json()
    if not data.get("company") or not data.get("position"):
        return jsonify({"error": "Company and position are required"}), 400
    new_job = JobApplication(
        user_id=get_user_id(),
        company=data["company"],
        position=data["position"],
        location=data.get("location", ""),
        status=data.get("status", "Applied"),
        job_url=data.get("job_url", ""),
        salary_range=data.get("salary_range", ""),
        notes=data.get("notes", ""),
        platform=data.get("platform", "")
    )
    if data.get("applied_date"):
        try:
            new_job.applied_date = datetime.strptime(data["applied_date"], "%Y-%m-%d")
        except ValueError:
            pass
    db.session.add(new_job)
    db.session.commit()
    return jsonify(new_job.to_dict()), 201

@app.route("/api/jobs/<int:job_id>", methods=["PUT"])
def update_job(job_id):
    user_id = get_user_id()
    job = JobApplication.query.filter_by(id=job_id, user_id=user_id).first_or_404()
    data = request.get_json()
    for field in ["company", "position", "location", "status", "job_url", "salary_range", "notes", "platform"]:
        if field in data:
            setattr(job, field, data[field])
    job.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(job.to_dict())

@app.route("/api/jobs/<int:job_id>", methods=["DELETE"])
def delete_job(job_id):
    user_id = get_user_id()
    job = JobApplication.query.filter_by(id=job_id, user_id=user_id).first_or_404()
    db.session.delete(job)
    db.session.commit()
    return jsonify({"message": "Job application deleted successfully"}), 200

@app.route("/api/stats", methods=["GET"])
def get_stats():
    user_id = get_user_id()
    total = JobApplication.query.filter_by(user_id=user_id).count()
    statuses = ["Applied", "Screening", "Interview", "Offer", "Rejected"]
    by_status = {s: JobApplication.query.filter_by(user_id=user_id, status=s).count() for s in statuses}
    responses = sum(by_status[s] for s in ["Screening", "Interview", "Offer", "Rejected"])
    response_rate = round((responses / total * 100), 1) if total > 0 else 0
    return jsonify({"total": total, "by_status": by_status, "response_rate": response_rate})

@app.route("/api/analytics/trends", methods=["GET"])
def get_application_trends():
    user_id = get_user_id()
    jobs = JobApplication.query.filter_by(user_id=user_id).all()
    total = len(jobs)
    monthly = {}
    for job in jobs:
        if job.applied_date:
            key = job.applied_date.strftime("%b %Y")
            monthly[key] = monthly.get(key, 0) + 1
    status_dist = {}
    for job in jobs:
        status_dist[job.status] = status_dist.get(job.status, 0) + 1
    platform_dist = {}
    for job in jobs:
        p = job.platform or "Other"
        platform_dist[p] = platform_dist.get(p, 0) + 1
    interviews = status_dist.get("Interview", 0)
    offers = status_dist.get("Offer", 0)
    return jsonify({
        "monthly_applications": monthly,
        "status_distribution": status_dist,
        "platform_distribution": platform_dist,
        "metrics": {
            "total_applications": total,
            "interview_rate": round((interviews / total * 100), 1) if total > 0 else 0,
            "offer_rate": round((offers / total * 100), 1) if total > 0 else 0
        }
    })

@app.route("/api/ai/cover-letter", methods=["POST"])
def generate_cover_letter():
    data = request.get_json()
    company = data.get("company", "the company")
    position = data.get("position", "this position")
    notes = data.get("notes", "")
    try:
        model = get_real_model()
        prompt = f"Write a professional cover letter for a {position} position at {company}."
        if notes:
            prompt += f" Context: {notes}."
        prompt += " Use [Your Name] as placeholder."
        response = model.generate_content(prompt)
        return jsonify({"cover_letter": response.text, "generated_at": datetime.utcnow().isoformat()})
    except Exception as e:
        return jsonify({"cover_letter": f"Dear Hiring Manager,\n\nI am writing to express my interest in the {position} position at {company}.\n\nBest regards,\n[Your Name]", "error": str(e)})

@app.route("/api/ai/interview-questions", methods=["POST"])
def generate_interview_questions():
    data = request.get_json()
    position = data.get("position", "Software Engineer")
    company = data.get("company", "")
    try:
        model = get_real_model()
        prompt = f"Generate interview questions for a {position} position"
        if company:
            prompt += f" at {company}"
        prompt += ". Categorize into general, technical, and behavioral."
        response = model.generate_content(prompt)
        return jsonify({"questions_text": response.text, "position": position, "generated_at": datetime.utcnow().isoformat()})
    except Exception as e:
        return jsonify({"questions_text": "Could not generate questions.", "error": str(e)})

@app.route("/api/ai/suggestions", methods=["GET"])
def get_ai_suggestions():
    user_id = get_user_id()
    jobs = JobApplication.query.filter_by(user_id=user_id).all()
    if not jobs:
        return jsonify({"suggestions": [{"type": "motivation", "priority": "medium", "message": "Start adding your job applications to get personalized AI career insights!"}], "generated_at": datetime.utcnow().isoformat()})
    try:
        model = get_real_model()
        job_list_str = "\n".join([f"- {j.position} at {j.company} (Status: {j.status})" for j in jobs])
        prompt = f"I am a job seeker with these applications:\n{job_list_str}\n\nGive me 3 concise career coaching suggestions for this week. One sentence each."
        response = model.generate_content(prompt)
        advice_lines = [line.strip("- 0123456789.").strip() for line in response.text.strip().split("\n") if line.strip()]
        suggestions = [{"type": "ai_insight", "priority": "high" if "interview" in line.lower() else "medium", "message": line} for line in advice_lines[:3]]
        return jsonify({"suggestions": suggestions, "generated_at": datetime.utcnow().isoformat()})
    except Exception as e:
        return jsonify({"suggestions": [{"type": "error", "priority": "medium", "message": "Failed to fetch AI insights."}], "error": str(e)})

@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    if not os.environ.get("GEMINI_API_KEY"):
        return jsonify({"error": "Gemini API key not configured"}), 500
    user_id = get_user_id()
    data = request.get_json()
    user_message = data.get("message", "")
    history = data.get("history", [])
    if not user_message:
        return jsonify({"error": "Message is required"}), 400
    valid_history = [t for t in history if t.get("role") in ["user", "model"] and t.get("parts")]
    try:
        model = get_real_model()
        chat = model.start_chat(history=valid_history)
        jobs = JobApplication.query.filter_by(user_id=user_id).all()
        context = "You are a career coach. User's tracked jobs: "
        context += ", ".join([f"{j.position} at {j.company}" for j in jobs]) if jobs else "None yet."
        response = chat.send_message(f"{context}\n\nUser: {user_message}")
        return jsonify({"response": response.text, "generated_at": datetime.utcnow().isoformat()})
    except Exception as e:
        try:
            response = model.generate_content(f"{context}\n\nUser: {user_message}")
            return jsonify({"response": response.text})
        except Exception as e2:
            return jsonify({"error": str(e2)}), 500

@app.route("/api/ai/match-resume", methods=["POST"])
def match_resume():
    data = request.get_json()
    resume_text = data.get("resume_text", "")
    job_description = data.get("job_description", "")
    if not resume_text or not job_description:
        return jsonify({"error": "Both resume and job description are required"}), 400
    try:
        model = get_real_model()
        prompt = f"""You are an ATS expert. Analyze this resume against the job description.
Return ONLY a valid JSON object, no extra text.

Resume:
{resume_text}

Job Description:
{job_description}

Return exactly this JSON:
{{
  "match_score": <integer 0-100>,
  "matched_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword1", "keyword2"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "summary": "<2 sentence assessment>"
}}"""
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return jsonify(json.loads(text.strip()))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/company/logo", methods=["GET"])
def get_company_logo():
    company = request.args.get("company", "")
    domain = company.lower().replace(" ", "") + ".com"
    return jsonify({"logo_url": f"https://logo.clearbit.com/{domain}", "company": company})

@app.route("/api/ai/diagnostics", methods=["GET"])
def ai_diagnostics():
    if not os.environ.get("GEMINI_API_KEY"):
        return jsonify({"error": "No API Key found"}), 500
    try:
        models = [{"name": m.name, "methods": m.supported_generation_methods} for m in genai.list_models()]
        return jsonify({"available_models": models})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)