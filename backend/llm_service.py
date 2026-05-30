"""LLM wrapper around emergentintegrations.

# ----------------------------------------------------------------------
# SWAP TO YOUR OWN OPENAI KEY LATER:
# 1. Set OPENAI_API_KEY in /app/backend/.env
# 2. Replace `LlmChat(api_key=EMERGENT_LLM_KEY, ...)` below with the
#    official OpenAI SDK call:
#       from openai import AsyncOpenAI
#       client = AsyncOpenAI(api_key=os.environ['OPENAI_API_KEY'])
#       resp = await client.chat.completions.create(
#           model='gpt-4o',
#           messages=[{'role':'system','content':system}, {'role':'user','content':text}],
#       )
# 3. No other code changes needed; the service interface is the same.
# ----------------------------------------------------------------------
"""
import json
import os
import re
import time
from typing import List, Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-4o")
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "openai")


def _new_chat(system: str, session_id: Optional[str] = None) -> LlmChat:
    sid = session_id or f"drivoai-{int(time.time() * 1000)}"
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=sid,
        system_message=system,
    ).with_model(LLM_PROVIDER, LLM_MODEL)


def _strip_codefences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


PERSONA_GEN_SYSTEM = (
    "You are the DrivoAI persona designer. Given a user-provided description, you output "
    "ONLY a JSON object describing the AI driving companion. Schema (strict): "
    "{\n"
    '  "name": string (2-50 chars, friendly given name),\n'
    '  "personality_summary": string (60-150 words, 2nd-person describing the AI),\n'
    '  "communication_style": one of ["formal","casual","energetic","calm","supportive","witty"],\n'
    '  "tone_tags": string[] (3-5 short tags without # symbol, e.g. ["warm","patient","curious"]),\n'
    '  "system_prompt_fragment": string (200-500 chars, written as direct second-person instructions to the AI: \'You are ... . Speak like ... . Keep replies short ...\'),\n'
    '  "sample_dialogue": { "ai": string (one short AI line), "user": string (one short user reply), "ai_followup": string }\n'
    "}\n"
    "Reply with the JSON object only. No markdown, no commentary, no extra keys."
)


async def generate_persona_profile(description: str) -> dict:
    """Call LLM to design a persona; returns parsed dict matching schema."""
    chat = _new_chat(PERSONA_GEN_SYSTEM)
    msg = UserMessage(text=f"USER DESCRIPTION:\n{description}\n\nReturn the JSON now.")
    last_err = None
    for attempt in range(3):
        try:
            resp = await chat.send_message(msg)
            raw = _strip_codefences(resp)
            data = json.loads(raw)
            # minimal validation
            for k in ("name", "personality_summary", "communication_style", "tone_tags", "system_prompt_fragment"):
                if k not in data:
                    raise ValueError(f"missing key {k}")
            if not isinstance(data["tone_tags"], list):
                data["tone_tags"] = [str(data["tone_tags"])]
            data["tone_tags"] = [str(t).lstrip("#").strip() for t in data["tone_tags"] if str(t).strip()][:5]
            if "sample_dialogue" not in data or not isinstance(data["sample_dialogue"], dict):
                data["sample_dialogue"] = {
                    "ai": "Hey, glad we're driving together.",
                    "user": "Same here.",
                    "ai_followup": "What's on your mind today?",
                }
            return data
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Persona generation failed after 3 attempts: {last_err}")


