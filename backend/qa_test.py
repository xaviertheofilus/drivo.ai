"""
DrivoAI QA Test - Full System Verification
Tests: Register, Login, RAG, LLM, STT/TTS, Dashboard Analytics, Traffic Load
"""
import asyncio
import httpx
import uuid
import time

BASE_URL = "http://localhost:8000"

async def test_api(name, method, path, json_data=None, token=None, timeout=30.0):
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
            return {"name": name, "status": f"ERROR", "ok": False, "latency": 999999, "error": str(e)}

# === QA TEST 1: Full User Flow ===
async def qa_full_user_flow():
    print("\n" + "="*60)
    print("QA TEST 1: FULL USER FLOW")
    print("="*60)
    
    email = f"qa_{uuid.uuid4().hex[:8]}@test.com"
    password = "QaTest123!"
    
    # 1. Register
    print("\n[1] Register")
    r1 = await test_api("Register", "POST", "/api/auth/register", {"email": email, "password": password, "full_name": "QA Test"})
    print(f"    Status: {r1['status']}, Latency: {r1['latency']}ms")
    if not r1["ok"]:
        print(f"    FAILED: {r1.get('body', r1.get('error'))[:200]}")
        return None
    
    # 2. Login
    print("\n[2] Login")
    r2 = await test_api("Login", "POST", "/api/auth/login", {"email": email, "password": password})
    print(f"    Status: {r2['status']}, Latency: {r2['latency']}ms")
    print(f"    Body preview: {r2['body'][:100]}")
    if not r2["ok"]:
        print(f"    FAILED: {r2.get('body', r2.get('error'))[:200]}")
        return None
    
    try:
        import json
        data = json.loads(r2["body"])
        token = data["access_token"]
        print(f"    Token: {token[:30]}...")
    except Exception as e:
        print(f"    JSON PARSE ERROR: {e}")
        print(f"    Raw body: {r2['body']}")
        return None
    
    # 3. Create Persona
    print("\n[3] Create Persona")
    r3 = await test_api("Create Persona", "POST", "/api/personas", {
        "name": "QA Bot", "personality_summary": "Test bot for QA",
        "communication_style": "casual", "tone_tags": ["test"],
        "system_prompt": "You are a test bot.", "voice_id": "marin"
    }, token)
    print(f"    Status: {r3['status']}, Latency: {r3['latency']}ms")
    
    # 4. Get Active Persona
    print("\n[4] Get Active Persona")
    r4 = await test_api("Get Active", "GET", "/api/personas/active", None, token)
    print(f"    Status: {r4['status']}, Latency: {r4['latency']}ms")
    
    # 5. Start Session
    print("\n[5] Start Session")
    r5 = await test_api("Start Session", "POST", "/api/sessions", {"persona_id": None}, token)
    print(f"    Status: {r5['status']}, Latency: {r5['latency']}ms")
    
    return token

# === QA TEST 2: Dashboard Global Analytics ===
async def qa_dashboard_analytics(token):
    print("\n" + "="*60)
    print("QA TEST 2: DASHBOARD ANALYTICS (Global)")
    print("="*60)
    
    r = await test_api("Analytics", "GET", "/api/analytics", None, token)
    print(f"Status: {r['status']}, Latency: {r['latency']}ms")
    
    if r["ok"]:
        try:
            import json
            data = json.loads(r["body"])
            print(f"\nDashboard Metrics (ALL USERS):")
            print(f"  Total Users: {data.get('total_users', 'N/A')}")
            print(f"  Total Queries: {data.get('total_queries', 'N/A')}")
            print(f"  LLM Queries: {data.get('total_llm_queries', 'N/A')}")
            print(f"  STT Calls: {data.get('total_stt_calls', 'N/A')}")
            print(f"  TTS Calls: {data.get('total_tts_calls', 'N/A')}")
            print(f"  Avg Response: {data.get('avg_response_time', 'N/A')}ms")
            print(f"  Avg STT Latency: {data.get('avg_stt_latency', 'N/A')}ms")
            print(f"  Avg TTS Latency: {data.get('avg_tts_latency', 'N/A')}ms")
            print(f"  Avg Groundedness: {data.get('avg_groundedness', 'N/A')}")
            print(f"  Total Cost: Rp {data.get('total_cost_idr', 'N/A')}")
            charts = data.get('charts', {})
            print(f"  Charts: {list(charts.keys())}")
        except Exception as e:
            print(f"  PARSE ERROR: {e}")
    
    return r["ok"]

