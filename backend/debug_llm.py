"""
DrivoAI Debug - Check LLM error details
"""
import asyncio
import httpx
import json
import time

BASE_URL = "http://localhost:8000"

async def test_llm():
    # Login
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=120.0) as client:
        # Login
        r1 = await client.post("/api/auth/login", json={"email": "xaviertheofilus@gmail.com", "password": "DrivoAI2024!"})
        token = json.loads(r1.text)["access_token"]
        
        # Start session
        r2 = await client.post("/api/sessions", json={}, headers={"Authorization": f"Bearer {token}"})
        session_id = json.loads(r2.text)["session_id"]
        
        # Try turn
        print(f"Session ID: {session_id}")
        print("Sending turn...")
        
        r3 = await client.post(
            f"/api/sessions/{session_id}/turn",
            json={
                "text": "Halo",
                "language": "id",
                "latency_ms": 0,
                "silence_seconds": 0,
                "speech_energy": 0.5
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Status: {r3.status_code}")
        print(f"Body: {r3.text}")

if __name__ == "__main__":
    asyncio.run(test_llm())