from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, JobApplication
from datetime import datetime
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from the root .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///jobs.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=api_key)

def get_real_model():
    """Helper to find the best available model for the current key."""
    try:
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        # Priority list
        for preferred in ['models/gemini-1.5-flash', 'models/gemini-1.5-pro', 'models/gemini-pro']:
            if preferred in available_models:
                return genai.GenerativeModel(preferred)
        # Fallback to the first available if none of the preferred are found
        if available_models:
            return genai.GenerativeModel(available_models[0])
    except Exception as e:
        print(f"DEBUG: Error listing models: {e}")
    # Final fallback to standard name
    return genai.GenerativeModel('gemini-pro')

with app.app_context():
    db.create_all()
    # Ensure platform column exists (quick fix for SQLite)
    try:
        db.session.execute(db.text('ALTER TABLE job_application ADD COLUMN platform VARCHAR(50)'))
        db.session.commit()
    except Exception:
        pass # Column likely already exists

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "JobPilot API", "version": "2.0", "status": "running"})

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Job Tracker API is running"})

@app.route("/api/jobs", methods=["GET"])
def get_all_jobs():
    status_filter = request.args.get("status")
    if status_filter:
        jobs = JobApplication.query.filter_by(status=status_filter).all()
    else:
        jobs = JobApplication.query.all()
    return jsonify([job.to_dict() for job in jobs])

@app.route("/api/jobs/<int:job_id>", methods=["GET"])
def get_job(job_id):
    job = JobApplication.query.get_or_404(job_id)
    return jsonify(job.to_dict())

