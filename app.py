from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from models import db, JobApplication, User, AICache, ShortLink
from datetime import datetime
import json
import os
import random
import string
from dotenv import load_dotenv

load_dotenv()

# ── Backend modules ─────────────────────────────────────────────────────────
from backend.parsing_utils import parse_job_url
from backend.ai_router import ai_router, TaskType
from backend.gmail_utils import sync_job_emails, get_gmail_service
import threading
from backend.cache_utils import make_cache_key, get_cached, set_cache, cache_stats
from backend.text_utils import (
    build_ats_prompt, build_cover_letter_prompt,
    build_interview_prompt, build_suggestions_prompt,
    summarize_jobs_for_prompt, clean_text
)
from backend.file_parser import parse_uploaded_file

# ── App setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
# Explicitly allow all origins and the custom X-User-Email header
CORS(app, resources={r"/api/*": {"origins": "*"}}, allow_headers=["Content-Type", "X-User-Email"])

app.add_url_rule('/api/jobs/parse', view_func=parse_job_url, methods=['POST'])

database_url = os.environ.get("DATABASE_URL", "sqlite:///jobs.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()


# ── Auth helpers ─────────────────────────────────────────────────────────────
def get_user_id():
    return request.headers.get('X-User-Email', '')

def get_or_create_user(email):
    if not email:
        return None
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email)
        db.session.add(user)
        db.session.commit()
    return user


# ══════════════════════════════════════════════════════════════════════════════
# BASIC ROUTES (unchanged)
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'JobPilot API', 'version': '3.0', 'status': 'running'})

@app.errorhandler(Exception)
def handle_exception(e):
    # Pass through HTTP errors
    if hasattr(e, 'code'):
        return jsonify({"error": str(e)}), e.code
    # Handle non-HTTP exceptions only
    import traceback
    print("--- BACKEND CRASH ---")
    traceback.print_exc()
    print("---------------------")
    return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

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
    return jsonify([job.to_dict() for job in query.all()])

@app.route('/api/jobs/<int:job_id>', methods=['GET'])
def get_job(job_id):
    job = JobApplication.query.filter_by(id=job_id, user_id=get_user_id()).first_or_404()
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
    job = JobApplication.query.filter_by(id=job_id, user_id=get_user_id()).first_or_404()
    data = request.get_json()
    for field in ['company', 'position', 'location', 'status', 'job_url',
                  'salary_range', 'notes', 'platform']:
        if field in data:
            setattr(job, field, data[field])
    job.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(job.to_dict())

