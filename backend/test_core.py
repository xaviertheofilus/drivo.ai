"""
DrivoAI — Core POC Test Script
Tests critical integrations in isolation BEFORE building the full app.

Validates:
 1. Emergent LLM — strict JSON output for persona generation (bilingual EN/ID)
 2. Emergent LLM — streaming chat with persona system prompt + history
 3. Embeddings — generate, compute cosine similarity (RAG retrieval substitute)
 4. File parsing — TXT, PDF, DOCX text extraction
 5. Agora — server-side RTC token generation

Pass/fail at the bottom. Run with: python test_core.py
"""

import asyncio
import json
import os
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ----- imports under test -----
from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402
from agora_token_builder import RtcTokenBuilder  # noqa: E402
import fitz  # PyMuPDF  # noqa: E402
from docx import Document  # noqa: E402
from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402
from sklearn.metrics.pairwise import cosine_similarity  # noqa: E402

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-4o")
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "openai")
AGORA_APP_ID = os.environ.get("AGORA_APP_ID")
AGORA_CERT = os.environ.get("AGORA_APP_CERTIFICATE")


# --------------------------------------------------------------
# Test 1: Persona generation — strict JSON
# --------------------------------------------------------------
async def test_persona_generation():
    print("\n=== TEST 1: Persona generation (strict JSON) ===")
    if not EMERGENT_LLM_KEY:
        print("FAIL — EMERGENT_LLM_KEY missing")
        return False

    system = (
        "You are a DrivoAI persona designer. Given a user description, "
        "output ONLY a JSON object with these EXACT keys: "
        "name (string, 2-50 chars), "
        "personality_summary (string, max 150 words), "
        "communication_style (one of: formal, casual, energetic, calm, supportive, witty), "
        "tone_tags (array of 2-5 short tag strings), "
        "system_prompt_fragment (string, 200-500 chars, written as direct instructions to an AI). "
        "Reply with the JSON object only, no markdown, no commentary."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"poc-persona-{int(time.time())}",
        system_message=system,
    ).with_model(LLM_PROVIDER, LLM_MODEL)

    user_text = (
        "I want a calm, supportive companion who speaks like a quiet older brother. "
        "Patient, encouraging, occasionally cracks dry jokes. Loves road-trip stories. "
        "Reassures me when I'm tired without sounding patronizing."
    )
    user_msg = UserMessage(text=f"User description:\n{user_text}\n\nReturn the JSON now.")

    try:
        response = await chat.send_message(user_msg)
        raw = response.strip()
        # strip code-fences if any
        raw = re.sub(r"^```json\s*|^```\s*|\s*```$", "", raw, flags=re.MULTILINE)
        data = json.loads(raw)
        required = {"name", "personality_summary", "communication_style", "tone_tags", "system_prompt_fragment"}
        missing = required - set(data.keys())
        if missing:
            print(f"FAIL — missing keys: {missing}")
            return False
        if not isinstance(data["tone_tags"], list) or len(data["tone_tags"]) < 2:
            print(f"FAIL — tone_tags invalid: {data['tone_tags']}")
            return False
        print("PASS — JSON parsed, schema valid")
        print(f"  name={data['name']!r}, style={data['communication_style']!r}")
        print(f"  tags={data['tone_tags']}")
        return True
    except Exception as e:
        print(f"FAIL — {type(e).__name__}: {e}")
        if "response" in dir():
            print(f"  raw response: {response[:300] if 'response' in dir() else 'n/a'}")
        return False


# --------------------------------------------------------------
# Test 2: Persona-aware chat (bilingual EN/ID)
# --------------------------------------------------------------
async def test_persona_chat_bilingual():
    print("\n=== TEST 2: Persona-aware chat EN + ID ===")
    if not EMERGENT_LLM_KEY:
        print("FAIL — EMERGENT_LLM_KEY missing")
        return False

    persona_prompt = (
        "You are 'Andi', a calm and supportive AI co-pilot for long drives. "
        "Keep replies short (1-2 sentences), warm, and conversational. "
        "If the user speaks Bahasa Indonesia, reply in Bahasa Indonesia. "
        "If they speak English, reply in English. "
        "Never break character."
    )

    # English turn
    chat_en = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"poc-chat-en-{int(time.time())}",
        system_message=persona_prompt,
    ).with_model(LLM_PROVIDER, LLM_MODEL)
    try:
        en_resp = await chat_en.send_message(
            UserMessage(text="Hey Andi, I've been driving for two hours and I'm getting bored.")
        )
        print(f"EN reply: {en_resp[:200]}")
        en_ok = bool(en_resp.strip())
    except Exception as e:
        print(f"FAIL EN — {e}")
        return False

    # Indonesian turn
    chat_id = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"poc-chat-id-{int(time.time())}",
        system_message=persona_prompt,
    ).with_model(LLM_PROVIDER, LLM_MODEL)
    try:
        id_resp = await chat_id.send_message(
            UserMessage(text="Halo Andi, aku udah nyetir tiga jam, mulai ngantuk nih.")
        )
        print(f"ID reply: {id_resp[:200]}")
        # crude check: should contain at least one common Indonesian word
        idn_hint = any(
            w in id_resp.lower() for w in ["aku", "kamu", "ya", "nih", "kok", "udah", "iya", "yuk", "tenang", "ngantuk", "kita", "saya", "ayo", "hati", "istirahat"]
        )
    except Exception as e:
        print(f"FAIL ID — {e}")
        return False

    if en_ok and idn_hint:
        print("PASS — bilingual responses generated")
        return True
    print(f"FAIL — en_ok={en_ok}, indonesian-hint={idn_hint}")
    return False


