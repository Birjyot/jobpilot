import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
api_key = os.environ.get("GROQ_API_KEY")

try:
    print(f"Testing Groq with key: {api_key[:10]}...")
    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": "Hello, say 'Groq OK'"}],
    )
    print(f"Response: {completion.choices[0].message.content}")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
