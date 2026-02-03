# JobPilot: Elite Edition - Implementation Guide

This guide details the steps to transform your Job Tracker into a portfolio-ready application with generic modern features.

## 🛠️ Prerequisites

Before starting, obtain the following keys:
1. **Google Cloud Console**: Create a project, enable "Google People API", and create OAuth 2.0 Credentials (Client ID & Secret).
   - Authorized Origins: `http://localhost:3000`
   - Authorized Redirect URIs: `http://localhost:3000/api/auth/callback/google`
2. **Gemini API Key**: Get one from [Google AI Studio](https://aistudio.google.com/).

---

## Phase 1: Authentication (Google Sign-In)

### Backend (Flask)

1.  **Install Dependencies**:
    ```bash
    pip install google-auth google-auth-oauthlib google-auth-httplib2 flask-login requests
    ```

2.  **Update `models.py`**:
    Add a `User` model and link it to `JobApplication`.
    ```python
    # models.py
    from flask_sqlalchemy import SQLAlchemy
    from flask_login import UserMixin

    db = SQLAlchemy()

    class User(UserMixin, db.Model):
        id = db.Column(db.Integer, primary_key=True)
        email = db.Column(db.String(120), unique=True, nullable=False)
        name = db.Column(db.String(100), nullable=True)
        jobs = db.relationship('JobApplication', backref='owner', lazy=True)

    class JobApplication(db.Model):
        # ... existing columns ...
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Make nullable for migration, then enforce
    ```
    *Note: You may need to delete `jobs.db` to reset the database schema if not using Alembic migrations.*

### Frontend (Next.js)

1.  **Install NextAuth**:
    ```bash
    npm install next-auth
    ```

2.  **Environment Variables (`.env.local`)**:
    ```env
    GOOGLE_CLIENT_ID=your_client_id
    GOOGLE_CLIENT_SECRET=your_client_secret
    NEXTAUTH_SECRET=random_string
    NEXTAUTH_URL=http://localhost:3000
    ```

3.  **Create Auth API Route** (`app/api/auth/[...nextauth]/route.ts`):
    ```typescript
    import NextAuth from "next-auth";
    import GoogleProvider from "next-auth/providers/google";

    const handler = NextAuth({
      providers: [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ],
      callbacks: {
        async session({ session, token }) {
          // Pass the user's email or ID to the backend in headers
          return session;
        },
      },
    });

    export { handler as GET, handler as POST };
    ```

---

## Phase 2: Gemini API Integration (Real AI)

### Backend

1.  **Install Gemini SDK**:
    ```bash
    pip install google-generativeai beautifulsoup4
    ```

2.  **Update `app.py` for Real AI**:
    ```python
    import google.generativeai as genai
    import os

    # Configure Gemini
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

    @app.route('/api/ai/cover-letter', methods=['POST'])
    def generate_cover_letter():
        data = request.get_json()
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"""
        Write a professional cover letter for a {data['position']} role at {data['company']}.
        My skills: Python, React, JavaScript.
        Job Description Summary: {data.get('job_description', 'Standard software engineering role')}
        Make it enthusiastic but professional.
        """
        
        response = model.generate_content(prompt)
        return jsonify({'cover_letter': response.text})
    ```

---

## Phase 3: Smart Job Integration (URL Parsing)

### Backend

1.  **Add Parsing Route**:
    ```python
    import requests
    from bs4 import BeautifulSoup

    @app.route('/api/jobs/parse', methods=['POST'])
    def parse_job_url():
        url = request.json.get('url')
        try:
            resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # Simple metadata extraction
            title = soup.title.string if soup.title else "Unknown Position"
            
            # Use Gemini to extract structured data from raw text
            model = genai.GenerativeModel('gemini-pro')
            extraction_prompt = f"Extract {{company, position, location}} from this job posting text in JSON format: {soup.get_text()[:2000]}"
            ai_resp = model.generate_content(extraction_prompt)
            
            return jsonify({'parsed_data': ai_resp.text}) # Requires cleaning JSON string
        except Exception as e:
            return jsonify({'error': str(e)}), 400
    ```

---

## Phase 4: Real-time Analytics

### Frontend

1.  **Install Recharts**:
    ```bash
    npm install recharts framer-motion
    ```

2.  **Create Chart Component** (`components/StatsChart.tsx`):
    ```tsx
    "use client";
    import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

    export default function StatsChart({ data }) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#888888" />
            <YAxis stroke="#888888" />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    ```

---

## Phase 5: Deployment

1.  **Frontend**: Deploy to Vercel (connect GitHub repo).
2.  **Backend**: Deploy to Render or Railway.
3.  **Database**: Migrate SQLite to PostgreSQL (Supabase/Neon) for production persistence.
