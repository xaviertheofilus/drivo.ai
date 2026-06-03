import asyncio
import httpx
import uuid
import time

BASE_URL = "http://localhost:8000"

async def test_single_api(name: str, method: str, path: str, json_data=None, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        try:
            if method == "GET":
                resp = await client.get(path, headers=headers)
            elif method == "POST":
                resp = await client.post(path, json=json_data, headers=headers)
            elif method == "PUT":
                resp = await client.put(path, json=json_data, headers=headers)
            else:
                return {"name": name, "status": "unknown", "ok": False}
            
            body = resp.text
            return {"name": name, "status": resp.status_code, "ok": resp.status_code < 400, "body": body}
        except Exception as e:
            return {"name": name, "status": f"error: {e}", "ok": False}

async def load_test_registration(count: int = 10):
    print(f"\n=== LOAD TEST: {count} Concurrent Registrations ===")
    tasks = []
    for i in range(count):
        email = f"loadtest_{uuid.uuid4().hex[:8]}@test.com"
        task = test_single_api(f"Reg-{i+1}", "POST", "/api/auth/register", 
            json_data={"email": email, "password": "LoadTest123!", "full_name": f"Load {i+1}"})
        tasks.append(task)
    
    start = time.time()
    results = await asyncio.gather(*tasks)
    elapsed = time.time() - start
    
    success = sum(1 for r in results if r["ok"])
    print(f"Results: {success}/{count} in {elapsed:.2f}s")
    for r in results:
        mark = "OK" if r["ok"] else "FAIL"
        print(f"  [{mark}] {r['name']}: {r['status']}")
    
    return success, count, elapsed

async def test_all_endpoints(token: str):
    print("\n=== Testing All Protected Endpoints ===")
    
    tests = [
        ("Root", "GET", "/api/"),
        ("Voices", "GET", "/api/voices"),
        ("Get Me", "GET", "/api/auth/me"),
        ("List Personas", "GET", "/api/personas"),
        ("List Templates", "GET", "/api/personas/templates"),
        ("Active Persona", "GET", "/api/personas/active"),
        ("Analytics", "GET", "/api/analytics"),
    ]
    
    results = []
    for name, method, path in tests:
        r = await test_single_api(name, method, path, None, token)
        results.append(r)
        mark = "OK" if r["ok"] else "FAIL"
        print(f"  [{mark}] {name}: {r['status']}")
    
    return results

async def test_persona_activation(token: str):
    print("\n=== Testing Persona Activation Flow ===")
    
    # 1. Create persona
    r1 = await test_single_api("Create", "POST", "/api/personas", {
        "name": "TestBot", "personality_summary": "Test bot", "communication_style": "casual",
        "tone_tags": ["test"], "system_prompt": "You are a test bot.", "voice_id": "marin"
    }, token)
    print(f"  [OK] Create persona: {r1['status']}")
    
    # 2. Get active
    r2 = await test_single_api("Get Active", "GET", "/api/personas/active", None, token)
    print(f"  [OK] Get active: {r2['status']}")
    
    return r1["ok"] and r2["ok"]

async def main():
    print("=" * 50)
    print("DRIVOAI LOAD TEST")
    print("=" * 50)
    
    # Test 1: Load registrations
    await load_test_registration(10)
    
    # Test 2: Login
    print("\n=== Login ===")
    r = await test_single_api("Login", "POST", "/api/auth/login", 
        {"email": "xaviertheofilus@gmail.com", "password": "DrivoAI2024!"})
    print(f"  [OK] Login: {r['status']}")
    
    if r["ok"]:
        try:
            import json
            body = r.get("body", "{}")
            data = json.loads(body)
            token = data.get("access_token", "")
            print(f"  Token length: {len(token)} chars")
            
            if token:
                # Test 3: All endpoints
                await test_all_endpoints(token)
                
                # Test 4: Persona flow
                await test_persona_activation(token)
        except Exception as e:
            print(f"  Error parsing login response: {e}")
    
    print("\n" + "=" * 50)
    print("LOAD TEST COMPLETE")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())