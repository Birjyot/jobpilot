@app.route('/api/jobs/parse', methods=['POST'])
def parse_job_url():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    try:
        # 1. Scrape the page
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Get clean text content (limit length to fit in context window)
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
            
        text = soup.get_text()
        # break into lines and remove leading and trailing space on each
        lines = (line.strip() for line in text.splitlines())
        # break multi-headlines into a line each
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        # drop blank lines
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        # Limit to ~4000 chars to avoid token limits
        text_preview = text[:4000]

        # 2. Use Gemini to extract structured data
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""
        Extract the following job details from the raw text using this JSON format:
        {{
            "company": "Company Name",
            "position": "Job Title",
            "location": "City, State or Remote",
            "salary_range": "e.g. $100k-$120k (or null if not found)",
            "description_summary": "Short 2 sentence summary"
        }}
        
        Raw Text:
        {text_preview}
        
        Return ONLY valid JSON.
        """
        
        ai_response = model.generate_content(prompt)
        cleaned_json = ai_response.text.replace('```json', '').replace('```', '').strip()
        parsed_data = json.loads(cleaned_json)
        
        return jsonify({
            'success': True,
            'data': parsed_data,
            'original_url': url
        })

    except Exception as e:
        print(f"Parsing Error: {e}")
        return jsonify({
            'error': 'Failed to parse job details', 
            'details': str(e)
        }), 500
