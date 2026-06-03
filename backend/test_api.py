import requests
import json

BASE_URL = "http://localhost:8000"

def test_api():
    print("=== Testing DrivoAI API ===\n")
    
    # Test 1: Voices endpoint
    print("[1] Testing /api/voices...")
    try:
        resp = requests.get(f"{BASE_URL}/api/voices")
        if resp.status_code == 200:
            voices = resp.json()
            print(f"    SUCCESS: {len(voices)} voices returned")
            for v in voices[:3]:
                print(f"      - {v['key']}: {v['name']} ({v['tone']})")
            print(f"      ... and {len(voices)-3} more")
        else:
            print(f"    FAILED: {resp.status_code}")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    # Test 2: Login endpoint
    print("\n[2] Testing /api/auth/login...")
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "xaviertheofilus@gmail.com",
            "password": "DrivoAI2024!"
        })
        if resp.status_code == 200:
            data = resp.json()
            print(f"    SUCCESS: Login works!")
            print(f"    User: {data['user']['email']}")
            token = data['access_token']
            print(f"    Token: {token[:30]}...")
        else:
            print(f"    FAILED: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    # Test 3: Protected endpoint (analytics)
    print("\n[3] Testing /api/analytics (protected)...")
    try:
        resp = requests.get(f"{BASE_URL}/api/analytics")
        if resp.status_code == 401:
            print(f"    EXPECTED: Needs auth (401)")
        else:
            print(f"    Response: {resp.status_code}")
    except Exception as e:
        print(f"    ERROR: {e}")

if __name__ == "__main__":
    test_api()