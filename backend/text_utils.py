"""
text_utils.py — Text preprocessing for CareerOS (reduces AI token cost)
"""

import re
from typing import Optional

MAX_RESUME_CHARS   = 6_000
MAX_JD_CHARS       = 4_000

_STOPWORDS = {
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "by","from","is","are","was","were","be","been","have","has","had",
    "do","does","did","will","would","could","should","may","might",
    "can","as","if","than","that","this","these","those","it","its",
    "we","our","you","your","they","their","he","she","i","me","my",
    "not","no","so","yet","all","any","more","most","other","some","into",
    "through","about","also","just","because","while","both","each","every",
}


def clean_text(text: str) -> str:
    """Normalise whitespace and line endings."""
    text = text.replace("\x00", "")
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _smart_truncate(text: str, max_chars: int) -> str:
    """Truncate preferring paragraph boundaries over hard cuts."""
    if len(text) <= max_chars:
        return text
    snippet = text[:max_chars]
    last_para = snippet.rfind("\n\n")
    if last_para > max_chars * 0.6:
        return snippet[:last_para].strip() + "\n\n[...truncated]"
    last_dot = max(snippet.rfind(". "), snippet.rfind(".\n"))
    if last_dot > max_chars * 0.6:
        return snippet[:last_dot + 1].strip() + " [...]"
    return snippet.rstrip() + " [...]"


def truncate_resume(text: str) -> str:
    return _smart_truncate(text, MAX_RESUME_CHARS)


def truncate_jd(text: str) -> str:
    return _smart_truncate(text, MAX_JD_CHARS)


def extract_keywords(text: str, top_n: int = 40) -> list:
    """Return most-frequent non-stopword terms (no AI needed)."""
    tokens = re.findall(r"\b[a-zA-Z][a-zA-Z+#.]{1,}\b", text.lower())
    freq: dict = {}
    for tok in tokens:
        if tok not in _STOPWORDS and len(tok) > 2:
            freq[tok] = freq.get(tok, 0) + 1
    return sorted(freq, key=lambda k: freq[k], reverse=True)[:top_n]


def summarize_jobs_for_prompt(jobs: list, max_jobs: int = 10) -> str:
    lines = [f"- {j.position} at {j.company} (Status: {j.status})" for j in jobs[:max_jobs]]
    return "\n".join(lines) if lines else "No applications yet."


def build_ats_prompt(resume_text: str, job_description: str) -> str:
    r = truncate_resume(clean_text(resume_text))
    jd = truncate_jd(clean_text(job_description))
    kw_hint = ", ".join(extract_keywords(jd, 15))
    return f"""You are an ATS expert. Analyze this resume vs the job description.
Return ONLY valid JSON (no markdown fences).

Key JD terms: {kw_hint}

Resume:
{r}

Job Description:
{jd}

JSON schema:
{{
  "match_score": <0-100>,
  "matched_keywords": ["..."],
  "missing_keywords": ["..."],
  "suggestions": ["...","...","..."],
  "summary": "<2-sentence assessment>"
}}"""


def build_cover_letter_prompt(position: str, company: str, job_description: str) -> str:
    jd_snippet = _smart_truncate(clean_text(job_description), 800)
    return (
        f"Write a professional cover letter (max 280 words) for {position} at {company}.\n"
        f"Skills: Python, React, JavaScript, Full Stack.\n"
        f"JD highlights: {jd_snippet}\n"
        f"Plain text only, no placeholders."
    )


def build_interview_prompt(position: str) -> str:
    return (
        f"Generate 3 technical and 2 behavioral interview questions for a {position} role.\n"
        f'Return ONLY JSON: {{"technical": ["...","...","..."], "behavioral": ["...","..."]}}'
    )


def build_suggestions_prompt(jobs_str: str) -> str:
    return (
        f"My recent job applications:\n{jobs_str}\n\n"
        f"Give me 3 concise, actionable career tips for this week. "
        f"One sentence each. No numbering or bullets."
    )
def build_gmail_extract_prompt(email_content: str) -> str:
    """Prompt to extract job application info from a Gmail snippet."""
    return f"""
    Extract job application details from the following email snippet.
    Return ONLY a JSON object with:
    {{
        "company": "Company name",
        "role": "Job title/position",
        "status": "Applied" | "Screening" | "Interview" | "Offer" | "Rejected",
        "date": "YYYY-MM-DD" (best guess if not clear)
    }}

    Email Snippet:
    \"\"\"{email_content}\"\"\"
    """
