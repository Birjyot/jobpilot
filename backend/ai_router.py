"""
ai_router.py — Multi-provider AI abstraction layer for JobPilot

Provider hierarchy:
  - Gemini 1.5  → deep/complex tasks (ATS scan, resume analysis, cover letter)
  - Groq         → fast/cheap tasks  (chat, interview questions, quick suggestions)
  - OpenRouter   → universal fallback when the above fail

Usage:
    from backend.ai_router import ai_router, TaskType
    result = ai_router.generate(prompt="...", task_type=TaskType.ATS_SCAN)
    # result is always a plain string; caller is responsible for JSON parsing.
"""

import json
import os
import time
from enum import Enum

# ─────────────────────────── Task taxonomy ───────────────────────────

class TaskType(str, Enum):
    ATS_SCAN        = "ats_scan"        # complex — Gemini primary
    RESUME_PARSE    = "resume_parse"    # complex — Gemini primary
    COVER_LETTER    = "cover_letter"    # medium  — Gemini primary
    SUGGESTIONS     = "suggestions"     # medium  — Gemini primary
    INTERVIEW_PREP  = "interview_prep"  # fast    — Groq primary
    CHAT            = "chat"            # fast    — Groq primary
    JOB_PARSE       = "job_parse"       # fast    — Gemini primary (existing feature)
    GMAIL_EXTRACT   = "gmail_extract"   # fast    — Gemini primary (new feature)


# ─────────────────────── Provider configs ─────────────────────────────

# Map each task to an ordered list of (provider, model_id) pairs.
# The router tries each in order and moves to the next on failure.
PROVIDER_CHAIN: dict[TaskType, list[tuple[str, str]]] = {
    TaskType.ATS_SCAN:       [("gemini", "gemini-1.5-pro"),
                               ("openrouter", "google/gemini-flash-1.5"),
                               ("groq",   "llama-3.1-8b-instant")],
    TaskType.RESUME_PARSE:   [("gemini", "gemini-1.5-flash-latest"),
                               ("openrouter", "google/gemini-flash-1.5"),
                               ("groq",   "llama-3.1-8b-instant")],
    TaskType.COVER_LETTER:   [("gemini", "gemini-1.5-flash-latest"),
                               ("openrouter", "google/gemini-flash-1.5"),
                               ("groq",   "llama-3.1-8b-instant")],
    TaskType.SUGGESTIONS:    [("gemini", "gemini-1.5-flash-latest"),
                               ("groq",   "llama-3.1-8b-instant"),
                               ("openrouter", "google/gemini-flash-1.5")],
    TaskType.INTERVIEW_PREP: [("groq",   "llama-3.1-8b-instant"),
                               ("gemini", "gemini-1.5-flash-latest"),
                               ("openrouter", "google/gemini-flash-1.5")],
    TaskType.CHAT:           [("groq",   "llama-3.1-8b-instant"),
                               ("gemini", "gemini-1.5-flash-latest"),
                               ("openrouter", "google/gemini-flash-1.5")],
    TaskType.JOB_PARSE:      [("gemini", "gemini-1.5-flash-latest"),
                               ("groq",   "llama-3.1-8b-instant"),
                               ("openrouter", "google/gemini-flash-1.5")],
    TaskType.GMAIL_EXTRACT:  [("gemini", "gemini-1.5-flash-latest"),
                               ("groq",   "llama-3.1-8b-instant")],
}

# Retry settings
MAX_RETRIES    = 2       # retries per provider before moving to the next
RETRY_DELAY    = 1.5     # seconds between retries (exponential: delay * attempt)


# ─────────────────────── Provider call implementations ──────────────────────

def _call_gemini(model_id: str, prompt: str) -> str:
    """Call Google Gemini via the official SDK."""
    import google.generativeai as genai
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_id)
    response = model.generate_content(prompt)
    return response.text


def _call_groq(model_id: str, prompt: str) -> str:
    """Call Groq via the official Groq SDK (OpenAI-compatible)."""
    from groq import Groq
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set")
    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model=model_id,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=2048,
    )
    return completion.choices[0].message.content


