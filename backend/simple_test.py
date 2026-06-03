"""
DrivoAI Simple Debug Test
"""
import asyncio
import httpx
import json

async def test():
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=30.0) as client:
        # Test root
        r = await client.get("/api/")
        print(f"Root: {r.status_code} - {r.text}")
        
        # Login
        r = await client.post("/api/auth/login", json={"email": "xaviertheofilus@gmail.com", "password": "DrivoAI2024!"})
        print(f"Login: {r.status_code}")
        if r.status_code != 200:
            print(f"Login failed: {r.text}")
            return
        token = json.loads(r.text)["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test personas
        r = await client.get("/api/personas", headers=headers)
        print(f"Personas: {r.status_code}")
        
        # Test personas/active
        r = await client.get("/api/personas/active", headers=headers)
        print(f"Active: {r.status_code} - {r.text[:200]}")
        
        # Start session
        r = await client.post("/api/sessions", json={}, headers=headers)
        print(f"Start Session: {r.status_code}")
        if r.status_code != 200:
            print(f"Session failed: {r.text}")
            return
        session_id = json.loads(r.text)["session_id"]
        print(f"Session ID: {session_id}")
        
        # Test session turns with a basic request
        print("\nTesting turn endpoint...")
        
        # Try simple text turn
        turn_data = {
            "text": "Halo",
            "language": "id",
            "latency_ms": 0,
            "silence_seconds": 0,
            "speech_energy": 0.5
        }
        
        # Print the actual URL being called
        url = f"/api/sessions/{session_id}/turn"
        print(f"Calling: {url}")
        
        r = await client.post(url, json=turn_data, headers=headers)
        print(f"Turn Status: {r.status_code}")
        print(f"Turn Body: {r.text}")

if __name__ == "__main__":
    asyncio.run(test())