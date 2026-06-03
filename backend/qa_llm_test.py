"""
DrivoAI QA Test - LLM, Session Turns, Persona Activation
"""
import asyncio
import httpx
import uuid
import json
import time

BASE_URL = "http://localhost:8000"

async def test_api(name, method, path, json_data=None, token=None, timeout=60.0):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    start = time.time()
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=timeout) as client:
        try:
            if method == "GET":
                resp = await client.get(path, headers=headers)
            elif method == "POST":
                resp = await client.post(path, json=json_data, headers=headers)
            elif method == "PUT":
                resp = await client.put(path, json=json_data, headers=headers)
            body = resp.text
            return {"name": name, "status": resp.status_code, "ok": resp.status_code < 400,
                    "latency": round((time.time() - start) * 1000, 0), "body": body}
        except Exception as e:
            return {"name": name, "status": "ERROR", "ok": False, "latency": 999999, "error": str(e)}

async def main():
    print("="*60)
    print("DRIVOAI LLM & PERSONA ACTIVATION TEST")
    print("="*60)
    
    # Login
    print("\n[1] Login")
    r = await test_api("Login", "POST", "/api/auth/login", 
        {"email": "xaviertheofilus@gmail.com", "password": "DrivoAI2024!"})
    print(f"    Status: {r['status']}, Latency: {r['latency']}ms")
    
    if not r["ok"]:
        print("FAILED: Login error")
        return
    
    try:
        token = json.loads(r["body"])["access_token"]
        print(f"    Token: {token[:30]}...")
    except Exception as e:
        print(f"JSON Error: {e}")
        return
    
    # Create Persona
    print("\n[2] Create Persona")
    r2 = await test_api("Create Persona", "POST", "/api/personas", {
        "name": "Test Bot QA",
        "personality_summary": "A friendly test bot for QA testing",
        "communication_style": "casual",
        "tone_tags": ["test", "friendly"],
        "system_prompt": "You are a friendly test bot.",
        "sample_dialogue": None,
        "voice_id": "marin"
    }, token, timeout=90.0)
    print(f"    Status: {r2['status']}, Latency: {r2['latency']}ms")
    if r2["ok"]:
        print("    SUCCESS: Persona created")
    else:
        print(f"    FAILED: {r2['body'][:200]}")
        return
    
    # Activate Persona
    print("\n[3] Activate Persona")
    # Get persona ID from create response
    try:
        persona_data = json.loads(r2["body"])
        persona_id = persona_data.get("id")
        print(f"    Persona ID: {persona_id}")
    except:
        print("    Cannot parse persona ID")
        return
    
    r3 = await test_api("Activate", "PUT", f"/api/personas/{persona_id}/activate", None, token)
    print(f"    Status: {r3['status']}, Latency: {r3['latency']}ms")
    
    if r3["ok"]:
        print("    SUCCESS: Persona activated")
    else:
        print(f"    FAILED: {r3['body'][:200]}")
    
    # Get Active Persona
    print("\n[4] Get Active Persona")
    r4 = await test_api("Get Active", "GET", "/api/personas/active", None, token)
    print(f"    Status: {r4['status']}, Latency: {r4['latency']}ms")
    if r4["ok"]:
        active = json.loads(r4["body"])
        print(f"    Active Persona: {active.get('name', 'N/A')} (ID: {active.get('id', 'N/A')})")
    
    # Start Session
    print("\n[5] Start Session")
    r5 = await test_api("Start Session", "POST", "/api/sessions", {"persona_id": None}, token)
    print(f"    Status: {r5['status']}, Latency: {r5['latency']}ms")
    
    if not r5["ok"]:
        print(f"    FAILED: {r5['body'][:200]}")
        return
    
    try:
        session_data = json.loads(r5["body"])
        session_id = session_data.get("session_id")
        print(f"    Session ID: {session_id}")
    except:
        print("    Cannot parse session ID")
        return
    
    # Send Chat Turn (LLM Test)
    print("\n[6] Send Chat Turn (LLM Test)")
    r6 = await test_api("Turn 1", "POST", f"/api/sessions/{session_id}/turn", {
        "text": "Halo, apa kabar?",
        "language": "id",
        "latency_ms": 150,
        "silence_seconds": 0.5,
        "speech_energy": 0.5
    }, token, timeout=120.0)
    print(f"    Status: {r6['status']}, Latency: {r6['latency']}ms")
    
    if r6["ok"]:
        try:
            turn_data = json.loads(r6["body"])
            ai_reply = turn_data.get("ai_reply", "")
            score = turn_data.get("drowsiness_score", 0)
            groundedness = turn_data.get("groundedness", 0)
            print(f"    AI Reply: {ai_reply[:100]}...")
            print(f"    Drowsiness: {score}, Groundedness: {groundedness}")
            print("    SUCCESS: LLM chat works!")
        except Exception as e:
            print(f"    Parse error: {e}")
    else:
        print(f"    FAILED: {r6['body'][:200]}")
    
    # Send more turns
    print("\n[7] Send More Chat Turns")
    messages = [
        "Ceritakan tentang driving safety",
        "Apa tips untuk perjalanan jauh?",
        "Bagaimana cara mengurangi fatigue?"
    ]
    
    for i, msg in enumerate(messages):
        r = await test_api(f"Turn {i+2}", "POST", f"/api/sessions/{session_id}/turn", {
            "text": msg,
            "language": "id",
            "latency_ms": 0,
            "silence_seconds": 0,
            "speech_energy": 0.5
        }, token, timeout=120.0)
        print(f"    Turn {i+2}: {msg[:30]}... Status: {r['status']}, Latency: {r['latency']}ms")
        if r["ok"]:
            try:
                data = json.loads(r["body"])
                print(f"    Reply: {data.get('ai_reply', '')[:80]}...")
            except:
                pass
    
    print("\n" + "="*60)
    print("LLM & PERSONA ACTIVATION TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())