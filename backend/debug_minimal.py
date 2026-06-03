"""
Ultra minimal debug - isolate exact crash point
"""
import asyncio
import httpx
import json

async def debug_turn():
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=30.0) as client:
        # Login
        r = await client.post("/api/auth/login", json={"email": "xaviertheofilus@gmail.com", "password": "DrivoAI2024!"})
        print(f"Login: {r.status_code}")
        token = json.loads(r.text)["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Start session
        r = await client.post("/api/sessions", json={}, headers=headers)
        print(f"Start Session: {r.status_code}")
        session_id = json.loads(r.text)["session_id"]
        print(f"Session ID: {session_id}")
        
        # Test each step individually
        print("\n--- Testing turn parts ---")
        
        # Step 1: Test RAG context
        print("\n[1] Testing RAG...")
        try:
            from rag_service import retrieve_context
            ctx = await retrieve_context("Hello", user_id="test")
            print(f"RAG OK: {len(ctx)} chars")
        except Exception as e:
            print(f"RAG FAIL: {e}")
        
        # Step 2: Test LLM
        print("\n[2] Testing LLM...")
        try:
            from llm_service import chat_with_persona
            result = await chat_with_persona(
                system_prompt="You are a helpful assistant.",
                history=[],
                user_message="Hello",
                context="",
                session_id="test",
                user_id="test"
            )
            print(f"LLM OK: {result[:50]}...")
        except Exception as e:
            print(f"LLM FAIL: {e}")
            import traceback
            traceback.print_exc()
        
        # Step 3: Test DB add_session_turn
        print("\n[3] Testing DB add_session_turn...")
        try:
            from db import add_session_turn
            await add_session_turn(session_id, "user", "Hello")
            print("DB add_session_turn OK")
        except Exception as e:
            print(f"DB FAIL: {e}")
        
        # Step 4: Test DB save_analytics
        print("\n[4] Testing DB save_analytics...")
        try:
            from db import save_analytics
            await save_analytics(session_id, {
                "total_query": 1, "llm_query": 1, "stt_calls": 0, "tts_calls": 0,
                "response_time": 100, "stt_latency": 0, "tts_latency": 0,
                "groundedness": 0, "cost_idr": 0, "cost_llm_idr": 0,
                "cost_stt_idr": 0, "cost_tts_idr": 0, "status": "ok"
            })
            print("DB save_analytics OK")
        except Exception as e:
            print(f"DB save_analytics FAIL: {e}")
        
        print("\n--- Testing actual turn endpoint ---")
        r = await client.post(
            f"/api/sessions/{session_id}/turn",
            json={"text": "Hello", "language": "en", "latency_ms": 0, "silence_seconds": 0, "speech_energy": 0.5},
            headers=headers
        )
        print(f"Turn Status: {r.status_code}")
        print(f"Turn Body: {r.text[:500]}")

if __name__ == "__main__":
    asyncio.run(debug_turn())