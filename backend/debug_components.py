"""Direct test of turn endpoint logic"""
import asyncio
import sys
sys.path.insert(0, '.')

async def test():
    print("Testing turn endpoint components...")
    
    # 1. Test compute_drowsiness_score
    print("\n1. compute_drowsiness_score")
    from analysis_service import compute_drowsiness_score
    score = compute_drowsiness_score(100, 1.5, 0.3)
    print(f"   Score: {score}")
    
    # 2. Test retrieve_context (RAG)
    print("\n2. retrieve_context (RAG)")
    try:
        from rag_service import retrieve_context
        ctx = await retrieve_context("Hello", user_id="test-user")
        print(f"   Context: {len(ctx)} chars")
    except Exception as e:
        print(f"   RAG error: {e}")
    
    # 3. Test chat_with_persona (LLM)
    print("\n3. chat_with_persona (LLM)")
    try:
        from llm_service import chat_with_persona
        result = await chat_with_persona(
            system_prompt="You are a helpful assistant.",
            history=[],
            user_message="Hello",
            context="",
            session_id="test-session",
            user_id="test-user"
        )
        print(f"   LLM result: {result[:50]}...")
    except Exception as e:
        print(f"   LLM error: {e}")
        import traceback
        traceback.print_exc()
    
    # 4. Test db add_session_turn
    print("\n4. db.add_session_turn")
    try:
        import db
        # First login to get a valid session
        import auth_service
        user = await auth_service.login_user("xaviertheofilus@gmail.com", "DrivoAI2024!")
        print(f"   Login OK: {user['user']['id']}")
        
        session = await db.start_session(user["user"]["id"])
        print(f"   Session: {session['session_id']}")
        
        await db.add_session_turn(session["session_id"], "user", "Hello")
        print("   add_session_turn OK")
        
        await db.add_session_turn(session["session_id"], "ai", "Hi there!")
        print("   add_session_turn AI OK")
        
    except Exception as e:
        print(f"   DB error: {e}")
        import traceback
        traceback.print_exc()
    
    # 5. Test db save_analytics
    print("\n5. db.save_analytics")
    try:
        await db.save_analytics(session["session_id"], {
            "total_query": 1, "llm_query": 1, "stt_calls": 0, "tts_calls": 0,
            "response_time": 500, "stt_latency": 0, "tts_latency": 0,
            "groundedness": 0.5, "cost_idr": 100, "cost_llm_idr": 50,
            "cost_stt_idr": 0, "cost_tts_idr": 0, "status": "ok"
        })
        print("   save_analytics OK")
    except Exception as e:
        print(f"   save_analytics error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n=== All components tested ===")

asyncio.run(test())