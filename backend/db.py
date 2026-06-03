"""Supabase Postgres client — replacement for DynamoDB.

Tables in Supabase:
  profiles (id, email, password_hash, full_name, created_at, updated_at, failed_attempts, locked_until)
  refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
  personas (id, user_id, type, name, personality_summary, communication_style, tone_tags, system_prompt, sample_dialogue, avatar_url, voice_id, is_active, created_at, updated_at)
  sessions (id, user_id, persona_id, vehicle_id, status, started_at, ended_at, created_at)
  session_turns (id, session_id, speaker, content, created_at)
  rag_chunks (id, user_id, persona_id, session_id, text, metadata, created_at)
  analytics (id, session_id, total_query, llm_query, stt_calls, tts_calls, response_time, stt_latency, tts_latency, groundedness, cost_idr, cost_llm_idr, cost_stt_idr, cost_tts_idr, created_at)
"""
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv

logger = logging.getLogger("drivoai.db")

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY/ANON_KEY must be set in .env")

# ─── Lazy Supabase client (avoid early connection errors) ─────────
_supabase_client = None

async def ensure_tables_exist():
    # Table creation is handled via SQL script manually by user in Supabase dashboard
    # This is a placeholder to prevent startup errors
    pass

def get_supabase():
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client


def _table(name: str):
    return get_supabase().table(name)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Low-level helpers ────────────────────────────────────────────

async def _get_profile(user_id: str) -> Optional[Dict[str, Any]]:
    try:
        res = _table("profiles").select("*").eq("id", user_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"Error getting profile {user_id}: {e}")
        return None


async def _get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    try:
        # Supabase Python client execution is synchronous unless using specific async methods
        # However, the wrapper used here is often sync. Let's ensure we handle both cases.
        res = _table("profiles").select("*").eq("email", email.lower().strip()).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"Error getting user by email {email}: {e}")
        return None


# ─── Public DB API ─────────────────────────────────────────────────

async def create_user(email: str, password_hash: str, full_name: str) -> Dict[str, Any]:
    user_id = str(uuid.uuid4())
    item = {
        "id": user_id,
        "email": email.lower(),
        "password_hash": password_hash,
        "full_name": full_name,
        "created_at": _now_iso(),
        "updated_at": _now_iso()
    }
    try:
        _table("profiles").insert(item).execute()
        return item
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise Exception(f"Failed to create user: {str(e)}")


async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    return await _get_profile(user_id)


async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    return await _get_user_by_email(email)


async def update_user(user_id: str, updates: Dict[str, Any]) -> None:
    try:
        updates["updated_at"] = _now_iso()
        _table("profiles").update(updates).eq("id", user_id).execute()
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")


async def create_refresh_token(user_id: str, token_hash: str, expires_at: str) -> None:
    try:
        item = {
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": expires_at,
            "revoked": False,
            "created_at": _now_iso()
        }
        _table("refresh_tokens").insert(item).execute()
    except Exception as e:
        logger.error(f"Error creating refresh token: {e}")


async def get_valid_refresh_token(token_hash: str) -> Optional[Dict[str, Any]]:
    try:
        res = _table("refresh_tokens") \
            .select("*") \
            .eq("token_hash", token_hash) \
            .eq("revoked", False) \
            .execute()
        if not res.data:
            return None
        token = res.data[0]
        if datetime.fromisoformat(token["expires_at"]) < datetime.now(timezone.utc):
            return None
        return token
    except Exception as e:
        logger.error(f"Error getting refresh token: {e}")
        return None


async def revoke_refresh_token(token_hash: str) -> None:
    try:
        _table("refresh_tokens").update({"revoked": True}).eq("token_hash", token_hash).execute()
    except Exception as e:
        logger.error(f"Error revoking refresh token: {e}")


async def create_persona(persona: Dict[str, Any]) -> None:
    try:
        _table("personas").insert(persona).execute()
    except Exception as e:
        logger.error(f"Error creating persona: {e}")