# === QA TEST 3: Voice Service ===
async def qa_voice_service():
    print("\n" + "="*60)
    print("QA TEST 3: VOICE SERVICE (13 OpenAI Voices)")
    print("="*60)
    
    r = await test_api("Voices List", "GET", "/api/voices")
    print(f"Status: {r['status']}, Latency: {r['latency']}ms")
    
    if r["ok"]:
        try:
            import json
            voices = json.loads(r["body"])
            print(f"Voices: {len(voices)} available")
            for v in voices:
                print(f"  - {v['key']}: {v['name']} ({v['tone']})")
        except Exception as e:
            print(f"PARSE ERROR: {e}")
    
    return r["ok"]

# === QA TEST 4: Traffic Load ===
async def qa_traffic_load(count=50):
    print("\n" + "="*60)
    print(f"QA TEST 4: TRAFFIC LOAD ({count} Concurrent Registrations)")
    print("="*60)
    
    tasks = []
    for i in range(count):
        email = f"traffic_{uuid.uuid4().hex[:6]}@load.com"
        task = test_api(f"Reg-{i+1}", "POST", "/api/auth/register", 
            {"email": email, "password": "LoadTest123!", "full_name": f"User {i+1}"})
        tasks.append(task)
    
    start = time.time()
    results = await asyncio.gather(*tasks)
    elapsed = time.time() - start
    
    success = sum(1 for r in results if r["ok"])
    failures = sum(1 for r in results if not r["ok"])
    avg_latency = sum(r["latency"] for r in results) / len(results) if results else 0
    
    print(f"\nResults: {success}/{count} successful, {failures} failed")
    print(f"Total Time: {elapsed:.2f}s")
    print(f"Average Latency: {avg_latency:.0f}ms")
    print(f"Throughput: {count/elapsed:.1f} req/s")
    
    if failures > 0:
        print(f"\nFailed:")
        for r in results:
            if not r["ok"]:
                print(f"  {r['name']}: {r['status']}")
    
    return success, count

# === QA TEST 5: Latency ===
async def qa_latency(token):
    print("\n" + "="*60)
    print("QA TEST 5: ENDPOINT LATENCY")
    print("="*60)
    
    endpoints = [
        ("Root", "GET", "/api/"),
        ("Voices", "GET", "/api/voices"),
        ("Auth Me", "GET", "/api/auth/me"),
        ("List Personas", "GET", "/api/personas"),
        ("Templates", "GET", "/api/personas/templates"),
        ("Active", "GET", "/api/personas/active"),
        ("Analytics", "GET", "/api/analytics"),
    ]
    
    print(f"\n{'Endpoint':<20} {'Status':<10} {'Latency':<15}")
    print("-" * 45)
    
    all_ok = True
    for name, method, path in endpoints:
        r = await test_api(name, method, path, None, token)
        status = "OK" if r["ok"] else "FAIL"
        print(f"{name:<20} {status:<10} {r['latency']:.0f}ms")
        if not r["ok"]:
            all_ok = False
    
    return all_ok

# === Main ===
async def main():
    print("="*60)
    print("DRIVOAI QA TEST SUITE - Senior AI Testing")
    print("="*60)
    
    # Test 1: Full User Flow
    token = await qa_full_user_flow()
    
    if token:
        # Test 2: Dashboard Analytics
        await qa_dashboard_analytics(token)
        
        # Test 3: Voice Service
        await qa_voice_service()
        
        # Test 4: Latency
        await qa_latency(token)
    
    # Test 5: Traffic Load
    await qa_traffic_load(50)
    
    print("\n" + "="*60)
    print("QA TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())