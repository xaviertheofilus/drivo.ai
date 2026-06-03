"""Debug server imports"""
import sys

print("Testing imports...")
try:
    from server import app, api, compute_drowsiness_score, chat_with_persona, retrieve_context, db as db_module
    print("All imports OK")
except Exception as e:
    print(f"Import error: {e}")
    import traceback
    traceback.print_exc()

print("\nChecking TurnReq...")
try:
    from server import TurnReq
    print(f"TurnReq: {TurnReq}")
except Exception as e:
    print(f"TurnReq error: {e}")

print("\nChecking compute_drowsiness_score...")
try:
    from analysis_service import compute_drowsiness_score
    score = compute_drowsiness_score(0, 0, 0.5)
    print(f"compute_drowsiness_score(0,0,0.5) = {score}")
except Exception as e:
    print(f"compute_drowsiness_score error: {e}")
    import traceback
    traceback.print_exc()