@app.route('/api/jobs/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    job = JobApplication.query.filter_by(id=job_id, user_id=get_user_id()).first_or_404()
    db.session.delete(job)
    db.session.commit()
    return jsonify({'message': 'Job application deleted successfully'}), 200

@app.route('/api/stats', methods=['GET'])
def get_stats():
    user_id = get_user_id()
    total = JobApplication.query.filter_by(user_id=user_id).count()
    statuses = ["Applied", "Screening", "Interview", "Offer", "Rejected"]
    by_status = {s: JobApplication.query.filter_by(user_id=user_id, status=s).count() for s in statuses}
    responses = sum(by_status[s] for s in ["Screening", "Interview", "Offer", "Rejected"])
    response_rate = round((responses / total * 100), 1) if total > 0 else 0
    return jsonify({'total': total, 'by_status': by_status, 'response_rate': response_rate})

@app.route('/api/company/logo', methods=['GET'])
def get_company_logo():
    company = request.args.get('company', '')
    domain = company.lower().replace(' ', '') + '.com'
    return jsonify({'logo_url': f"https://logo.clearbit.com/{domain}", 'company': company})

@app.route('/api/salary/estimate', methods=['GET'])
def get_salary_estimate():
    position = request.args.get('position', '').lower()
    salary_data = {
        'software engineer':        {'min': 80000, 'max': 150000, 'median': 110000},
        'senior software engineer': {'min': 120000,'max': 200000, 'median': 160000},
        'data scientist':           {'min': 90000, 'max': 160000, 'median': 120000},
        'product manager':          {'min': 100000,'max': 180000, 'median': 135000},
    }
    estimate = next((v for k, v in salary_data.items() if k in position),
                    {'min': 60000, 'max': 120000, 'median': 85000})
    return jsonify({
        'position':     position,
        'salary_range': f"${estimate['min']:,} - ${estimate['max']:,}",
        'median':       f"${estimate['median']:,}",
        'currency':     'USD'
    })

@app.route('/api/analytics/trends', methods=['GET'])
def get_application_trends():
    user_id = get_user_id()
    jobs = JobApplication.query.filter_by(user_id=user_id).order_by(JobApplication.applied_date).all()
    statuses = ["Applied", "Screening", "Interview", "Offer", "Rejected"]
    monthly_data, status_trends, platform_data = {}, {s: 0 for s in statuses}, {}
    for job in jobs:
        if job.applied_date:
            mk = job.applied_date.strftime('%Y-%m')
            monthly_data[mk] = monthly_data.get(mk, 0) + 1
        status = (job.status or "Applied").strip()
        # Normalize capitalization to match our canonical statuses
        matched = next((s for s in statuses if s.lower() == status.lower()), status)
        status_trends[matched] = status_trends.get(matched, 0) + 1
        platform = job.platform or "Other"
        platform_data[platform] = platform_data.get(platform, 0) + 1
    total = len(jobs)
    interviews = status_trends.get('Interview', 0)
    offers = status_trends.get('Offer', 0)
    return jsonify({
        'monthly_applications': monthly_data,
        'status_distribution':  status_trends,
        'platform_distribution': platform_data,
        'metrics': {
            'total_applications': total,
            'interview_rate': round((interviews / total * 100), 1) if total > 0 else 0,
            'offer_rate':     round((offers / total * 100), 1) if total > 0 else 0,
        }
    })


# ══════════════════════════════════════════════════════════════════════════════
# AI FEATURES — now using multi-provider router + caching
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/ai/cover-letter', methods=['POST'])
def generate_cover_letter():
    data = request.get_json()
    company         = data.get('company', 'the company')
    position        = data.get('position', 'this position')
    job_description = data.get('job_description', '')

    # Cache check
    cache_key = make_cache_key("cover_letter", position, company, job_description)
    cached    = get_cached("cover_letter", cache_key)
    if cached:
        return jsonify({**cached, 'cached': True})

    prompt = build_cover_letter_prompt(position, company, job_description)
    result = ai_router.generate(prompt, task_type=TaskType.COVER_LETTER)

    if not result["success"]:
        # Graceful fallback letter
        fallback = (
            f"Dear Hiring Manager,\n\nI am writing to express my strong interest in "
            f"the {position} position at {company}. With my background in full-stack "
            f"development and passion for building impactful products, I believe I would "
            f"be a great fit.\n\nThank you for your consideration.\n\nSincerely,\n[Your Name]"
        )
        return jsonify({'cover_letter': fallback, 'cached': False,
                        'error': result["error"], 'generated_at': datetime.utcnow().isoformat()})

    payload = {
        'cover_letter':   result["text"],
        'provider':       result["provider"],
        'generated_at':   datetime.utcnow().isoformat(),
    }
    set_cache("cover_letter", cache_key, payload,
              provider_used=result["provider"], estimated_input_tokens=len(prompt) // 4)
    return jsonify({**payload, 'cached': False})


@app.route('/api/ai/interview-questions', methods=['POST'])
def generate_interview_questions():
    data     = request.get_json()
    position = data.get('position', 'Software Engineer')

    cache_key = make_cache_key("interview_prep", position)
    cached    = get_cached("interview_prep", cache_key)
    if cached:
        return jsonify({**cached, 'cached': True})

    prompt = build_interview_prompt(position)
    # Groq is primary for this fast task
    result = ai_router.generate_json(prompt, task_type=TaskType.INTERVIEW_PREP)

    if not result["success"] or not result.get("data"):
        questions = {
            'technical':  ["Explain your experience with system design.",
                           "How do you handle performance bottlenecks?",
                           "Walk me through your debugging process."],
            'behavioral': ["Describe a challenge you overcame.", "Tell me about a team conflict."]
        }
    else:
        questions = result["data"]

    payload = {
        'questions':    questions,
        'position':     position,
        'provider':     result.get("provider"),
        'generated_at': datetime.utcnow().isoformat(),
    }
    set_cache("interview_prep", cache_key, payload,
              provider_used=result.get("provider", ""), estimated_input_tokens=len(prompt) // 4)
    return jsonify({**payload, 'cached': False})


@app.route('/api/ai/suggestions', methods=['GET'])
def get_ai_suggestions():
    user_email = get_user_id()
    if not user_email:
        return jsonify({'suggestions': []})

    user = get_or_create_user(user_email)

    # 24-hour user-level cache (stored on User model — unchanged from original)
    if user.last_ai_suggestions and user.suggestions_updated_at:
        diff = datetime.utcnow() - user.suggestions_updated_at
        if diff.total_seconds() < 86400:
            try:
                return jsonify({
                    'suggestions':    json.loads(user.last_ai_suggestions),
                    'generated_at':   user.suggestions_updated_at.isoformat(),
                    'cached':         True
                })
            except Exception:
                pass

    jobs = JobApplication.query.filter_by(user_id=user_email).all()
    suggestions = []

    # Rule-based follow-up suggestions (free, no AI)
    for job in jobs:
        if job.applied_date is None:
            continue
        days = (datetime.utcnow() - job.applied_date).days
        if job.status in ['Applied', 'Screening'] and days >= 7:
            suggestions.append({
                'type':     'follow_up',
                'priority': 'high',
                'message':  f"Follow up on {job.position} at {job.company} — {days}d ago",
                'job_id':   job.id
            })

    # AI suggestions via router
    try:
        jobs_str = summarize_jobs_for_prompt(jobs)
        prompt   = build_suggestions_prompt(jobs_str)
        result   = ai_router.generate(prompt, task_type=TaskType.SUGGESTIONS)

        if result["success"]:
            lines = [l.strip("- 0123456789. ").strip()
                     for l in result["text"].strip().split("\n") if l.strip()]
            for line in lines[:3]:
                suggestions.append({
                    'type':     'ai_insight',
                    'priority': 'medium',
                    'message':  line,
                    'job_id':   None
                })

        # Persist to user cache
        user.last_ai_suggestions  = json.dumps(suggestions)
        user.suggestions_updated_at = datetime.utcnow()
        db.session.commit()

    except Exception as e:
        print(f"[suggestions] AI failed (non-fatal): {e}")
        if not suggestions:
            suggestions.append({
                'type': 'motivation', 'priority': 'medium',
                'message': "Keep applying! Consistency is key.", 'job_id': None
            })

    return jsonify({'suggestions': suggestions, 'generated_at': datetime.utcnow().isoformat(), 'cached': False})


@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    user_id      = get_user_id()
    data         = request.get_json()
    user_message = data.get("message", "")
    history      = data.get("history", [])

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    jobs    = JobApplication.query.filter_by(user_id=user_id).all()
    ctx     = "You are a career coach. User's tracked jobs: "
    ctx    += ", ".join(f"{j.position} at {j.company}" for j in jobs) if jobs else "None yet."

    # Build a prompt that inlines the last 4 history turns to save tokens
    history_text = ""
    for turn in history[-4:]:
        role = "User" if turn.get("role") == "user" else "Assistant"
        parts = turn.get("parts", [])
        text  = parts[0].get("text", "") if parts else ""
        if text:
            history_text += f"{role}: {text}\n"

    prompt = f"{ctx}\n\n{history_text}User: {user_message}\nAssistant:"

    # Chat uses Groq as primary (fast, low-latency)
    result = ai_router.generate(prompt, task_type=TaskType.CHAT)

    if not result["success"]:
        return jsonify({"error": result["error"]}), 500

    return jsonify({
        "response":     result["text"],
        "provider":     result["provider"],
        "generated_at": datetime.utcnow().isoformat()
    })


@app.route("/api/ai/match-resume", methods=["POST"])
def match_resume():
    data            = request.get_json()
    resume_text     = data.get("resume_text", "")
    job_description = data.get("job_description", "")

    if not resume_text or not job_description:
        return jsonify({"error": "Both resume and job description are required"}), 400

    # Cache check — expensive call, cache for 7 days
    cache_key = make_cache_key("ats_scan", resume_text, job_description)
    cached    = get_cached("ats_scan", cache_key)
    if cached:
        return jsonify({**cached, 'cached': True})

    prompt = build_ats_prompt(resume_text, job_description)
    result = ai_router.generate_json(prompt, task_type=TaskType.ATS_SCAN)

    if not result["success"] or not result.get("data"):
        return jsonify({"error": result.get("error", "AI analysis failed")}), 500

    payload = {**result["data"], "provider": result["provider"]}
    set_cache("ats_scan", cache_key, payload,
              provider_used=result["provider"],
              estimated_input_tokens=len(prompt) // 4)
    return jsonify({**payload, 'cached': False})


@app.route("/api/ai/diagnostics", methods=["GET"])
def ai_diagnostics():
    """Returns which providers are configured."""
    providers = {
        "gemini":      bool(os.environ.get("GEMINI_API_KEY")),
        "groq":        bool(os.environ.get("GROQ_API_KEY")),
        "openrouter":  bool(os.environ.get("OPENROUTER_API_KEY")),
    }
    return jsonify({"providers": providers, "cache": cache_stats()})


# ══════════════════════════════════════════════════════════════════════════════
# FILE UPLOAD — drag & drop for resume / JD parsing
# ══════════════════════════════════════════════════════════════════════════════

@app.route('/api/upload/resume', methods=['POST'])
def upload_resume():
    """
    Accept a multipart file upload (PDF, DOCX, TXT).
    Returns extracted plain text for use in the ATS scanner.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file     = request.files['file']
    filename = file.filename or ''
    if not filename:
        return jsonify({'error': 'No filename'}), 400

    try:
        raw_bytes    = file.read()
        # Guard against very large uploads (5 MB limit)
        if len(raw_bytes) > 5 * 1024 * 1024:
            return jsonify({'error': 'File too large. Maximum size is 5 MB.'}), 413

        text, ftype  = parse_uploaded_file(raw_bytes, filename)
        word_count   = len(text.split())

        return jsonify({
            'text':       text,
            'file_type':  ftype,
            'word_count': word_count,
            'char_count': len(text),
            'filename':   filename,
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 415
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 422
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {e}'}), 500


# ══════════════════════════════════════════════════════════════════════════════
# LINK SHORTENER — share ATS results
# ══════════════════════════════════════════════════════════════════════════════

def _generate_code(length: int = 8) -> str:
    """Generate a random alphanumeric short code."""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))


@app.route('/api/links/shorten', methods=['POST'])
def shorten_link():
    """
    Create a short link for an ATS result payload.
    Body: { "data": <ATS result dict>, "label": "optional label", "expires_days": 30 }
    Returns: { "short_code": "abc123", "short_url": "https://..." }
    """
    body  = request.get_json()
    data  = body.get('data')
    label = body.get('label', '')

    if not data:
        return jsonify({'error': 'data payload is required'}), 400

    # Generate a unique code (retry on collision — extremely rare)
    for _ in range(5):
        code = _generate_code()
        if not ShortLink.query.filter_by(short_code=code).first():
            break
    else:
        return jsonify({'error': 'Could not generate unique code, try again'}), 500

    expires_days = min(int(body.get('expires_days', 30)), 90)
    from datetime import timedelta
    expires_at = datetime.utcnow() + timedelta(days=expires_days)

    link = ShortLink(
        short_code  = code,
        target_data = json.dumps(data),
        user_id     = get_user_id(),
        label       = label,
        expires_at  = expires_at,
    )
    db.session.add(link)
    db.session.commit()

    # Point link to the frontend for sharing
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip('/')
    short_url    = f"{frontend_url}/s/{code}"

    return jsonify({
        'short_code': code,
        'short_url':  short_url,
        'label':      label,
        'expires_at': expires_at.isoformat(),
    }), 201


@app.route('/s/<code>', methods=['GET'])
def resolve_short_link(code):
    """
    Resolve a short link. Increments click counter.
    If Accept: application/json → return JSON data.
    Otherwise → redirect to frontend with data as query (or return JSON for SPA).
    """
    link = ShortLink.query.filter_by(short_code=code).first()
    if not link:
        return jsonify({'error': 'Link not found'}), 404
    if link.is_expired():
        return jsonify({'error': 'This link has expired'}), 410

    # # Gmail Auth State
_gmail_auth_state = {}

@app.route("/api/gmail/auth-start", methods=["POST"])
def gmail_auth_start():
    user_email = get_user_id()
    if not user_email:
        return jsonify({"error": "Unauthorized"}), 401

    # In Production, this would be your Render URL
    # In Local, it's localhost:5000
    redirect_uri = "http://localhost:5000/api/gmail/callback"
    if "onrender.com" in request.host_url:
        redirect_uri = "https://jobpilot-30wb.onrender.com/api/gmail/callback"

    from google_auth_oauthlib.flow import Flow
    import json
    
    # Priority 1: Environment Variable (for Render/Production)
    # Priority 2: Local File (for Local Dev)
    creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if creds_json:
        creds_info = json.loads(creds_json)
        flow = Flow.from_client_config(creds_info, scopes=['https://www.googleapis.com/auth/gmail.readonly'], redirect_uri=redirect_uri)
    else:
        flow = Flow.from_client_secrets_file('credentials.json', scopes=['https://www.googleapis.com/auth/gmail.readonly'], redirect_uri=redirect_uri)

    auth_url, state = flow.authorization_url(prompt='consent', access_type='offline')
    
    # Store state to verify callback
    _gmail_auth_state[user_email] = {"state": state, "status": "pending"}
    
    return jsonify({"auth_url": auth_url, "status": "pending"})

@app.route("/api/gmail/callback")
def gmail_callback():
    state = request.args.get('state')
    code = request.args.get('code')
    
    # Find the user by state
    user_email = next((u for u, s in _gmail_auth_state.items() if s["state"] == state), None)
    
    if not user_email:
        return "Error: Invalid state or session expired. Please try again.", 400

    try:
        redirect_uri = "http://localhost:5000/api/gmail/callback"
        if "onrender.com" in request.host_url:
            redirect_uri = "https://jobpilot-30wb.onrender.com/api/gmail/callback"

        from google_auth_oauthlib.flow import Flow
        creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
        if creds_json:
            creds_info = json.loads(creds_json)
            flow = Flow.from_client_config(creds_info, scopes=['https://www.googleapis.com/auth/gmail.readonly'], redirect_uri=redirect_uri)
        else:
            flow = Flow.from_client_secrets_file('credentials.json', scopes=['https://www.googleapis.com/auth/gmail.readonly'], redirect_uri=redirect_uri)
            
        flow.fetch_token(code=code)
        creds = flow.credentials

        user = get_or_create_user(user_email)
        user.gmail_credentials = json.dumps({
            'token': creds.token,
            'refresh_token': creds.refresh_token,
            'token_uri': creds.token_uri,
            'client_id': creds.client_id,
            'client_secret': creds.client_secret,
            'scopes': creds.scopes
        })
        db.session.commit()
        
        _gmail_auth_state[user_email]["status"] = "done"
        return "<h1>Authentication Successful!</h1><p>You can close this window now.</p><script>window.close();</script>"
    except Exception as e:
        _gmail_auth_state[user_email]["status"] = "error"
        return f"Error: {str(e)}", 500

@app.route("/api/gmail/auth-status", methods=["GET"])
def gmail_auth_status():
    user_email = get_user_id()
    state_data = _gmail_auth_state.get(user_email, {"status": "none"})
    return jsonify(state_data)

@app.route('/api/links/<code>/stats', methods=['GET'])
def link_stats(code):
    """Return click analytics for a short link."""
    link = ShortLink.query.filter_by(short_code=code).first()
    if not link:
        return jsonify({'error': 'Link not found'}), 404
    return jsonify(link.to_dict())


@app.route('/api/gmail/sync', methods=['POST'])
def gmail_sync():
    user_email = get_user_id()
    if not user_email:
        return jsonify({'error': 'Authentication required'}), 401
    
    user = User.query.filter_by(email=user_email).first()
    if not user or not user.gmail_credentials:
        return jsonify({'error': 'needs_auth'}), 200
    
    print(f"[GmailSync] Starting extraction for {user_email}...")
    try:
        service = get_gmail_service(user.gmail_credentials)
        new_jobs_data = sync_job_emails(service)
        added_count = 0
        
        print(f"[GmailSync] Extracted {len(new_jobs_data)} candidates. Checking for duplicates...")
        for job_data in new_jobs_data:
            existing = JobApplication.query.filter_by(
                user_id=user_email,
                company=job_data.get('company'),
                position=job_data.get('role')
            ).first()
            
            if not existing:
                new_app = JobApplication(
                    user_id=user_email,
                    company=job_data.get('company'),
                    position=job_data.get('role'),
                    status=job_data.get('status', 'Applied'),
                    platform=job_data.get('source', 'Gmail'),
                    applied_date=datetime.strptime(job_data.get('date'), '%Y-%m-%d') if job_data.get('date') else datetime.utcnow()
                )
                db.session.add(new_app)
                added_count += 1
            else:
                # Update status if it's different (e.g. from Applied -> Interview)
                new_status = job_data.get('status', 'Applied')
                if existing.status != new_status:
                    print(f"[GmailSync] Updating {existing.company} status: {existing.status} -> {new_status}")
                    existing.status = new_status
                    added_count += 1 # Count updates as "synced" items
        
        db.session.commit()
        print(f"[GmailSync] Success! Synced {added_count} items (added or updated).")
        return jsonify({'success': True, 'added': added_count})
        
    except Exception as e:
        if "invalid_grant" in str(e) or "refresh_token" in str(e):
             user.gmail_credentials = None
             db.session.commit()
             return jsonify({'error': 'needs_auth'}), 200
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)