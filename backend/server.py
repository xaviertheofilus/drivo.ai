"""DrivoAI FastAPI server — all endpoints under /api. Supabase backend."""
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

import db as db_module
from auth_service import (
    create_access_token,
    get_current_user,
    get_current_user_optional,
    login_user,
    logout_user,
    refresh_access_token,
    register_user,
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
from openai_voice_service import (
    get_voice_options,
    build_voice_config,
    text_to_speech,
    transcribe_audio,
    transcribe_with_diarization,
    get_voice_for_persona,
)
from storage_service import delete_file, download_file, upload_file as _upload_file
from analysis_service import compute_drowsiness_score, run_post_session_analysis, get_dashboard_data
from templates_data import TEMPLATE_PERSONAS

logger = logging.getLogger("drivoai")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(title="DrivoAI API", version="3.0.0")
api = APIRouter(prefix="/api")

# Rate limiting for concurrent users
MAX_CONCURRENT_REQUESTS = 100
request_semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

PASSWORD_RE = re.compile(r"^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")
ALLOWED_FILE_EXT = {".txt", ".pdf", ".docx"}
ALLOWED_IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
MAX_FILE_BYTES = 10 * 1024 * 1024

# ── Schemas ─────────────────────────────────────────────────────

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

class PersonaGenerateReq(BaseModel):
    description: str = Field(..., min_length=10, max_length=4000)

class PersonaFromUploadedReq(BaseModel):
    file_id: str
    description: str = ""

class PersonaSave(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    personality_summary: str
    communication_style: str
    tone_tags: List[str] = []
    system_prompt: str
    sample_dialogue: Optional[dict] = None
    source_text: Optional[str] = None
    avatar_file_id: Optional[str] = None
    source_file_id: Optional[str] = None
    voice_id: Optional[str] = None

class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    personality_summary: Optional[str] = None
    communication_style: Optional[str] = None
    tone_tags: Optional[List[str]] = None
    system_prompt: Optional[str] = None
    sample_dialogue: Optional[dict] = None
    avatar_file_id: Optional[str] = None
    voice_id: Optional[str] = None

class StartSessionReq(BaseModel):
    persona_id: Optional[str] = None
    language: str = "en"

class TurnReq(BaseModel):
    text: str
    language: str = "en"
    latency_ms: int = 0
    silence_seconds: float = 0
    speech_energy: float = 0.5

class UpdateProfileReq(BaseModel):
    full_name: Optional[str] = None
    language: Optional[str] = None

class ElevenLabsSessionReq(BaseModel):
    agent_id: Optional[str] = None

class TranscribeReq(BaseModel):
    model: str = Field(default_factory=lambda: os.environ.get("OPENAI_STT_MODEL", "whisper-1"))
    language: str = "id"

class TTSSpeakReq(BaseModel):
    text: str
    voice: str = "marin"
    model: str = Field(default_factory=lambda: os.environ.get("OPENAI_TTS_MODEL", "tts-1"))

# ── Helpers ──────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _word_count(text: str) -> int:
    return len([w for w in re.split(r"\s+", (text or "").strip()) if w])

def _detect_language(text: str) -> str:
    t = (text or "").lower()
    id_hits = 0
    for w in (" saya ", " aku ", " kamu ", " kita ", " kalian ", " nggak ", " ga ", " tidak ", " banget ", " gimana "):
        if w.strip() in t: id_hits += 1
    return "id" if id_hits >= 2 else "en"

async def _seed_templates_if_needed():
    existing = await db_module.list_templates()
    if len(existing) >= len(TEMPLATE_PERSONAS):
        return
    for t in TEMPLATE_PERSONAS:
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": None,
            "type": "template",
            "name": t["name"],
            "personality_summary": t["personality_summary"],
            "communication_style": t["communication_style"],
            "tone_tags": t["tone_tags"],
            "system_prompt": t["system_prompt"],
            "sample_dialogue": t["sample_dialogue"],
            "created_at": _now_iso(),
            "updated_at": _now_iso()
        }
        await db_module.create_persona(doc)

# ── Endpoints ───────────────────────────────────────────────────

@api.get("/analytics")
async def get_analytics(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    return await get_dashboard_data(start_date, end_date)

@api.get("/voices")
async def list_voices():
    return get_voice_options()

@api.post("/voice/transcribe")
async def transcribe(req: TranscribeReq, file: UploadFile = File(...), user=Depends(get_current_user)):
    import time
    content = await file.read()
    t0 = time.perf_counter()
    transcript = await transcribe_audio(content, model=req.model, language=req.language)
    latency_ms = int((time.perf_counter() - t0) * 1000)
    try:
        await db_module.save_analytics("voice-transcribe", {
            "total_query": 0,
            "llm_query": 0,
            "stt_calls": 1,
            "tts_calls": 0,
            "stt_latency": latency_ms,
            "tts_latency": 0,
            "response_time": 0,
            "groundedness": 0,
            "cost_idr": 0,
            "cost_llm_idr": 0,
            "cost_stt_idr": 0,
            "cost_tts_idr": 0,
            "status": "ok",
        })
    except Exception as _:
        pass
    return {"text": transcript, "model": req.model, "latency_ms": latency_ms}

@api.post("/voice/speak")
async def speak(req: TTSSpeakReq, user=Depends(get_current_user)):
    import time
    t0 = time.perf_counter()
    audio_data = await text_to_speech(req.text, voice=req.voice, model=req.model)
    latency_ms = int((time.perf_counter() - t0) * 1000)
    try:
        await db_module.save_analytics("voice-speak", {
            "total_query": 0,
            "llm_query": 0,
            "stt_calls": 0,
            "tts_calls": 1,
            "stt_latency": 0,
            "tts_latency": latency_ms,
            "response_time": 0,
            "groundedness": 0,
            "cost_idr": 0,
            "cost_llm_idr": 0,
            "cost_stt_idr": 0,
            "cost_tts_idr": 0,
            "status": "ok",
        })
    except Exception as _:
        pass
    return Response(content=audio_data, media_type="audio/mp3")

@api.post("/auth/register", response_model=TokenResp)
async def register(req: RegisterReq):
    if not PASSWORD_RE.match(req.password):
        raise HTTPException(status_code=422, detail="Password too weak.")
    result = await register_user(req.email, req.password, req.full_name or "")
    return TokenResp(**result)

@api.post("/auth/login", response_model=TokenResp)
async def login(req: LoginReq):
    result = await login_user(req.email, req.password)
    return TokenResp(**result)

@api.post("/auth/refresh")
async def refresh(req: RefreshReq):
    token = await refresh_access_token(req.refresh_token)
    return {"access_token": token, "token_type": "bearer"}

@api.post("/auth/logout")
async def logout(req: RefreshReq, user=Depends(get_current_user)):
    await logout_user(user["id"], req.refresh_token)
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

@api.put("/auth/profile")
async def update_profile(req: UpdateProfileReq, user=Depends(get_current_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if updates: await db_module.update_user(user["id"], updates)
    return await db_module.get_user_by_id(user["id"])

@api.post("/files/upload")
async def upload_file(file: UploadFile = File(...), purpose: str = Form("general"), user=Depends(get_current_user)):
    content = await file.read()
    if len(content) > MAX_FILE_BYTES: raise HTTPException(status_code=413, detail="FILE_TOO_LARGE")
    fid = await _upload_file(content, file.filename or "file", file.content_type, user_id=user["id"], purpose=purpose)
    return {"file_id": fid, "filename": file.filename}

@api.get("/files/{file_id}")
async def get_file(file_id: str):
    try:
        data, fname, ctype = await download_file(file_id)
        return Response(content=data, media_type=ctype)
    except FileNotFoundError: raise HTTPException(status_code=404, detail="NOT_FOUND")

@api.get("/personas/templates")
async def list_templates_route(user=Depends(get_current_user_optional)):
    return await db_module.list_templates()

@api.get("/personas")
async def list_user_personas_route(user=Depends(get_current_user)):
    return await db_module.list_user_personas(user["id"])

@api.post("/personas/generate")
async def generate_preview(req: PersonaGenerateReq, user=Depends(get_current_user)):
    if _word_count(req.description) < 15: raise HTTPException(status_code=400, detail="MIN_WORDS_15")
    return await generate_persona_profile(req.description, user_id=user["id"])

@api.post("/personas/from-uploaded")
async def persona_from_uploaded(req: PersonaFromUploadedReq, user=Depends(get_current_user)):
    content, fname, ctype = await download_file(req.file_id)
    text = await extract_text(content, fname, ctype)
    if not text.strip(): raise HTTPException(status_code=400, detail="PARSE_EMPTY")
    profile = await generate_persona_profile(text[:4000], user_id=user["id"])
    return {"profile": profile, "source_text": text[:4000]}

@api.post("/personas")
async def save_persona_route(req: PersonaSave, user=Depends(get_current_user)):
    if await db_module.count_custom_personas(user["id"]) >= 5:
        raise HTTPException(status_code=400, detail="PERSONA_LIMIT_REACHED")
    persona = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": req.name,
        "personality_summary": req.personality_summary,
        "communication_style": req.communication_style,
        "tone_tags": req.tone_tags,
        "system_prompt": req.system_prompt,
        "sample_dialogue": req.sample_dialogue,
        "avatar_url": req.avatar_file_id,
        "voice_id": req.voice_id,
        "created_at": _now_iso(),
        "updated_at": _now_iso()
    }
    await db_module.create_persona(persona)
    if req.source_text:
        await ingest_document(req.source_text, user_id=user["id"], persona_id=persona["id"])
    return persona

@api.put("/personas/{persona_id}")
async def update_persona_route(persona_id: str, req: PersonaUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    await db_module.update_persona(persona_id, user["id"], updates)
    return await db_module.get_persona(user["id"], persona_id)

@api.delete("/personas/{persona_id}")
async def delete_persona_route(persona_id: str, user=Depends(get_current_user)):
    await db_module.delete_persona(user["id"], persona_id)
    await purge_for_persona(user["id"], persona_id)
    return {"ok": True}

@api.put("/personas/{persona_id}/activate")
async def activate_persona_route(persona_id: str, user=Depends(get_current_user)):
    await db_module.deactivate_all_personas(user["id"])
    await db_module.update_persona(persona_id, user["id"], {"is_active": True})
    await db_module.update_user(user["id"], {"active_persona_id": persona_id})
    return {"ok": True}

@api.post("/sessions")
async def start_session_route(req: StartSessionReq, user=Depends(get_current_user)):
    persona = await db_module.get_persona(user["id"], req.persona_id) if req.persona_id else None
    session = await db_module.create_session(user["id"], persona.get("id") if persona else None)
    voice_cfg = build_voice_config(persona or {}, preferred_voice=(persona or {}).get("voice_id"))
    return {"session_id": session["id"], "voice": voice_cfg}

@api.post("/sessions/{session_id}/turn")
async def add_turn_route(session_id: str, req: TurnReq, user=Depends(get_current_user)):
    import time
    logger.info(f"TURN START: session={session_id}")
    
    # Initialize all variables with fallbacks
    score = 0
    ai_text = "Maaf, saya tidak bisa menjawab saat ini."
    llm_latency_ms = 0
    groundedness = 0.0
    
    try:
        try:
            score = compute_drowsiness_score(req.latency_ms, req.silence_seconds, req.speech_energy)
        except Exception as e:
            logger.warning(f"Drowsiness error: {e}")
            score = 0
        
        try:
            context = await retrieve_context(req.text, user_id=user["id"])
        except Exception as e:
            logger.warning(f"RAG error: {e}")
            context = ""
        
        history = []
        t0 = time.perf_counter()
        
        try:
            ai_text = await chat_with_persona(
                system_prompt="You are a helpful driving assistant.",
                history=history,
                user_message=req.text,
                context=context,
                session_id=session_id,
                user_id=user["id"]
            )
        except Exception as e:
            logger.error(f"LLM error: {e}")
            ai_text = "Halo! Ada yang bisa saya bantu?"
        
        llm_latency_ms = int((time.perf_counter() - t0) * 1000)
        
        try:
            await db_module.add_session_turn(session_id, "user", req.text)
            await db_module.add_session_turn(session_id, "ai", ai_text)
        except Exception as e:
            logger.warning(f"DB turn error: {e}")

        try:
            await db_module.save_analytics(session_id, {
                "total_query": 1, "llm_query": 1, "stt_calls": 0, "tts_calls": 0,
                "response_time": llm_latency_ms, "stt_latency": 0, "tts_latency": 0,
                "groundedness": groundedness, "cost_idr": 0, "cost_llm_idr": 0,
                "cost_stt_idr": 0, "cost_tts_idr": 0, "status": "ok",
            })
        except Exception as e:
            logger.warning(f"Analytics error: {e}")

        logger.info(f"TURN SUCCESS")
        
    except Exception as e:
        logger.error(f"TURN CRITICAL ERROR: {e}")
    
    return {"ai_reply": ai_text, "drowsiness_score": score, "latency_ms": llm_latency_ms, "groundedness": groundedness}

@api.get("/")
async def root():
    return {"message": "DrivoAI API ready", "version": "3.0.0"}

@api.get("/personas/active")
async def get_active_persona(user=Depends(get_current_user)):
    try:
        # Check custom personas first
        personas = await db_module.list_user_personas(user["id"])
        for p in personas:
            if p.get("is_active"):
                return p
        
        # Also check templates (they can be activated too)
        templates = await db_module.list_templates()
        for t in templates:
            if t.get("is_active"):
                return t
        
        return {}
    except Exception as e:
        logger.error(f"Error getting active persona: {e}")
        return {}

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def on_startup():
    # Try to ensure tables exist in Supabase
    try:
        await db_module.ensure_tables_exist()
    except Exception as e:
        logger.warning(f"Could not auto-create tables: {e}")
    await _seed_templates_if_needed()
    logger.info("DrivoAI startup complete.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
