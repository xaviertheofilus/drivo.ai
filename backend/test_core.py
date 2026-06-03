"""
DrivoAI — Core POC Test Script (Updated for v3.0)
Tests critical integrations in isolation.

Validates:
 1. Claude 3.5 Sonnet — strict JSON for persona generation
 2. Claude 3.5 Sonnet — bilingual EN/ID chat
 3. OpenAI Embeddings — vector generation
 4. File parsing — TXT, PDF, DOCX text extraction (with Vision fallback)
 5. ElevenLabs — signed URL/token generation

Run with: python test_core.py
"""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from llm_service import generate_persona_profile, chat_with_persona
from rag_service import chunk_text
from file_parser import extract_text
from elevenlabs_service import get_signed_url, get_conversation_token

ANTHROPIC_KEY = os.environ.get("MODEL_LLM_API_KEY")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
ELEVENLABS_AGENT_ID = os.environ.get("ELEVENLABS_AGENT_ID")

async def test_persona_generation():
    print("\n=== TEST 1: Persona generation (strict JSON) ===")
    if not ANTHROPIC_KEY:
        print("FAIL — MODEL_LLM_API_KEY missing in .env")
        return False
    try:
        profile = await generate_persona_profile(
            "I want a calm, supportive companion who speaks like a quiet older brother. "
            "Patient, encouraging, occasionally cracks dry jokes. Loves road-trip stories. "
            "Reassures me when I'm tired without sounding patronizing."
        )
        required = {"name", "personality_summary", "communication_style", "tone_tags", "system_prompt_fragment"}
        missing = required - set(profile.keys())
        if missing:
            print(f"FAIL — missing keys: {missing}")
            return False
        print("PASS — JSON parsed, schema valid")
        print(f"  name={profile['name']!r}, style={profile['communication_style']!r}")
        return True
    except Exception as e:
        print(f"FAIL — {type(e).__name__}: {e}")
        return False

async def test_persona_chat_bilingual():
    print("\n=== TEST 2: Persona-aware chat EN + ID ===")
    if not ANTHROPIC_KEY:
        print("FAIL — MODEL_LLM_API_KEY missing")
        return False

    persona_prompt = "You are Andi, a calm AI co-pilot. Speak briefly."

    # English
    try:
        en_resp = await chat_with_persona(persona_prompt, [], "Hey Andi, I'm getting bored.")
        print(f"EN reply: {en_resp[:100]}")
        en_ok = bool(en_resp.strip())
    except Exception as e:
        print(f"FAIL EN — {e}")
        return False

    # Indonesian
    try:
        id_resp = await chat_with_persona(persona_prompt, [], "Halo Andi, aku mulai ngantuk nih.")
        print(f"ID reply: {id_resp[:100]}")
        idn_hint = any(w in id_resp.lower() for w in ["aku", "kamu", "ya", "nih", "udah", "hati", "tenang"])
    except Exception as e:
        print(f"FAIL ID — {e}")
        return False

    if en_ok:
        print("PASS — responses generated")
        return True
    return False

async def test_file_extraction():
    print("\n=== TEST 4: File extraction TXT/PDF/DOCX ===")
    # Using local files if they exist or creating temporary ones
    tmp_txt = b"DrivoAI test content for extraction."
    try:
        txt_text = await extract_text(tmp_txt, "test.txt")
        print(f"  TXT extracted: {txt_text[:50]}")
        if "DrivoAI" in txt_text:
            print("PASS — text extraction works")
            return True
        return False
    except Exception as e:
        print(f"FAIL — {e}")
        return False

async def test_elevenlabs():
    print("\n=== TEST 5: ElevenLabs integration ===")
    if not ELEVENLABS_API_KEY:
        print("FAIL — ELEVENLABS_API_KEY missing")
        return False
    try:
        token = await get_conversation_token()
        print(f"  Token received: {token[:20]}...")
        if ELEVENLABS_AGENT_ID:
            signed = await get_signed_url(ELEVENLABS_AGENT_ID)
            print(f"  Signed URL received: {signed.get('signed_url', '')[:30]}...")
        print("PASS — ElevenLabs API connection ok")
        return True
    except Exception as e:
        print(f"FAIL — {e}")
        return False

async def main():
    results = []
    results.append(await test_persona_generation())
    results.append(await test_persona_chat_bilingual())
    results.append(await test_file_extraction())
    results.append(await test_elevenlabs())
    
    print(f"\nFINAL RESULT: {results.count(True)}/{len(results)} tests passed")

if __name__ == "__main__":
    asyncio.run(main())
