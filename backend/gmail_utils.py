import os
import json
import base64
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from backend.ai_router import ai_router, TaskType
from backend.text_utils import build_gmail_extract_prompt

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_flow(redirect_uri=None):
    """Creates a web flow object for production OAuth."""
    if not os.path.exists('credentials.json'):
        raise FileNotFoundError("credentials.json not found in root directory.")
    from google_auth_oauthlib.flow import Flow
    flow = Flow.from_client_secrets_file(
        'credentials.json',
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    return flow

def get_gmail_service_local():
    """
    LOCAL DEVELOPMENT: Uses InstalledAppFlow with Desktop App credentials.
    Opens a browser popup for one-time auth. Saves token.json for future use.
    """
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists('credentials.json'):
                raise FileNotFoundError("credentials.json not found. Get a Desktop App client from Google Console.")
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)

        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    return build('gmail', 'v1', credentials=creds)

def get_gmail_service(creds_json):
    """
    PRODUCTION: Returns a Gmail service from stored JSON credentials (from DB).
    """
    if not creds_json:
        return None
    creds_data = json.loads(creds_json)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return build('gmail', 'v1', credentials=creds)

def sync_job_emails(service):
    """Searches for job application emails and extracts structured data using AI."""
    try:
        query = (
            "from:(linkedin.com OR internshala.com OR naukri.com OR wellfound.com OR "
            "greenhouse.io OR lever.co OR workday.com) "
            "subject:(application OR applied OR screening OR interview OR offer OR rejected)"
        )
        results = service.users().messages().list(userId='me', q=query, maxResults=15).execute()
        messages = results.get('messages', [])

        extracted_jobs = []
        if not messages:
            print("[GmailSync] No matching emails found.")
            return []

        for msg in messages:
            msg_data = service.users().messages().get(userId='me', id=msg['id']).execute()
            snippet = msg_data.get('snippet', '')

            prompt = build_gmail_extract_prompt(snippet)
            result = ai_router.generate_json(prompt, task_type=TaskType.GMAIL_EXTRACT)

            if result.get('success') and result.get('data'):
                job_data = result['data']
                job_data['source'] = 'Gmail'
                job_data['msg_id'] = msg['id']
                extracted_jobs.append(job_data)
                print(f"[GmailSync] Extracted: {job_data.get('company')} - {job_data.get('role')}")

        return extracted_jobs

    except Exception as e:
        print(f"[GmailSync] Error: {e}")
        return []
