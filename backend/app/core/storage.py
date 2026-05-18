"""
S3-compatible object storage client wrapping boto3.
Targets Railway Buckets (region="auto") but works with any S3-compatible endpoint.

All methods raise StorageError on failure so callers get a clean exception type.
"""
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import Optional
from app.core.config import settings


class StorageError(Exception):
    pass


def _client():
    if not settings.S3_ENDPOINT:
        raise StorageError("S3_ENDPOINT is not configured")
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        region_name=settings.S3_REGION,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
    )


def presign_put(key: str, content_type: str, expires_in: int = 300) -> str:
    """Return a pre-signed URL the client can PUT an object to (5 min default)."""
    try:
        client = _client()
        return client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.S3_BUCKET,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
        )
    except ClientError as e:
        raise StorageError(f"presign_put failed: {e}") from e


def presign_get(key: str, expires_in: int = 3600) -> str:
    """Return a pre-signed URL for reading an object (1 hour default)."""
    try:
        client = _client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET, "Key": key},
            ExpiresIn=expires_in,
        )
    except ClientError as e:
        raise StorageError(f"presign_get failed: {e}") from e


def put_object(key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    """Upload bytes directly (server-side upload, e.g. processed thumbnails)."""
    try:
        client = _client()
        client.put_object(
            Bucket=settings.S3_BUCKET,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
    except ClientError as e:
        raise StorageError(f"put_object failed: {e}") from e


def delete(key: str) -> None:
    """Delete a single object. Silently succeeds if the key does not exist."""
    try:
        client = _client()
        client.delete_object(Bucket=settings.S3_BUCKET, Key=key)
    except ClientError as e:
        raise StorageError(f"delete failed: {e}") from e


def delete_many(keys: list[str]) -> None:
    """Batch-delete up to 1000 keys in one API call."""
    if not keys:
        return
    try:
        client = _client()
        # S3 batch delete API accepts at most 1000 keys per request
        for chunk_start in range(0, len(keys), 1000):
            chunk = keys[chunk_start : chunk_start + 1000]
            client.delete_objects(
                Bucket=settings.S3_BUCKET,
                Delete={"Objects": [{"Key": k} for k in chunk], "Quiet": True},
            )
    except ClientError as e:
        raise StorageError(f"delete_many failed: {e}") from e


def list_under_prefix(prefix: str) -> list[str]:
    """Return all object keys with the given prefix (paginated)."""
    try:
        client = _client()
        paginator = client.get_paginator("list_objects_v2")
        keys: list[str] = []
        for page in paginator.paginate(Bucket=settings.S3_BUCKET, Prefix=prefix):
            for obj in page.get("Contents", []):
                keys.append(obj["Key"])
        return keys
    except ClientError as e:
        raise StorageError(f"list_under_prefix failed: {e}") from e


def get_object(key: str) -> bytes:
    """Download an object and return its raw bytes (used for server-side processing)."""
    try:
        client = _client()
        response = client.get_object(Bucket=settings.S3_BUCKET, Key=key)
        return response["Body"].read()
    except ClientError as e:
        raise StorageError(f"get_object failed: {e}") from e


def safe_presign_get(key: str, expires_in: int = 3600) -> Optional[str]:
    """Return a pre-signed GET URL, or None if storage is not configured or key is empty."""
    if not key or not storage_configured():
        return None
    try:
        return presign_get(key, expires_in)
    except StorageError:
        return None


def storage_configured() -> bool:
    """Return True only when all required S3 env vars are set."""
    return bool(
        settings.S3_ENDPOINT
        and settings.S3_ACCESS_KEY
        and settings.S3_SECRET_KEY
        and settings.S3_BUCKET
    )
