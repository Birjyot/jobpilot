"""
cache_utils.py — AI response caching helpers for CareerOS

Cache keys are SHA-256 hashes of (task_type + normalized_input), so identical
inputs always resolve to the same key regardless of whitespace differences.

TTL policy (configurable):
    ATS_SCAN        7 days   — slow & expensive; same inputs → same score
    RESUME_PARSE   24 hours
    COVER_LETTER   24 hours
    INTERVIEW_PREP 48 hours
    SUGGESTIONS    12 hours
    CHAT            0        — never cached (conversational)
    JOB_PARSE      24 hours
"""

import hashlib
import json
import re
from datetime import datetime, timedelta
from typing import Optional

# TTL in hours per task type (0 = do not cache)
CACHE_TTL_HOURS: dict[str, int] = {
    "ats_scan":       168,   # 7 days
    "resume_parse":    24,
    "cover_letter":    24,
    "interview_prep":  48,
    "suggestions":     12,
    "chat":             0,   # never cache
    "job_parse":       24,
}


def _normalize(text: str) -> str:
    """Collapse whitespace and lowercase to make cache keys stable."""
    return re.sub(r"\s+", " ", text.strip().lower())


def make_cache_key(task_type: str, *inputs: str) -> str:
    """
    Generate a stable SHA-256 cache key from task type + one or more input strings.

    Example:
        key = make_cache_key("ats_scan", resume_text, job_description)
    """
    combined = task_type + "|" + "|".join(_normalize(s) for s in inputs)
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()


def get_cached(task_type: str, cache_key: str) -> Optional[dict]:
    """
    Look up a cache entry. Returns the parsed dict if found and not expired.
    Returns None on miss or expiry.

    Must be called inside a Flask app context (uses SQLAlchemy models).
    """
    # Import inside function to avoid circular imports at module load time
    from models import AICache

    ttl = CACHE_TTL_HOURS.get(task_type, 0)
    if ttl == 0:
        return None  # task type explicitly uncacheable

    entry: Optional[AICache] = AICache.query.filter_by(cache_key=cache_key).first()
    if entry is None:
        return None

    if entry.is_expired():
        # Lazy deletion — remove stale entry so it gets regenerated
        from models import db
        db.session.delete(entry)
        db.session.commit()
        return None

    try:
        return json.loads(entry.result_json)
    except json.JSONDecodeError:
        return None


def set_cache(
    task_type: str,
    cache_key: str,
    result: dict,
    provider_used: str = "",
    estimated_input_tokens: int = 0,
) -> None:
    """
    Store an AI result in the cache with the appropriate TTL.
    No-ops for uncacheable task types or if DB write fails.

    Must be called inside a Flask app context.
    """
    from models import AICache, db

    ttl = CACHE_TTL_HOURS.get(task_type, 0)
    if ttl == 0:
        return

    expires_at = datetime.utcnow() + timedelta(hours=ttl)

    try:
        # Upsert: overwrite if the key already exists (handles race conditions)
        entry = AICache.query.filter_by(cache_key=cache_key).first()
        if entry:
            entry.result_json  = json.dumps(result)
            entry.provider_used = provider_used
            entry.expires_at   = expires_at
            entry.tokens_saved = (entry.tokens_saved or 0) + estimated_input_tokens
        else:
            entry = AICache(
                cache_key       = cache_key,
                task_type       = task_type,
                result_json     = json.dumps(result),
                provider_used   = provider_used,
                tokens_saved    = estimated_input_tokens,
                expires_at      = expires_at,
            )
            db.session.add(entry)

        db.session.commit()
        print(f"[Cache] Stored {task_type} → {cache_key[:12]}… (TTL {ttl}h)")

    except Exception as e:
        print(f"[Cache] Write failed (non-fatal): {e}")
        db.session.rollback()


def cache_stats() -> dict:
    """Return simple statistics about the current cache state."""
    from models import AICache
    try:
        total   = AICache.query.count()
        expired = AICache.query.filter(AICache.expires_at < datetime.utcnow()).count()
        saved   = db_sum_tokens()
        return {
            "total_entries":   total,
            "expired_entries": expired,
            "active_entries":  total - expired,
            "total_tokens_saved": saved,
        }
    except Exception as e:
        return {"error": str(e)}


def db_sum_tokens() -> int:
    """Return total estimated tokens saved by cache hits."""
    from models import AICache, db
    from sqlalchemy import func
    result = db.session.query(func.sum(AICache.tokens_saved)).scalar()
    return result or 0
