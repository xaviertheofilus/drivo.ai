"""DrivoAI FastAPI server — all endpoints under /api."""
import asyncio
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from db import (
    chunks_col,
    ensure_indexes,
    personas_col,
    refresh_tokens_col,
    sessions_col,
    turns_col,
    users_col,
)
from auth_service import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_user_id_from_refresh,
    hash_password,
    revoke_refresh_token,
    store_refresh_token,
    verify_password,
)
from file_parser import extract_text
from llm_service import (
    chat_with_persona,
    generate_persona_profile,
    proactive_prompt,
)
from rag_service import (
    ingest_document,
    purge_for_persona,
    purge_for_session,
    retrieve_context,
)
from agora_service import build_rtc_token
from storage_service import delete_file, download_file, upload_file
from templates_data import TEMPLATE_PERSONAS
from analysis_service import compute_drowsiness_score, run_post_session_analysis

logger = logging.getLogger("drivoai")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(title="DrivoAI API", version="1.0.0")
api = APIRouter(prefix="/api")

PASSWORD_RE = re.compile(r"^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")
ALLOWED_FILE_EXT = {".txt", ".pdf", ".docx"}
ALLOWED_IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
MAX_FILE_BYTES = 10 * 1024 * 1024


# ----------------- Schemas -----------------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class TokenResp(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshReq(BaseModel):
    refresh_token: str


class PersonaTextCreate(BaseModel):
    description: str = Field(..., min_length=10, max_length=4000)


class PersonaGenerateReq(BaseModel):
    description: str = Field(..., min_length=10, max_length=4000)


class PersonaSave(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    personality_summary: str
    communication_style: str
    tone_tags: List[str] = []
    system_prompt: str
    sample_dialogue: Optional[dict] = None
    avatar_file_id: Optional[str] = None
    source_file_id: Optional[str] = None


class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    personality_summary: Optional[str] = None
    communication_style: Optional[str] = None
    tone_tags: Optional[List[str]] = None
    avatar_file_id: Optional[str] = None


class StartSessionReq(BaseModel):
    persona_id: Optional[str] = None
    language: str = "en"


class TurnReq(BaseModel):
    text: str
    language: str = "en"
    latency_ms: int = 0
    silence_seconds: float = 0
    speech_energy: float = 0.5


class EndSessionReq(BaseModel):
    final_note: Optional[str] = None


class UpdateProfileReq(BaseModel):
    full_name: Optional[str] = None
    language: Optional[str] = None
    avatar_file_id: Optional[str] = None


# ----------------- Helpers -----------------
def _clean(doc):
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


async def _seed_templates_if_needed():
    count = await personas_col.count_documents({"type": "template"})
    if count >= len(TEMPLATE_PERSONAS):
        return
    for t in TEMPLATE_PERSONAS:
        existing = await personas_col.find_one({"type": "template", "slug": t["slug"]})
        if existing:
            continue
        await personas_col.insert_one({
            "id": str(uuid.uuid4()),
            "slug": t["slug"],
            "user_id": None,
            "type": "template",
            "name": t["name"],
            "personality_summary": t["personality_summary"],
            "communication_style": t["communication_style"],
            "tone_tags": t["tone_tags"],
            "system_prompt": t["system_prompt"],
            "sample_dialogue": t["sample_dialogue"],
            "avatar_file_id": None,
            "avatar_seed": t["avatar_seed"],
            "is_active": False,
            "created_at": _now_iso(),
        })


# ----------------- Auth endpoints -----------------
@api.post("/auth/register", response_model=TokenResp)
async def register(req: RegisterReq):
    if not PASSWORD_RE.match(req.password):
        raise HTTPException(status_code=422, detail="Password must be 8+ chars with uppercase, number, special char.")
    existing = await users_col.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": req.email.lower(),
        "full_name": req.full_name or req.email.split("@")[0],
        "password_hash": hash_password(req.password),
        "avatar_file_id": None,
        "language": "en",
        "created_at": _now_iso(),
        "is_active": True,
        "failed_attempts": 0,
        "locked_until": None,
    }
    await users_col.insert_one(doc)
    access = create_access_token(user_id)
    refresh = create_refresh_token()
    await store_refresh_token(user_id, refresh)
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "user": _clean(doc)}


