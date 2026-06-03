"""JWT auth + user registration/login — Supabase backend."""
import hashlib
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from db import (
    create_refresh_token,
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_valid_refresh_token,
    revoke_refresh_token,
    update_user,
)

JWT_SECRET = os.environ.get("JWT_SECRET", "drivoai-dev-secret")
JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_MIN = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", 7))

logger = logging.getLogger("drivoai")

bearer = HTTPBearer(auto_error=False)


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        # Normalize and ensure clean bytes
        pw_bytes = pw.strip().encode('utf-8')
        hashed_bytes = hashed.strip().encode('utf-8')
        return bcrypt.checkpw(pw_bytes, hashed_bytes)
    except Exception as e:
        import logging
        logging.getLogger("drivoai").error(f"Password verification error: {e}")
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


def create_refresh_token_value() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex


async def register_user(email: str, password: str, full_name: str = "") -> dict:
    existing = await get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")
    password_hash = hash_password(password)
    user = await create_user(
        email=email.lower(),
        password_hash=password_hash,
        full_name=full_name or email.split("@")[0],
    )
    token = create_refresh_token_value()
    expires = (datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS)).isoformat()
    await create_refresh_token(user["id"], sha256(token), expires)
    access = create_access_token(user["id"])
    return {"access_token": access, "refresh_token": token, "user": user}


async def login_user(email: str, password: str) -> dict:
    email_clean = email.lower().strip()
    logger.info(f"Attempting login for email: {email_clean}")
    
    user = await get_user_by_email(email_clean)
    if not user:
        logger.warning(f"Login failed: User {email_clean} not found in database.")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    logger.info(f"User found: {user['id']}. Checking password...")
    
    locked = user.get("locked_until")
    if locked:
        try:
            if datetime.fromisoformat(locked) > datetime.now(timezone.utc):
                logger.warning(f"Login failed: Account {email_clean} is locked until {locked}")
                raise HTTPException(status_code=423, detail="Account temporarily locked. Try again later.")
        except ValueError:
            pass

    if not verify_password(password, user["password_hash"]):
        attempts = user.get("failed_attempts", 0) + 1
        logger.warning(f"Login failed: Incorrect password for {email_clean}. Attempt {attempts}/5")
        
        updates = {"failed_attempts": attempts}
        if attempts >= 5:
            updates["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
            updates["failed_attempts"] = 0
            logger.error(f"Account {email_clean} locked due to too many failed attempts.")
            
        await update_user(user["id"], updates)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    logger.info(f"Login successful for {email_clean}. Resetting failed attempts.")
    await update_user(user["id"], {"failed_attempts": 0, "locked_until": None})
    
    token = create_refresh_token_value()
    expires = (datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS)).isoformat()
    await create_refresh_token(user["id"], sha256(token), expires)
    access = create_access_token(user["id"])
    
    return {"access_token": access, "refresh_token": token, "user": user}


async def refresh_access_token(refresh_token: str) -> str:
    token_hash = sha256(refresh_token)
    token_item = await get_valid_refresh_token(token_hash)
    if not token_item:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    return create_access_token(token_item["user_id"])


async def logout_user(user_id: str, refresh_token: str) -> None:
    await revoke_refresh_token(sha256(refresh_token))


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="UNAUTHORIZED")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="UNAUTHORIZED")
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="UNAUTHORIZED")
    return user


async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
        return await get_user_by_id(user_id)
    except Exception:
        return None
