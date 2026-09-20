import os
import io
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

SCOPES = ["https://www.googleapis.com/auth/drive"]

_drive_service = None

def get_drive_service():
    global _drive_service
    if _drive_service is None:
        creds_json_str = os.getenv("GOOGLE_CREDENTIALS_JSON")
        if creds_json_str:
            import json
            creds_info = json.loads(creds_json_str)
            creds = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
        else:
            creds_path = os.getenv("GOOGLE_CREDENTIALS_PATH", "./credentials/service_account.json")
            creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
        _drive_service = build('drive', 'v3', credentials=creds)
    return _drive_service

def upload_pdf(pdf_bytes: bytes, filename: str) -> str:
    """Uploads a PDF to the specified Drive folder and returns its webViewLink."""
    folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
    if not folder_id:
        print("GOOGLE_DRIVE_FOLDER_ID not set, skipping upload")
        return ""
        
    service = get_drive_service()
    
    file_metadata = {
        'name': filename,
        'parents': [folder_id]
    }
    
    media = MediaIoBaseUpload(io.BytesIO(pdf_bytes), mimetype='application/pdf', resumable=True)
    
    # Check if a file with the same name already exists to avoid duplicates
    results = service.files().list(q=f"'{folder_id}' in parents and name='{filename}' and trashed=false",
                                   fields="files(id)").execute()
    items = results.get('files', [])
    
    if items:
        # File exists, update it
        file_id = items[0]['id']
        file = service.files().update(fileId=file_id, media_body=media, fields='webViewLink').execute()
    else:
        # File doesn't exist, create it
        file = service.files().create(body=file_metadata, media_body=media, fields='webViewLink').execute()
        
    # Make the file readable by anyone with the link (optional, depends on preference)
    try:
        service.permissions().create(
            fileId=file.get('id', items[0]['id'] if items else None),
            body={'type': 'anyone', 'role': 'reader'}
        ).execute()
    except Exception as e:
        print(f"Failed to set permissions: {e}")
        
    return file.get('webViewLink', '')