@api.post("/auth/login", response_model=TokenResp)
async def login(req: LoginReq):
    user = await users_col.find_one({"email": req.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Lockout check
    locked = user.get("locked_until")
    if locked:
        try:
            if datetime.fromisoformat(locked) > datetime.now(timezone.utc):
                raise HTTPException(status_code=423, detail="Account temporarily locked. Try again later.")
        except ValueError:
            pass
    if not verify_password(req.password, user["password_hash"]):
        attempts = (user.get("failed_attempts", 0)) + 1
        update = {"failed_attempts": attempts}
        if attempts >= 5:
            from datetime import timedelta
            update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
            update["failed_attempts"] = 0
        await users_col.update_one({"id": user["id"]}, {"$set": update})
        raise HTTPException(status_code=401, detail="Invalid credentials")
    await users_col.update_one({"id": user["id"]}, {"$set": {"failed_attempts": 0, "locked_until": None}})
    access = create_access_token(user["id"])
    refresh = create_refresh_token()
    await store_refresh_token(user["id"], refresh)
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "user": _clean(user)}


@api.post("/auth/refresh")
async def refresh(req: RefreshReq):
    uid = await get_user_id_from_refresh(req.refresh_token)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    access = create_access_token(uid)
    return {"access_token": access, "token_type": "bearer"}


@api.post("/auth/logout")
async def logout(req: RefreshReq, user=Depends(get_current_user)):
    await revoke_refresh_token(req.refresh_token)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api.put("/auth/profile")
async def update_profile(req: UpdateProfileReq, user=Depends(get_current_user)):
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update:
        update["updated_at"] = _now_iso()
        await users_col.update_one({"id": user["id"]}, {"$set": update})
    fresh = await users_col.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return fresh


# ----------------- Files (uploads) -----------------
@api.post("/files/upload")
async def upload_any(
    file: UploadFile = File(...),
    purpose: str = Form("general"),
    user=Depends(get_current_user),
):
    content = await file.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="FILE_TOO_LARGE")
    ext = Path(file.filename or "").suffix.lower()
    if purpose in ("avatar", "persona_avatar") and ext not in ALLOWED_IMG_EXT:
        raise HTTPException(status_code=415, detail="UNSUPPORTED_FILE_TYPE")
    if purpose == "persona_context" and ext not in ALLOWED_FILE_EXT:
        raise HTTPException(status_code=415, detail="UNSUPPORTED_FILE_TYPE")
    fid = await upload_file(
        content,
        file.filename or "file",
        file.content_type or "application/octet-stream",
        user_id=user["id"],
        purpose=purpose,
    )
    return {"file_id": fid, "filename": file.filename, "content_type": file.content_type, "size": len(content)}


