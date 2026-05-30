"""JWT auth + user registration/login.

Note: bcrypt is used directly (not via passlib) to avoid v4 compat issues.
For easier local dev, password rules are still enforced.
"""
import hashlib
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from db import refresh_tokens_col, users_col

JWT_SECRET = os.environ.get("JWT_SECRET", "drivoai-dev-secret")
JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_MIN = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", 7))

bearer = HTTPBearer(auto_error=False)


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def sha256(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def create_refresh_token() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex


async def store_refresh_token(user_id: str, token: str) -> None:
    await refresh_tokens_col.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "token_hash": sha256(token),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS)).isoformat(),
        "revoked": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def revoke_refresh_token(token: str) -> None:
    await refresh_tokens_col.update_many({"token_hash": sha256(token)}, {"$set": {"revoked": True}})


async def get_user_id_from_refresh(token: str) -> Optional[str]:
    doc = await refresh_tokens_col.find_one({"token_hash": sha256(token), "revoked": False})
    if not doc:
        return None
    try:
        exp = datetime.fromisoformat(doc["expires_at"])
        if exp < datetime.now(timezone.utc):
            return None
    except Exception:
        return None
    return doc["user_id"]


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    """Returns user dict; raises 401 if invalid."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="UNAUTHORIZED")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="UNAUTHORIZED")
    user = await users_col.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="UNAUTHORIZED")
    return user


async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
        return await users_col.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    except Exception:
        return None