async def list_templates() -> List[Dict[str, Any]]:
    try:
        res = _table("personas").select("*").eq("type", "template").order("created_at").execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        return []


async def list_user_personas(user_id: str) -> List[Dict[str, Any]]:
    try:
        res = _table("personas").select("*").eq("user_id", user_id).order("created_at").execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error listing user personas: {e}")
        return []


async def count_custom_personas(user_id: Optional[str] = None) -> int:
    try:
        query = _table("personas").select("id", count="exact").eq("type", "custom")
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.execute()
        return res.count if res.count is not None else 0
    except Exception as e:
        logger.error(f"Error counting personas: {e}")
        return 0


async def update_persona(persona_id: str, user_id: str, updates: Dict[str, Any]) -> None:
    try:
        updates["updated_at"] = _now_iso()
        _table("personas").update(updates).eq("id", persona_id).eq("user_id", user_id).execute()
    except Exception as e:
        logger.error(f"Error updating persona: {e}")


async def deactivate_all_personas(user_id: str) -> None:
    try:
        _table("personas").update({"is_active": False}).eq("user_id", user_id).execute()
    except Exception as e:
        logger.error(f"Error deactivating personas: {e}")


async def get_persona(user_id: str, persona_id: str) -> Optional[Dict[str, Any]]:
    try:
        res = _table("personas").select("*").eq("id", persona_id).eq("user_id", user_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"Error getting persona: {e}")
        return None


async def delete_persona(user_id: str, persona_id: str) -> None:
    try:
        _table("personas").delete().eq("id", persona_id).eq("user_id", user_id).execute()
    except Exception as e:
        logger.error(f"Error deleting persona: {e}")


async def create_session(user_id: str, persona_id: str = None, vehicle_id: str = None) -> Dict[str, Any]:
    session_id = str(uuid.uuid4())
    item = {
        "id": session_id,
        "user_id": user_id,
        "persona_id": persona_id,
        "vehicle_id": vehicle_id,
        "status": "active",
        "started_at": _now_iso(),
        "created_at": _now_iso()
    }
    try:
        _table("sessions").insert(item).execute()
    except Exception as e:
        logger.error(f"Error creating session: {e}")
    return item


async def get_session(user_id: str, session_id: str) -> Optional[Dict[str, Any]]:
    try:
        res = _table("sessions").select("*").eq("id", session_id).eq("user_id", user_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        return None


async def update_session(user_id: str, session_id: str, updates: Dict[str, Any]) -> None:
    try:
        _table("sessions").update(updates).eq("id", session_id).eq("user_id", user_id).execute()
    except Exception as e:
        logger.error(f"Error updating session: {e}")


async def add_session_turn(session_id: str, speaker: str, content: str) -> None:
    try:
        item = {
            "session_id": session_id,
            "speaker": speaker,
            "content": content,
            "created_at": _now_iso()
        }
        _table("session_turns").insert(item).execute()
    except Exception as e:
        logger.error(f"Error adding session turn: {e}")


async def get_session_history(session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    try:
        res = _table("session_turns") \
            .select("*") \
            .eq("session_id", session_id) \
            .order("created_at") \
            .limit(limit) \
            .execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error getting session history: {e}")
        return []


async def save_analytics(session_id: str, data: Dict[str, Any]) -> None:
    try:
        data["session_id"] = session_id
        data["created_at"] = _now_iso()
        _table("analytics").insert(data).execute()
    except Exception as e:
        logger.error(f"Error saving analytics: {e}")


async def get_all_analytics(start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    try:
        query = _table("analytics").select("*")
        if start_date:
            query = query.gte("created_at", start_date)
        if end_date:
            query = query.lte("created_at", end_date)
        res = query.order("created_at").execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error getting all analytics: {e}")
        return []


async def get_total_users_count() -> int:
    try:
        res = _table("profiles").select("id", count="exact").execute()
        return res.count if res.count is not None else 1
    except Exception as e:
        logger.error(f"Error getting total users: {e}")
        return 1