@api.get("/files/{file_id}")
async def get_file(file_id: str):
    try:
        data, fname, ctype = await download_file(file_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return Response(content=data, media_type=ctype)


# ----------------- Personas -----------------
@api.get("/personas/templates")
async def list_templates():
    docs = await personas_col.find({"type": "template"}, {"_id": 0}).to_list(50)
    return docs


@api.get("/personas")
async def list_user_personas(user=Depends(get_current_user)):
    docs = await personas_col.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs


@api.get("/personas/active")
async def active_persona(user=Depends(get_current_user)):
    doc = await personas_col.find_one({"user_id": user["id"], "is_active": True}, {"_id": 0})
    if doc:
        return doc
    # Maybe template is active via user.active_persona_id
    fresh = await users_col.find_one({"id": user["id"]}, {"_id": 0})
    pid = fresh.get("active_persona_id") if fresh else None
    if pid:
        return await personas_col.find_one({"id": pid}, {"_id": 0})
    return None


@api.post("/personas/generate")
async def generate_preview(req: PersonaGenerateReq, user=Depends(get_current_user)):
    try:
        profile = await generate_persona_profile(req.description)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    return profile


@api.post("/personas/from-file")
async def persona_from_file(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    content = await file.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="FILE_TOO_LARGE")
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_FILE_EXT:
        raise HTTPException(status_code=415, detail="UNSUPPORTED_FILE_TYPE")
    try:
        text = extract_text(content, file.filename or "file", file.content_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PARSE_ERROR: {e}")
    if not text.strip():
        raise HTTPException(status_code=400, detail="PARSE_EMPTY")
    fid = await upload_file(content, file.filename or "file", file.content_type or "application/octet-stream", user_id=user["id"], purpose="persona_context")
    try:
        profile = await generate_persona_profile(text[:4000])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    profile["source_file_id"] = fid
    profile["extracted_text_preview"] = text[:600]
    return profile


@api.post("/personas")
async def save_persona(req: PersonaSave, user=Depends(get_current_user)):
    # Enforce limit 5 custom
    count = await personas_col.count_documents({"user_id": user["id"], "type": {"$in": ["custom", "auto"]}})
    if count >= 5:
        raise HTTPException(status_code=400, detail="PERSONA_LIMIT_REACHED")
    persona_id = str(uuid.uuid4())
    doc = {
        "id": persona_id,
        "user_id": user["id"],
        "type": "custom",
        "name": req.name,
        "personality_summary": req.personality_summary,
        "communication_style": req.communication_style,
        "tone_tags": req.tone_tags,
        "system_prompt": req.system_prompt,
        "sample_dialogue": req.sample_dialogue,
        "avatar_file_id": req.avatar_file_id,
        "source_file_id": req.source_file_id,
        "is_active": False,
        "created_at": _now_iso(),
    }
    await personas_col.insert_one(doc)
    # If user uploaded a context file earlier, ingest its text via RAG
    if req.source_file_id:
        try:
            data, fname, ctype = await download_file(req.source_file_id)
            text = extract_text(data, fname, ctype)
            await ingest_document(user_id=user["id"], text=text, source_type="persona_context", source_id=req.source_file_id, persona_id=persona_id)
        except Exception:
            pass
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/personas/{persona_id}")
async def update_persona(persona_id: str, req: PersonaUpdate, user=Depends(get_current_user)):
    p = await personas_col.find_one({"id": persona_id, "user_id": user["id"]})
    if not p:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update:
        update["updated_at"] = _now_iso()
        await personas_col.update_one({"id": persona_id}, {"$set": update})
    return await personas_col.find_one({"id": persona_id}, {"_id": 0})


@api.delete("/personas/{persona_id}")
async def delete_persona(persona_id: str, user=Depends(get_current_user)):
    p = await personas_col.find_one({"id": persona_id, "user_id": user["id"]})
    if not p:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    await personas_col.delete_one({"id": persona_id})
    await purge_for_persona(user["id"], persona_id)
    return {"ok": True}


@api.put("/personas/{persona_id}/activate")
async def activate_persona(persona_id: str, user=Depends(get_current_user)):
    # Allow activating either a template or a user's own persona
    p = await personas_col.find_one({"id": persona_id})
    if not p:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    if p["type"] != "template" and p.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="FORBIDDEN")
    # Deactivate prior
    await personas_col.update_many({"user_id": user["id"], "is_active": True}, {"$set": {"is_active": False}})
    if p["type"] in ("custom", "auto"):
        await personas_col.update_one({"id": persona_id}, {"$set": {"is_active": True}})
    await users_col.update_one({"id": user["id"]}, {"$set": {"active_persona_id": persona_id}})
    return {"ok": True, "persona_id": persona_id}


@api.post("/personas/{persona_id}/accept-auto")
async def accept_auto_persona(persona_id: str, user=Depends(get_current_user)):
    # Used when user accepts an auto-persona draft from a session report
    sess = await sessions_col.find_one({"id": persona_id, "user_id": user["id"]})
    if not sess:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    draft = sess.get("auto_persona_draft")
    if not draft:
        raise HTTPException(status_code=400, detail="NO_DRAFT")
    count = await personas_col.count_documents({"user_id": user["id"], "type": {"$in": ["custom", "auto"]}})
    if count >= 5:
        raise HTTPException(status_code=400, detail="PERSONA_LIMIT_REACHED")
    pid = str(uuid.uuid4())
    doc = {
        "id": pid,
        "user_id": user["id"],
        "type": "auto",
        "name": draft.get("name", "Auto Companion"),
        "personality_summary": draft.get("personality_summary", ""),
        "communication_style": draft.get("communication_style", "casual"),
        "tone_tags": draft.get("tone_tags", []),
        "system_prompt": draft.get("system_prompt_fragment", ""),
        "sample_dialogue": draft.get("sample_dialogue"),
        "is_active": True,
        "created_at": _now_iso(),
    }
    await personas_col.update_many({"user_id": user["id"], "is_active": True}, {"$set": {"is_active": False}})
    await personas_col.insert_one(doc)
    await users_col.update_one({"id": user["id"]}, {"$set": {"active_persona_id": pid}})
    return {k: v for k, v in doc.items() if k != "_id"}


# ----------------- Sessions -----------------
@api.post("/sessions")
async def start_session(req: StartSessionReq, user=Depends(get_current_user)):
    # ensure no other active session
    active = await sessions_col.find_one({"user_id": user["id"], "status": "active"})
    if active:
        await sessions_col.update_one({"id": active["id"]}, {"$set": {"status": "interrupted", "ended_at": _now_iso()}})
    # resolve persona
    persona = None
    persona_id = req.persona_id
    if persona_id:
        p = await personas_col.find_one({"id": persona_id}, {"_id": 0})
        if not p:
            raise HTTPException(status_code=404, detail="PERSONA_NOT_FOUND")
        if p["type"] != "template" and p.get("user_id") != user["id"]:
            raise HTTPException(status_code=403, detail="FORBIDDEN")
        persona = p
    else:
        # try current active
        p = await personas_col.find_one({"user_id": user["id"], "is_active": True}, {"_id": 0})
        if not p:
            fresh = await users_col.find_one({"id": user["id"]}, {"_id": 0})
            if fresh and fresh.get("active_persona_id"):
                p = await personas_col.find_one({"id": fresh["active_persona_id"]}, {"_id": 0})
        persona = p  # may be None for talk-first mode

    session_id = str(uuid.uuid4())
    channel = f"session_{session_id[:8]}"
    agora = build_rtc_token(channel, int(datetime.now().timestamp()) % 100000, 3600)
    doc = {
        "id": session_id,
        "user_id": user["id"],
        "persona_id": persona["id"] if persona else None,
        "persona_snapshot": persona,
        "status": "active",
        "started_at": _now_iso(),
        "ended_at": None,
        "duration_seconds": None,
        "agora_channel": channel,
        "language": req.language or "en",
        "drowsiness_flags": [],
        "engagement_score": None,
        "created_at": _now_iso(),
    }
    await sessions_col.insert_one(doc)
    # Greeting from AI
    greeting = None
    if persona:
        try:
            greeting = await chat_with_persona(
                persona_system_prompt=persona["system_prompt"],
                history=[],
                user_text="(Session just started, greet me warmly in 1 short sentence.)",
                language=req.language or "en",
            )
            await turns_col.insert_one({
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "turn_index": 0,
                "speaker": "ai",
                "content": greeting,
                "timestamp": _now_iso(),
            })
        except Exception as e:
            logger.warning(f"Greeting generation failed: {e}")
    return {
        "session_id": session_id,
        "language": req.language or "en",
        "agora": agora,
        "persona": persona,
        "greeting": greeting,
    }


@api.get("/sessions")
async def list_sessions(user=Depends(get_current_user)):
    docs = await sessions_col.find({"user_id": user["id"]}, {"_id": 0}).sort("started_at", -1).to_list(100)
    return docs


@api.get("/sessions/{session_id}")
async def get_session(session_id: str, user=Depends(get_current_user)):
    s = await sessions_col.find_one({"id": session_id, "user_id": user["id"]}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return s


@api.get("/sessions/{session_id}/turns")
async def get_turns(session_id: str, user=Depends(get_current_user)):
    s = await sessions_col.find_one({"id": session_id, "user_id": user["id"]})
    if not s:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    docs = await turns_col.find({"session_id": session_id}, {"_id": 0}).sort("turn_index", 1).to_list(2000)
    return docs


@api.post("/sessions/{session_id}/turn")
async def add_turn(session_id: str, req: TurnReq, user=Depends(get_current_user)):
    s = await sessions_col.find_one({"id": session_id, "user_id": user["id"]})
    if not s:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    if s["status"] != "active":
        raise HTTPException(status_code=409, detail="SESSION_NOT_ACTIVE")

    persona = s.get("persona_snapshot")
    language = req.language or s.get("language", "en")

    # Drowsiness scoring
    score = compute_drowsiness_score(req.latency_ms, req.silence_seconds, req.speech_energy)
    escalate = score > 70
    danger = score > 90

    # Save user turn
    turn_count = await turns_col.count_documents({"session_id": session_id})
    user_turn = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "turn_index": turn_count,
        "speaker": "user",
        "content": req.text,
        "timestamp": _now_iso(),
        "latency_ms": req.latency_ms,
        "drowsiness_score": score,
    }
    await turns_col.insert_one(user_turn)

    # Retrieve RAG context
    rag_context = []
    try:
        rag_context = await retrieve_context(user["id"], req.text, top_k=5)
    except Exception:
        pass

    # Build history
    prev_turns = await turns_col.find({"session_id": session_id}, {"_id": 0}).sort("turn_index", 1).to_list(50)
    history = [
        {"role": "user" if t["speaker"] == "user" else "assistant", "content": t["content"]}
        for t in prev_turns[:-1]
    ]

    # AI reply
    persona_prompt = persona["system_prompt"] if persona else (
        "You are DrivoAI's default voice companion. Friendly, observant, brief. "
        "Ask gentle questions and keep the driver engaged. Match language EN/ID to the driver."
    )
    if danger:
        suffix = "\n\nDANGER PROTOCOL: The driver is in severe fatigue state. Reply MUST clearly urge them to pull over safely at the next safe spot."
        persona_prompt = persona_prompt + suffix

    try:
        ai_text = await chat_with_persona(
            persona_system_prompt=persona_prompt,
            history=history,
            user_text=req.text,
            language=language,
            rag_context=rag_context,
            drowsiness_escalate=escalate,
        )
    except Exception as e:
        ai_text = ("Maaf, koneksi sedikit lambat. Coba lagi." if language == "id"
                   else "Sorry, my connection is a bit slow. Try again.")
        logger.warning(f"LLM error: {e}")

    ai_turn = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "turn_index": turn_count + 1,
        "speaker": "ai",
        "content": ai_text,
        "timestamp": _now_iso(),
    }
    await turns_col.insert_one(ai_turn)

    # Flag drowsiness
    flags_update = []
    if score > 70:
        flags_update.append({
            "turn_index": turn_count,
            "score": score,
            "severity": "high" if score > 90 else "warning",
            "timestamp": _now_iso(),
        })
    if flags_update:
        await sessions_col.update_one({"id": session_id}, {"$push": {"drowsiness_flags": {"$each": flags_update}}})

    return {
        "ai_reply": ai_text,
        "drowsiness_score": score,
        "severity": "danger" if danger else ("warning" if escalate else "normal"),
        "language": language,
    }