async def chat_with_persona(
    persona_system_prompt: str,
    history: List[dict],
    user_text: str,
    language: str = "en",
    rag_context: Optional[List[str]] = None,
    drowsiness_escalate: bool = False,
) -> str:
    """Generate AI reply. history: list of {role: user|assistant, content: str}."""
    lang_line = (
        "The user is speaking Bahasa Indonesia. Reply in fluent, warm, conversational Bahasa Indonesia. "
        "Use short sentences. Do not mix English unless the user does."
        if language == "id"
        else "The user is speaking English. Reply in warm, conversational English with short sentences (1-2 sentences max)."
    )
    escalate_line = (
        "\nIMPORTANT: The driver appears drowsy. Sound MORE engaged, ask a stimulating question, "
        "and gently suggest taking a short break if appropriate. Avoid soothing tones."
        if drowsiness_escalate
        else ""
    )
    context_block = ""
    if rag_context:
        joined = "\n- ".join(rag_context[:5])
        context_block = f"\n\n[Context from prior conversations or persona document]\n- {joined}\n"

    system = (
        f"{persona_system_prompt.strip()}\n\n"
        f"LANGUAGE RULE: {lang_line}\n"
        "OUTPUT RULE: Keep replies short (1-2 sentences) and conversational. "
        "Never use markdown, lists, code blocks, or emojis. Stay in character."
        f"{escalate_line}"
        f"{context_block}"
    )

    chat = _new_chat(system)
    # Inline history into the prompt to keep things stateless (LlmChat session is per-call here).
    transcript = ""
    for turn in history[-10:]:
        role = "User" if turn.get("role") == "user" else "You"
        transcript += f"{role}: {turn.get('content', '').strip()}\n"
    prompt = (
        (f"Recent conversation so far:\n{transcript}\n" if transcript else "")
        + f"User: {user_text.strip()}\nYou:"
    )
    resp = await chat.send_message(UserMessage(text=prompt))
    return resp.strip()


async def analyze_transcript(turns: List[dict], language: str = "en") -> dict:
    """Post-session analysis: topics, emotional tone, engagement score."""
    lines = []
    for t in turns:
        who = "Driver" if t.get("speaker") == "user" else "AI"
        lines.append(f"{who}: {t.get('content', '').strip()}")
    transcript_text = "\n".join(lines)[:6000]

    system = (
        "You are DrivoAI's session analyst. Given a driver+AI transcript, output ONLY JSON: \n"
        "{\n"
        '  "topics": [up to 5 short topic strings],\n'
        '  "emotional_tone": one of ["calm","anxious","fatigued","engaged","neutral"],\n'
        '  "engagement_score": integer 0-100,\n'
        '  "summary": one-sentence summary of the drive\n'
        "}\nNo markdown, no extra keys."
    )
    chat = _new_chat(system)
    resp = await chat.send_message(UserMessage(text=f"TRANSCRIPT:\n{transcript_text}\n\nReturn the JSON now."))
    try:
        return json.loads(_strip_codefences(resp))
    except Exception:
        return {
            "topics": [],
            "emotional_tone": "neutral",
            "engagement_score": 50,
            "summary": "Drive session completed.",
        }


async def generate_auto_persona_from_transcript(turns: List[dict]) -> dict:
    """Use the transcript to draft a persona that would fit the driver's style."""
    lines = [f"{('Driver' if t.get('speaker') == 'user' else 'AI')}: {t.get('content', '')}" for t in turns]
    transcript = "\n".join(lines)[:4000]
    description = (
        f"Based on this driver's speaking style and topics in the transcript below, design an AI "
        f"companion that would fit them well. Infer warmth, energy, humor, and topical interests.\n\n"
        f"Transcript:\n{transcript}"
    )
    return await generate_persona_profile(description)


async def proactive_prompt(persona_system_prompt: str, language: str, last_topic: str = "") -> str:
    """Generate a proactive prompt when driver has been silent."""
    lang_line = (
        "Reply in Bahasa Indonesia." if language == "id" else "Reply in English."
    )
    system = (
        f"{persona_system_prompt.strip()}\n\n"
        "The driver has been silent for over 90 seconds. Generate ONE short proactive line "
        "(under 18 words) to gently re-engage them. Could be a soft question, an observation, "
        "or a quick check-in. Stay in character.\n"
        f"{lang_line}\n"
        "OUTPUT: plain text only, no quotes, no emojis."
    )
    chat = _new_chat(system)
    extra = f" Most recent topic discussed: {last_topic}." if last_topic else ""
    resp = await chat.send_message(UserMessage(text=f"Generate the proactive line now.{extra}"))
    return resp.strip().strip('"')
