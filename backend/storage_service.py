"""File storage abstraction.

v1: MongoDB GridFS.

# ----------------------------------------------------------------------
# SWAP TO AWS S3 LATER (set STORAGE_MODE=s3 in .env and provide AWS creds):
# - Uncomment AWS_* env vars in .env
# - The S3 stub function `_s3_upload` below already wires boto3.
# - No frontend changes needed; `/api/files/{id}` keeps the same URL.
# ----------------------------------------------------------------------
"""
import io
import os
import uuid
from typing import Optional, Tuple

from db import fs_bucket

STORAGE_MODE = os.environ.get("STORAGE_MODE", "gridfs")


async def upload_file(
    file_bytes: bytes,
    filename: str,
    content_type: str = "application/octet-stream",
    user_id: Optional[str] = None,
    purpose: str = "general",
) -> str:
    """Returns a file_id string."""
    if STORAGE_MODE == "s3":
        return await _s3_upload(file_bytes, filename, content_type, user_id, purpose)
    return await _gridfs_upload(file_bytes, filename, content_type, user_id, purpose)


async def download_file(file_id: str) -> Tuple[bytes, str, str]:
    """Returns (bytes, filename, content_type)."""
    if STORAGE_MODE == "s3":
        return await _s3_download(file_id)
    return await _gridfs_download(file_id)


async def delete_file(file_id: str) -> None:
    if STORAGE_MODE == "s3":
        return await _s3_delete(file_id)
    return await _gridfs_delete(file_id)


# ----- GridFS implementations -----
async def _gridfs_upload(file_bytes, filename, content_type, user_id, purpose):
    file_id = str(uuid.uuid4())
    grid_in = fs_bucket.open_upload_stream(
        filename,
        metadata={
            "file_id": file_id,
            "user_id": user_id,
            "purpose": purpose,
            "content_type": content_type,
        },
    )
    await grid_in.write(file_bytes)
    await grid_in.close()
    return file_id


async def _gridfs_download(file_id):
    cursor = fs_bucket.find({"metadata.file_id": file_id}).limit(1)
    async for grid_out in cursor:
        # grid_out is a GridOut object, read() is synchronous
        data = grid_out.read()
        meta = grid_out.metadata or {}
        return data, grid_out.filename or "file", meta.get("content_type", "application/octet-stream")
    raise FileNotFoundError(file_id)


async def _gridfs_delete(file_id):
    cursor = fs_bucket.find({"metadata.file_id": file_id})
    async for grid_out in cursor:
        await fs_bucket.delete(grid_out._id)


# ----- S3 stubs (used only when STORAGE_MODE=s3) -----
async def _s3_upload(file_bytes, filename, content_type, user_id, purpose):
    import boto3  # local import to avoid heavy load when unused
    s3 = boto3.client("s3", region_name=os.environ["AWS_REGION"])
    bucket = os.environ["AWS_S3_BUCKET"]
    key = f"{purpose}/{user_id or 'anon'}/{uuid.uuid4()}-{filename}"
    s3.put_object(Bucket=bucket, Key=key, Body=file_bytes, ContentType=content_type)
    return key


async def _s3_download(file_id):
    import boto3
    s3 = boto3.client("s3", region_name=os.environ["AWS_REGION"])
    obj = s3.get_object(Bucket=os.environ["AWS_S3_BUCKET"], Key=file_id)
    return obj["Body"].read(), file_id.split("/")[-1], obj.get("ContentType", "application/octet-stream")


async def _s3_delete(file_id):
    import boto3
    s3 = boto3.client("s3", region_name=os.environ["AWS_REGION"])
    s3.delete_object(Bucket=os.environ["AWS_S3_BUCKET"], Key=file_id)