@api.post("/sessions/{session_id}/proactive")
async def trigger_proactive(session_id: str, user=Depends(get_current_user)):
    s = await sessions_col.find_one({"id": session_id, "user_id": user["id"]})
    if not s:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    persona = s.get("persona_snapshot")
    language = s.get("language", "en")
    persona_prompt = persona["system_prompt"] if persona else (
        "You are DrivoAI's default voice companion. Brief and warm."
    )
    # Recent topic = last ai turn content (fallback empty)
    last_ai = await turns_col.find_one({"session_id": session_id, "speaker": "ai"}, sort=[("turn_index", -1)])
    last_topic = (last_ai or {}).get("content", "")[:120]
    try:
        line = await proactive_prompt(persona_prompt, language=language, last_topic=last_topic)
    except Exception:
        line = ("Eh, masih oke? Coba cerita sesuatu." if language == "id" else "Hey, still with me? Tell me something.")
    idx = await turns_col.count_documents({"session_id": session_id})
    await turns_col.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "turn_index": idx,
        "speaker": "ai",
        "content": line,
        "timestamp": _now_iso(),
        "proactive": True,
    })
    return {"ai_reply": line}


@api.put("/sessions/{session_id}/end")
async def end_session(session_id: str, bg: BackgroundTasks, user=Depends(get_current_user)):
    s = await sessions_col.find_one({"id": session_id, "user_id": user["id"]})
    if not s:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    if s["status"] != "active":
        return {"ok": True, "already_ended": True}
    started = datetime.fromisoformat(s["started_at"])
    ended = datetime.now(timezone.utc)
    duration = int((ended - started).total_seconds())
    await sessions_col.update_one(
        {"id": session_id},
        {"$set": {"status": "completed", "ended_at": ended.isoformat(), "duration_seconds": duration}},
    )
    # Schedule analysis in background
    bg.add_task(run_post_session_analysis, session_id)
    return {"ok": True, "duration_seconds": duration}


