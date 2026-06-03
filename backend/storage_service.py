"""Supabase Storage client."""
import os
import uuid
from typing import Tuple
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
BUCKET_NAME = os.environ.get("SUPABASE_STORAGE_BUCKET", "drivoai-files")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def upload_file(
    file_bytes: bytes,
    filename: str,
    content_type: str = "application/octet-stream",
    user_id: str = None,
    purpose: str = "general",
) -> str:
    """Upload a file to Supabase Storage."""
    file_ext = os.path.splitext(filename)[1]
    file_id = f"{purpose}/{user_id or 'anon'}/{uuid.uuid4()}{file_ext}"
    
    # Supabase storage upload is synchronous in the current python client version
    res = supabase.storage.from_(BUCKET_NAME).upload(
        path=file_id,
        file=file_bytes,
        file_options={"content-type": content_type}
    )
    return file_id

async def download_file(file_id: str) -> Tuple[bytes, str, str]:
    """Download a file from Supabase Storage."""
    res = supabase.storage.from_(BUCKET_NAME).download(file_id)
    filename = file_id.split("/")[-1]
    # Note: Content type is not easily available from download() in the current client
    # but we can infer or store it in DB if needed. For now, defaulting.
    return res, filename, "application/octet-stream"

async def delete_file(file_id: str) -> None:
    """Delete a file from Supabase Storage."""
    supabase.storage.from_(BUCKET_NAME).remove([file_id])

def get_public_url(file_id: str) -> str:
    """Get public URL for a file."""
    return supabase.storage.from_(BUCKET_NAME).get_public_url(file_id)
