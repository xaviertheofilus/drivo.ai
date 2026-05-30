"""Drowsiness scoring + post-session analysis driver."""
from datetime import datetime, timezone
from typing import List

from db import sessions_col, turns_col
from llm_service import analyze_transcript, generate_auto_persona_from_transcript
from rag_service import ingest_document


def compute_drowsiness_score(latency_ms: int, silence_seconds: float, speech_energy: float = 0.5) -> int:
    """Heuristic drowsiness score 0-100.

    Inputs:
        latency_ms: response latency of the driver (time between AI question and driver's reply)
        silence_seconds: cumulative silence in the last 10-min window
        speech_energy: 0.0 (silent) - 1.0 (loud)
    """
    score = 0.0
    # latency component
    if latency_ms >= 6000:
        score += 35
    elif latency_ms >= 4000:
        score += 22
    elif latency_ms >= 2500:
        score += 10

    # silence component
    if silence_seconds >= 120:
        score += 35
    elif silence_seconds >= 60:
        score += 20
    elif silence_seconds >= 30:
        score += 8

    # speech energy component (low energy = drowsy)
    if speech_energy < 0.15:
        score += 25
    elif speech_energy < 0.30:
        score += 12

    return max(0, min(100, int(round(score))))


async def run_post_session_analysis(session_id: str) -> dict:
    sess = await sessions_col.find_one({"id": session_id}, {"_id": 0})
    if not sess:
        return {"ok": False, "error": "session not found"}
    turns_cursor = turns_col.find({"session_id": session_id}, {"_id": 0}).sort("turn_index", 1)
    turns: List[dict] = await turns_cursor.to_list(2000)

    user_text = " ".join(t.get("content", "") for t in turns if t.get("speaker") == "user")
    ai_text = " ".join(t.get("content", "") for t in turns if t.get("speaker") == "ai")

    # Aggregate metrics
    driver_turns = [t for t in turns if t.get("speaker") == "user"]
    ai_turns = [t for t in turns if t.get("speaker") == "ai"]
    total_turns = len(turns)
    driver_talk_time = sum(len((t.get("content") or "").split()) for t in driver_turns) * 0.4
    ai_talk_time = sum(len((t.get("content") or "").split()) for t in ai_turns) * 0.4
    drowsiness_flags = sess.get("drowsiness_flags", [])

    # Drowsiness timeline
    timeline = []
    for t in turns:
        if t.get("speaker") == "user" and t.get("drowsiness_score") is not None:
            timeline.append({
                "turn": t.get("turn_index"),
                "score": int(t.get("drowsiness_score") or 0),
                "timestamp": t.get("timestamp"),
            })

    language = sess.get("language", "en")
    llm_result = {}
    if total_turns >= 2:
        try:
            llm_result = await analyze_transcript(turns, language=language)
        except Exception as e:
            llm_result = {"topics": [], "emotional_tone": "neutral", "engagement_score": 50, "summary": f"Analysis fallback ({e})"}
    else:
        llm_result = {"topics": [], "emotional_tone": "neutral", "engagement_score": 30, "summary": "Very short session—limited analysis."}

    report = {
        "session_id": session_id,
        "total_turns": total_turns,
        "driver_talk_time_seconds": round(driver_talk_time, 1),
        "ai_talk_time_seconds": round(ai_talk_time, 1),
        "topics": llm_result.get("topics", []),
        "emotional_tone": llm_result.get("emotional_tone", "neutral"),
        "engagement_score": int(llm_result.get("engagement_score", 50)),
        "drowsiness_flags": drowsiness_flags,
        "drowsiness_timeline": timeline,
        "summary": llm_result.get("summary", ""),
        "language": language,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Auto-persona if session had no persona
    auto_persona_draft = None
    if not sess.get("persona_id") and total_turns >= 4:
        try:
            auto_persona_draft = await generate_auto_persona_from_transcript(turns)
        except Exception:
            auto_persona_draft = None

    update = {"report": report, "engagement_score": report["engagement_score"]}
    if auto_persona_draft:
        update["auto_persona_draft"] = auto_persona_draft
    await sessions_col.update_one({"id": session_id}, {"$set": update})

    # Ingest transcript into RAG for future sessions
    if user_text:
        try:
            await ingest_document(
                user_id=sess["user_id"],
                text=f"DRIVER said during session {session_id}: {user_text}\n\nAI said: {ai_text}",
                source_type="session_transcript",
                source_id=session_id,
                session_id=session_id,
            )
        except Exception:
            pass

    return {"ok": True, "report": report, "auto_persona_draft": auto_persona_draft}