@api.get("/sessions/{session_id}/report")
async def get_report(session_id: str, user=Depends(get_current_user)):
    s = await sessions_col.find_one({"id": session_id, "user_id": user["id"]}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return {
        "session": s,
        "report": s.get("report"),
        "auto_persona_draft": s.get("auto_persona_draft"),
    }


@api.post("/sessions/{session_id}/run-analysis")
async def run_analysis_now(session_id: str, user=Depends(get_current_user)):
    s = await sessions_col.find_one({"id": session_id, "user_id": user["id"]})
    if not s:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    return await run_post_session_analysis(session_id)


@api.post("/sessions/{session_id}/accept-auto-persona")
async def accept_session_auto_persona(session_id: str, user=Depends(get_current_user)):
    s = await sessions_col.find_one({"id": session_id, "user_id": user["id"]})
    if not s:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
    draft = s.get("auto_persona_draft")
    if not draft:
        raise HTTPException(status_code=400, detail="NO_DRAFT")
    count = await personas_col.count_documents({"user_id": user["id"], "type": {"$in": ["custom", "auto"]}})
    if count >= 5:
        raise HTTPException(status_code=400, detail="PERSONA_LIMIT_REACHED")
    pid = str(uuid.uuid4())
    doc = {
        "id": pid,
        "user_id": user["id"],
        "type": "auto",
        "name": draft.get("name", "Auto Companion"),
        "personality_summary": draft.get("personality_summary", ""),
        "communication_style": draft.get("communication_style", "casual"),
        "tone_tags": draft.get("tone_tags", []),
        "system_prompt": draft.get("system_prompt_fragment", ""),
        "sample_dialogue": draft.get("sample_dialogue"),
        "is_active": True,
        "created_at": _now_iso(),
    }
    await personas_col.update_many({"user_id": user["id"], "is_active": True}, {"$set": {"is_active": False}})
    await personas_col.insert_one(doc)
    await users_col.update_one({"id": user["id"]}, {"$set": {"active_persona_id": pid}})
    return {k: v for k, v in doc.items() if k != "_id"}


# ----------------- Misc -----------------
@api.get("/agora/config")
async def agora_config(user=Depends(get_current_user)):
    return {"app_id": os.environ.get("AGORA_APP_ID")}


@api.get("/")
async def root():
    return {"message": "DrivoAI API ready", "version": "1.0.0"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    await _seed_templates_if_needed()
    logger.info("DrivoAI startup complete \u2014 templates seeded.")


@app.on_event("shutdown")
async def on_shutdown():
    from db import client
    client.close()
