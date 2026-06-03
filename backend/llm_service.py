"""LLM wrapper using Claude 3.5 Sonnet and Langfuse monitoring."""
import os
import re
import json
import logging
from typing import Any, List, Optional
import anthropic
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Logger
logger = logging.getLogger("drivoai.llm")

# Config
ANTHROPIC_API_KEY = os.environ.get("MODEL_LLM_API_KEY")
MODEL_NAME = os.environ.get("MODEL_LLM", "claude-3-5-sonnet-20240620")

# Langfuse - initialize lazily only if keys are available
langfuse = None
try:
    langfuse_public = os.environ.get("LANGFUSE_PUBLIC_KEY")
    langfuse_secret = os.environ.get("LANGFUSE_SECRET_KEY")
    if langfuse_public and langfuse_secret:
        from langfuse import Langfuse
        langfuse = Langfuse(
            public_key=langfuse_public,
            secret_key=langfuse_secret,
            host=os.environ.get("LANGFUSE_HOST", "https://us.cloud.langfuse.com")
        )
        logger.info("Langfuse initialized")
    else:
        logger.info("Langfuse keys not configured, skipping")
except Exception as e:
    logger.warning(f"Langfuse init error (non-fatal): {e}")

# Clients - lazy init to prevent crashes
anthropic_client = None

def _get_anthropic_client():
    global anthropic_client
    if anthropic_client is None:
        api_key = os.environ.get("MODEL_LLM_API_KEY")
        if api_key:
            anthropic_client = anthropic.Anthropic(api_key=api_key)
            logger.info("Anthropic client initialized")
        else:
            logger.warning("Anthropic API key not found in environment")
    return anthropic_client

def _strip_codefences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()

async def _claude_completion(
    system: str,
    messages: List[dict],
    max_tokens: int = 1024,
    temperature: float = 0.7,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> str:
    """Call Claude API with optional Langfuse tracking."""
    
    # Try to trace with Langfuse, but don't crash if it fails
    trace = None
    generation = None
    if langfuse is not None:
        try:
            trace = langfuse.trace(
                name="claude-completion",
                session_id=session_id,
                user_id=user_id,
                metadata={"model": MODEL_NAME}
            )
            generation = trace.generation(
                name="chat-completion",
                model=MODEL_NAME,
                model_parameters={"temperature": temperature, "max_tokens": max_tokens},
                input=messages
            )
        except Exception as e:
            logger.warning(f"Langfuse trace error (non-fatal): {e}")
            generation = None
    else:
        generation = None
    
    try:
        client = _get_anthropic_client()
        if client is None:
            logger.error("Anthropic client not available")
            return "Maaf, layanan AI sedang tidak tersedia."
        
        response = client.messages.create(
            model=MODEL_NAME,
            system=system,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        # Handle different content block types (TextBlock, ThinkingBlock, etc.)
        text = ""
        for block in response.content:
            if hasattr(block, 'text') and block.text:
                text = block.text
                break
        
        if not text:
            logger.warning(f"No text content found in Claude response. Content types: {[type(c).__name__ for c in response.content]}")
            text = "Maaf, saya tidak bisa menjawab saat ini."
        
        if generation:
            generation.end(
                output=text,
                usage={
                    "input": response.usage.input_tokens,
                    "output": response.usage.output_tokens
                }
            )
        return text
    except Exception as e:
        if generation:
            generation.end(level="ERROR", status_message=str(e))
        # If Claude fails, return a fallback response
        logger.error(f"Claude API error: {e}")
        return "Maaf, saya sedang mengalami gangguan teknis. Silakan coba lagi sebentar."

# ─── Persona Generation ──────────────────────────────────────────

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

async def generate_persona_profile(description: str, user_id: Optional[str] = None) -> dict:
    raw = await _claude_completion(
        system=PERSONA_GEN_SYSTEM,
        messages=[{"role": "user", "content": f"USER DESCRIPTION:\n{description}\n\nReturn the JSON now."}],
        max_tokens=1024,
        temperature=0.8,
        user_id=user_id
    )
    
    try:
        return json.loads(_strip_codefences(raw))
    except Exception:
        # Fallback if JSON parsing fails
        return {
            "name": "Companion",
            "personality_summary": "A helpful AI driving companion.",
            "communication_style": "casual",
            "tone_tags": ["friendly"],
            "system_prompt_fragment": "You are a helpful driving companion.",
            "sample_dialogue": {"ai": "Hello!", "user": "Hi", "ai_followup": "Ready to go?"}
        }

async def chat_with_persona(
    system_prompt: str,
    history: List[dict],
    user_message: str,
    context: str = "",
    session_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> str:
    """Main chat entry point with RAG context."""
    
    full_system = f"{system_prompt}\n\nRELEVANT CONTEXT:\n{context}\n\nKeep responses brief and safety-focused."
    
    messages = history + [{"role": "user", "content": user_message}]
    
    return await _claude_completion(
        system=full_system,
        messages=messages,
        session_id=session_id,
        user_id=user_id
    )

async def proactive_prompt(
    system_prompt: str,
    event_type: str,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> str:
    """Generate a proactive message (e.g. for drowsiness)."""
    
    system = f"{system_prompt}\n\nYou are a safety-first AI. The driver is showing signs of {event_type}. Intervene gently but firmly."
    
    return await _claude_completion(
        system=system,
        messages=[{"role": "user", "content": f"The driver is {event_type}. What do you say?"}],
        max_tokens=100,
        session_id=session_id,
        user_id=user_id
    )