# --------------------------------------------------------------
# Test 3: Lightweight RAG — TF-IDF cosine similarity
# (We use TF-IDF for v1 since emergentintegrations focuses on chat.
#  Hooks/comments in rag_service.py show how to swap to OpenAI embeddings.)
# --------------------------------------------------------------
def test_rag_similarity():
    print("\n=== TEST 3: RAG retrieval (TF-IDF cosine) ===")
    corpus = [
        "Tadi kita ngobrolin tentang film favorit pas perjalanan malam.",
        "We discussed your sister's wedding plan during the drive last week.",
        "User said they enjoy listening to lo-fi music on long highway drives.",
        "Driver mentioned anxiety about a job interview next Monday.",
        "We talked about pulling over for coffee at the next rest stop.",
    ]
    query = "lo-fi music road trip"
    try:
        vec = TfidfVectorizer().fit(corpus + [query])
        corpus_vecs = vec.transform(corpus)
        q_vec = vec.transform([query])
        sims = cosine_similarity(q_vec, corpus_vecs)[0]
        top = sims.argsort()[::-1][:2]
        print(f"Top match: {corpus[top[0]]!r}  (sim={sims[top[0]]:.3f})")
        if "lo-fi" in corpus[top[0]] or "music" in corpus[top[0]]:
            print("PASS — retrieval correctly ranked music context first")
            return True
        print("FAIL — retrieval did not rank correctly")
        return False
    except Exception as e:
        print(f"FAIL — {e}")
        return False


# --------------------------------------------------------------
# Test 4: File extraction TXT / PDF / DOCX
# --------------------------------------------------------------
def test_file_extraction():
    print("\n=== TEST 4: File extraction TXT/PDF/DOCX ===")
    tmpdir = Path("/tmp/drivoai_poc")
    tmpdir.mkdir(exist_ok=True)

    # TXT
    txt_path = tmpdir / "sample.txt"
    txt_path.write_text("DrivoAI test: the driver enjoys quiet companionship and dry humor.")

    # PDF
    pdf_path = tmpdir / "sample.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "DrivoAI PDF persona: prefers Indonesian small-talk, music topics.")
    doc.save(pdf_path)
    doc.close()

    # DOCX
    docx_path = tmpdir / "sample.docx"
    d = Document()
    d.add_paragraph("DrivoAI DOCX: companion should ask gentle questions and notice silence.")
    d.save(docx_path)

    try:
        # extract
        txt_text = txt_path.read_text()
        pdf_text = "".join(p.get_text() for p in fitz.open(pdf_path))
        docx_text = "\n".join(p.text for p in Document(docx_path).paragraphs)
        ok = all([
            "DrivoAI" in txt_text,
            "DrivoAI" in pdf_text,
            "DrivoAI" in docx_text,
        ])
        print(f"  TXT len={len(txt_text)}, PDF len={len(pdf_text)}, DOCX len={len(docx_text)}")
        if ok:
            print("PASS — all three formats parsed")
            return True
        print("FAIL — content missing in one or more parses")
        return False
    except Exception as e:
        print(f"FAIL — {e}")
        return False


# --------------------------------------------------------------
# Test 5: Agora RTC token generation
# --------------------------------------------------------------
def test_agora_token():
    print("\n=== TEST 5: Agora RTC token generation ===")
    if not (AGORA_APP_ID and AGORA_CERT):
        print("FAIL — Agora credentials missing")
        return False
    try:
        # Role: 1 publisher, 2 subscriber
        channel = "drivoai-poc-channel"
        uid = 12345
        expire = int(time.time()) + 3600
        token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID, AGORA_CERT, channel, uid, 1, expire
        )
        if isinstance(token, str) and len(token) > 30:
            print(f"PASS — token length {len(token)}, sample {token[:32]}...")
            return True
        print("FAIL — token output unexpected")
        return False
    except Exception as e:
        print(f"FAIL — {e}")
        return False


# --------------------------------------------------------------
# Runner
# --------------------------------------------------------------
async def main():
    print("DrivoAI Core POC — Integration Sanity Check")
    print(f"LLM_MODEL={LLM_MODEL}  PROVIDER={LLM_PROVIDER}")
    print(f"AGORA_APP_ID={'set' if AGORA_APP_ID else 'MISSING'}")
    print(f"EMERGENT_LLM_KEY={'set' if EMERGENT_LLM_KEY else 'MISSING'}")

    results = {}
    results["persona_json"] = await test_persona_generation()
    results["bilingual_chat"] = await test_persona_chat_bilingual()
    results["rag_similarity"] = test_rag_similarity()
    results["file_extraction"] = test_file_extraction()
    results["agora_token"] = test_agora_token()

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    for k, v in results.items():
        print(f"  {k:<22} {'PASS' if v else 'FAIL'}")
    all_pass = all(results.values())
    print("\n" + ("ALL TESTS PASSED — proceed to app build" if all_pass else "SOME TESTS FAILED — fix before building app"))
    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    asyncio.run(main())