def _call_openrouter(model_id: str, prompt: str) -> str:
    """Call OpenRouter via its OpenAI-compatible REST endpoint."""
    import requests
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type":  "application/json",
        "HTTP-Referer":  "https://jobpilot.app",
        "X-Title":       "JobPilot",
    }
    payload = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 2048,
    }
    resp = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


# ─────────────────────── Main router class ──────────────────────────────────

class AIRouter:
    """
    Intelligent multi-provider router.

    Call `generate()` with a prompt and a TaskType; the router picks the best
    provider chain automatically, retries on failure, and falls back gracefully.
    """

    def _dispatch(self, provider: str, model_id: str, prompt: str) -> str:
        """Route to the correct provider call."""
        if provider == "gemini":
            return _call_gemini(model_id, prompt)
        elif provider == "groq":
            return _call_groq(model_id, prompt)
        elif provider == "openrouter":
            return _call_openrouter(model_id, prompt)
        else:
            raise ValueError(f"Unknown provider: {provider}")

    def generate(
        self,
        prompt: str,
        task_type: TaskType = TaskType.CHAT,
        json_mode: bool = False,
    ) -> dict:
        """
        Generate a response using the best available provider.

        Returns:
            {
                "text":     str,       # raw model output
                "provider": str,       # which provider answered
                "model":    str,       # which model was used
                "success":  bool,
                "error":    str|None,  # last error if all providers failed
            }
        """
        chain  = PROVIDER_CHAIN.get(task_type, PROVIDER_CHAIN[TaskType.CHAT])
        errors = []

        for provider, model_id in chain:
            print(f"[AIRouter] Attempting {task_type} with {provider}/{model_id}...")
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    start_time = time.time()
                    text = self._dispatch(provider, model_id, prompt)
                    duration = time.time() - start_time

                    # Optional: strip markdown fences from JSON responses
                    if json_mode:
                        text = _clean_json_text(text)

                    print(f"[AIRouter] OK {provider}/{model_id} success in {duration:.2f}s (attempt {attempt})")
                    return {
                        "text":     text,
                        "provider": provider,
                        "model":    model_id,
                        "success":  True,
                        "error":    None,
                    }

                except Exception as e:
                    err = str(e)
                    errors.append(f"{provider}/{model_id} attempt {attempt}: {err}")
                    print(f"[AIRouter] FAIL {provider}/{model_id} attempt {attempt}: {err}")

                    # Don't retry 401/403 (auth errors) — skip to next provider
                    if any(code in err for code in ["401", "403", "invalid_api_key"]):
                        break

                    if attempt < MAX_RETRIES:
                        time.sleep(RETRY_DELAY * attempt)

        # All providers exhausted
        return {
            "text":     "",
            "provider": None,
            "model":    None,
            "success":  False,
            "error":    " | ".join(errors),
        }

    def generate_json(self, prompt: str, task_type: TaskType) -> dict:
        """
        Like generate(), but automatically parses the result as JSON.
        Returns {"data": <parsed dict>, "provider": ..., "success": bool, "error": ...}
        """
        result = self.generate(prompt, task_type=task_type, json_mode=True)
        if not result["success"]:
            return {**result, "data": None}
        try:
            data = json.loads(result["text"])
            return {**result, "data": data}
        except json.JSONDecodeError as e:
            return {
                **result,
                "data":    None,
                "success": False,
                "error":   f"JSON parse failed: {e} — raw: {result['text'][:200]}",
            }


# ─────────────────────── Helpers ────────────────────────────────────────────

def _clean_json_text(text: str) -> str:
    """Strip markdown code fences that models sometimes add around JSON."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Remove first fence line (```json or ```)
        lines = lines[1:]
        # Remove trailing fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


# ─────────────────────── Singleton ──────────────────────────────────────────

# Import this single instance throughout the app:
#   from backend.ai_router import ai_router, TaskType
ai_router = AIRouter()
