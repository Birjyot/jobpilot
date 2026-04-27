"""
parsing_utils.py — Job URL scraper + AI extractor (refactored to use ai_router)

Previously used hardcoded genai.GenerativeModel('gemini-pro').
Now uses the ai_router abstraction with cache support.
"""

import json
import requests
from bs4 import BeautifulSoup
from flask import request, jsonify

from backend.ai_router import ai_router, TaskType
from backend.text_utils import clean_text, _smart_truncate
from backend.cache_utils import make_cache_key, get_cached, set_cache


def parse_job_url():
    data = request.get_json()
    url  = data.get('url')

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    # ── Check cache first (url is a stable cache input) ──────────────────────
    cache_key = make_cache_key("job_parse", url)
    cached    = get_cached("job_parse", cache_key)
    if cached:
        return jsonify({'success': True, 'data': cached, 'cached': True, 'original_url': url})

    try:
        # 1. Scrape the page
        headers  = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            )
        }
        response = requests.get(url, headers=headers, timeout=12)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        raw_text  = soup.get_text(separator="\n")
        clean     = clean_text(raw_text)
        preview   = _smart_truncate(clean, 4000)  # keep within token budget

        # 2. Build a compact extraction prompt
        prompt = f"""Extract job details from the raw webpage text below.
Return ONLY valid JSON (no markdown fences) with this schema:
{{
  "company": "Company Name",
  "position": "Job Title",
  "location": "City, State / Remote / Hybrid",
  "salary_range": "$X-$Y or null",
  "description_summary": "2-sentence summary"
}}

Raw text:
{preview}"""

        # 3. Call AI via router (JOB_PARSE task → Gemini primary)
        result = ai_router.generate(prompt, task_type=TaskType.JOB_PARSE, json_mode=True)

        if not result["success"]:
            return jsonify({'error': 'AI extraction failed', 'details': result["error"]}), 500

        parsed_data = json.loads(result["text"])

        # 4. Cache the result
        set_cache("job_parse", cache_key, parsed_data,
                  provider_used=result["provider"],
                  estimated_input_tokens=len(preview) // 4)

        return jsonify({
            'success':      True,
            'data':         parsed_data,
            'provider':     result["provider"],
            'cached':       False,
            'original_url': url
        })

    except json.JSONDecodeError as e:
        return jsonify({'error': 'AI returned invalid JSON', 'details': str(e)}), 500
    except Exception as e:
        print(f"[parse_job_url] Error: {e}")
        return jsonify({'error': 'Failed to parse job details', 'details': str(e)}), 500