@app.route("/api/jobs", methods=["POST"])
def create_job():
    data = request.get_json()
    if not data.get("company") or not data.get("position"):
        return jsonify({"error": "Company and position are required"}), 400
    new_job = JobApplication(
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
    job = JobApplication.query.get_or_404(job_id)
    data = request.get_json()
    if "company" in data:
        job.company = data["company"]
    if "position" in data:
        job.position = data["position"]
    if "location" in data:
        job.location = data["location"]
    if "status" in data:
        job.status = data["status"]
    if "job_url" in data:
        job.job_url = data["job_url"]
    if "salary_range" in data:
        job.salary_range = data["salary_range"]
    if "notes" in data:
        job.notes = data["notes"]
    if "platform" in data:
        job.platform = data["platform"]
    job.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(job.to_dict())

@app.route("/api/jobs/<int:job_id>", methods=["DELETE"])
def delete_job(job_id):
    job = JobApplication.query.get_or_404(job_id)
    db.session.delete(job)
    db.session.commit()
    return jsonify({"message": "Job application deleted successfully"}), 200

@app.route("/api/stats", methods=["GET"])
def get_stats():
    total = JobApplication.query.count()
    applied = JobApplication.query.filter_by(status="Applied").count()
    screening = JobApplication.query.filter_by(status="Screening").count()
    interview = JobApplication.query.filter_by(status="Interview").count()
    offer = JobApplication.query.filter_by(status="Offer").count()
    rejected = JobApplication.query.filter_by(status="Rejected").count()
    responses = screening + interview + offer + rejected
    response_rate = round((responses / total * 100), 1) if total > 0 else 0
    return jsonify({
        "total": total,
        "by_status": {"Applied": applied, "Screening": screening, "Interview": interview, "Offer": offer, "Rejected": rejected},
        "response_rate": response_rate
    })

@app.route("/api/ai/cover-letter", methods=["POST"])
def generate_cover_letter():
    data = request.get_json()
    company = data.get("company", "the company")
    position = data.get("position", "this position")
    notes = data.get("notes", "")
    
    try:
        model = get_real_model()
        prompt = f"Write a professional and compelling cover letter for a {position} position at {company}. "
        if notes:
            prompt += f"Context about the role or my interest: {notes}. "
        prompt += "Keep it concise, professional, and highlight enthusiasm for the company. Use [Your Name] as a placeholder."
        
        response = model.generate_content(prompt)
        return jsonify({"cover_letter": response.text, "generated_at": datetime.utcnow().isoformat()})
    except Exception as e:
        # Fallback to template if API fails
        cover_letter = f"Dear Hiring Manager,\n\nI am writing to express my strong interest in the {position} position at {company}.\n\nBest regards,\n[Your Name]"
        return jsonify({"cover_letter": cover_letter, "error": str(e), "generated_at": datetime.utcnow().isoformat()})

@app.route("/api/ai/interview-questions", methods=["POST"])
def generate_interview_questions():
    data = request.get_json()
    position = data.get("position", "Software Engineer")
    company = data.get("company", "")
    
    try:
        model = get_real_model()
        prompt = f"Generate a list of interview questions for a {position} position"
        if company:
            prompt += f" at {company}"
        prompt += ". Categorize them into 'general', 'technical', and 'behavioral'. Return the response in a structured format."
        
        response = model.generate_content(prompt)
        # For simplicity in this demo, we'll return the text or try to parse it. 
        # A more robust implementation would use response schema.
        return jsonify({"questions_text": response.text, "position": position, "generated_at": datetime.utcnow().isoformat()})
    except Exception as e:
        questions = {
            "general": ["Tell me about yourself", "Why this position?", "Your strengths?"],
            "technical": ["Explain SQL vs NoSQL", "What is REST API?", "How do you handle errors?"],
            "behavioral": ["Tell me about a challenge", "Difficult team member situation", "Leadership example"]
        }
        return jsonify({"questions": questions, "error": str(e), "position": position, "generated_at": datetime.utcnow().isoformat()})

@app.route("/api/ai/suggestions", methods=["GET"])
def get_ai_suggestions():
    jobs = JobApplication.query.all()
    if not jobs:
        return jsonify({
            "suggestions": [{"type": "motivation", "priority": "medium", "message": "Start adding your job applications to get personalized AI career insights!"}],
            "generated_at": datetime.utcnow().isoformat()
        })

    try:
        model = get_real_model()
        
        job_list_str = "\n".join([f"- {j.position} at {j.company} (Status: {j.status}, Applied: {j.applied_date})" for j in jobs])
        
        prompt = f"""
        I am a job seeker with the following application history:
        {job_list_str}
        
        Act as an elite career coach. Give me 3 concise, high-impact suggestions for my focus this week. 
        Format each suggestion as a single sentence. Focus on follow-ups, skill gaps, or interview prep based on the statuses.
        """
        
        response = model.generate_content(prompt)
        advice_lines = [line.strip("- ").strip() for line in response.text.strip().split("\n") if line.strip()]
        
        suggestions = []
        for line in advice_lines[:3]:
            priority = "high" if "Follow up" in line or "Interview" in line else "medium"
            suggestions.append({"type": "ai_insight", "priority": priority, "message": line})
            
        return jsonify({"suggestions": suggestions, "generated_at": datetime.utcnow().isoformat()})
    except Exception as e:
        return jsonify({
            "suggestions": [{"type": "error", "priority": "medium", "message": "Failed to fetch AI insights. Keep grinding!"}],
            "error": str(e),
            "generated_at": datetime.utcnow().isoformat()
        })

@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "Gemini API key is not configured on the server."}), 500

    data = request.get_json()
    user_message = data.get("message", "")
    history = data.get("history", [])
    
    # Filter history to ensure it only contains valid user/model turns
    valid_history = []
    for turn in history:
        if turn.get("role") in ["user", "model"] and turn.get("parts"):
            valid_history.append(turn)

    print(f"DEBUG: Processing Chat. History turns: {len(valid_history)}")
    
    if not user_message:
        return jsonify({"error": "Message is required"}), 400
        
    try:
        model = get_real_model()
        chat = model.start_chat(history=valid_history)
        
        jobs = JobApplication.query.all()
        context = "System Info: You are a career coach. The user is currently tracking these jobs: "
        if jobs:
            context += ", ".join([f"{j.position} at {j.company}" for j in jobs])
        else:
            context += "None yet."
            
        response = chat.send_message(f"{context}\n\nUser: {user_message}")
        
        return jsonify({
            "response": response.text,
            "generated_at": datetime.utcnow().isoformat()
        })
    except Exception as e:
        print(f"CRITICAL ERROR in AI Chat: {str(e)}")
        # If chat session fails (often due to history format), try a one-off completion
        try:
            print("DEBUG: Attempting fallback single-turn completion...")
            response = model.generate_content(f"{context}\n\nUser Question: {user_message}")
            return jsonify({
                "response": response.text,
                "note": "Switched to single-turn due to history error",
                "generated_at": datetime.utcnow().isoformat()
            })
        except Exception as fallback_e:
            return jsonify({"error": f"AI Engine Error: {str(fallback_e)}"}), 500

@app.route("/api/company/logo", methods=["GET"])
def get_company_logo():
    company = request.args.get("company", "")
    domain = company.lower().replace(" ", "") + ".com"
    return jsonify({"logo_url": f"https://logo.clearbit.com/{domain}", "company": company})

@app.route("/api/salary/estimate", methods=["GET"])
def get_salary_estimate():
    position = request.args.get("position", "").lower()
    salary_data = {"software engineer": {"min": 80000, "max": 150000, "median": 110000}}
    estimate = salary_data.get("software engineer", {"min": 60000, "max": 120000, "median": 85000})
    return jsonify({"position": position, "salary_range": f"${estimate['min']:,} - ${estimate['max']:,}", "median": f"${estimate['median']:,}", "currency": "USD"})

@app.route("/api/analytics/trends", methods=["GET"])
def get_application_trends():
    jobs = JobApplication.query.all()
    total = len(jobs)
    return jsonify({"monthly_applications": {}, "status_distribution": {}, "metrics": {"total_applications": total, "interview_rate": 0, "offer_rate": 0}})

@app.route("/api/ai/diagnostics", methods=["GET"])
def ai_diagnostics():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "No API Key found"}), 500
    
    try:
        genai.configure(api_key=api_key)
        models = []
        for m in genai.list_models():
            models.append({"name": m.name, "methods": m.supported_generation_methods})
        return jsonify({"available_models": models})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
