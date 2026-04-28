import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

try:
    print(f"Testing Gemini with key: {api_key[:10]}...")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents="Hello, say 'Test OK'",
    )
    print(f"Response object: {type(response)}")
    print(f"Text: {response.text}")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
