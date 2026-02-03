# Deployment Guide 🚀

This document explains how to deploy your Job Tracker application to GitHub, Render (Backend), and Vercel (Frontend).

## 1. Push to GitHub
If you haven't initialized a repository yet:
```bash
git init
git add .
git commit -m "feat: ready for deployment"
# Create a repository on GitHub, then link it:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## 2. Deploy Backend (Render)
1.  Go to [Render.com](https://render.com) and sign in.
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  **Configuration Settings**:
    *   **Name**: `job-tracker-backend`
    *   **Root Directory**: `job-tracker/backend`
    *   **Environment**: `Python 3`
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `gunicorn app:app`
5.  **Environment Variables**: Click "Advanced" and add:
    *   `GEMINI_API_KEY`: `your_gemini_key_here`
    *   `PYTHON_VERSION`: `3.11.x` (or your local version)

---

## 3. Deploy Frontend (Vercel)
1.  Go to [Vercel.com](https://vercel.com) and sign in.
2.  Click **"Add New"** -> **Project**.
3.  Connect your GitHub repository.
4.  **Configuration Settings**:
    *   **Framework Preset**: `Next.js`
    *   **Root Directory**: `frontend`
5.  **Environment Variables**:
    *   `NEXT_PUBLIC_API_URL`: `https://your-backend-url.onrender.com` (Copy this from Render after it deploys)
    *   `NEXTAUTH_URL`: `https://your-frontend-url.vercel.app`
    *   `NEXTAUTH_SECRET`: `your_random_secret_here`
    *   `GOOGLE_CLIENT_ID`: `your_google_client_id`
    *   `GOOGLE_CLIENT_SECRET`: `your_google_client_secret`

---

## 🏁 Final Steps
Once both are deployed:
1.  Copy your Vercel URL (e.g., `https://my-job-pilot.vercel.app`).
2.  Go back to **Render** -> Dashboard -> your backend service -> **Environment Variables**.
3.  Add `FRONTEND_URL` if you want to restrict CORS later (currently it's open).
4.  **Google Cloud Console**: Update your Authorized Redirect URIs to:
    `https://your-frontend-url.vercel.app/api/auth/callback/google`
