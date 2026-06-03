"""OpenAI Voice Service — STT (Whisper) and TTS with Indonesian-optimized voices."""
import os
import io
import base64
from typing import Optional, List
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_BASE_URL = "https://api.openai.com/v1"

# ── TTS Voice Options ─────────────────────────────────────────
# 13 voices optimized for different personas and tones
TTS_VOICES = {
    "alloy":  {"id": "alloy",  "name": "Alloy",  "tone": "Neutral/Professional", "gender": "neutral"},
    "ash":    {"id": "ash",    "name": "Ash",    "tone": "Calm/Mature", "gender": "male"},
    "ballad": {"id": "ballad", "name": "Ballad", "tone": "Warm/Gentle", "gender": "female"},
    "coral":  {"id": "coral",  "name": "Coral",  "tone": "Friendly/Casual", "gender": "female"},
    "echo":   {"id": "echo",   "name": "Echo",   "tone": "Deep/Serious", "gender": "male"},
    "fable":  {"id": "fable",  "name": "Fable",  "tone": "Storytelling/Narrative", "gender": "neutral"},
    "nova":   {"id": "nova",   "name": "Nova",   "tone": "Energetic/Young", "gender": "female"},
    "onyx":   {"id": "onyx",   "name": "Onyx",   "tone": "Deep/Authoritative", "gender": "male"},
    "sage":   {"id": "sage",   "name": "Sage",   "tone": "Wise/Calm", "gender": "neutral"},
    "shimmer":{"id": "shimmer","name": "Shimmer", "tone": "Bright/Optimistic", "gender": "female"},
    "verse":  {"id": "verse",  "name": "Verse",  "tone": "Clear/Articulate", "gender": "neutral"},
    "marin":  {"id": "marin",  "name": "Marin",   "tone": "Warm/Best Quality", "gender": "female"},
    "cedar":  {"id": "cedar",  "name": "Cedar",   "tone": "Warm/Best Quality", "gender": "male"},
}

# Persona voice mapping (Indonesian optimized)
# These voices are chosen to work best with Indonesian language
PERSONA_VOICE_MAP = {
    "formal": "sage",      # Wise, calm - good for formal
    "casual": "coral",     # Friendly - good for casual
    "energetic": "nova",   # Young, energetic
    "calm": "ash",         # Calm, mature
    "supportive": "marin",  # Warm, best quality for support
    "witty": "shimmer",    # Bright, optimistic - good for witty
}

# Indonesian specific - these voices work best with ID text
INDONESIAN_BEST_VOICES = ["marin", "cedar", "alloy", "nova", "shimmer"]

def get_voice_options() -> List[dict]:
    """Return available TTS voice options."""
    keys = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"]
    return [
        {"key": k, "id": TTS_VOICES[k]["id"], "name": TTS_VOICES[k]["name"], "tone": TTS_VOICES[k]["tone"], "gender": TTS_VOICES[k]["gender"]}
        for k in keys if k in TTS_VOICES
    ]

def get_voice_for_persona(communication_style: str, preferred_voice: Optional[str] = None) -> str:
    """Map persona communication style to best TTS voice."""
    if preferred_voice and preferred_voice in TTS_VOICES:
        return preferred_voice
    return PERSONA_VOICE_MAP.get(communication_style.lower(), "alloy")

def _get_headers() -> dict:
    return {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

# ── STT (Speech-to-Text) ─────────────────────────────────────

async def transcribe_audio(
    audio_bytes: bytes,
    model: str = os.environ.get("OPENAI_STT_MODEL", "whisper-1"),
    language: str = "id",
    prompt: Optional[str] = None,
) -> str:
    """
    Transcribe audio using OpenAI Whisper API.
    
    Models:
    - gpt-4o-mini-transcribe: Fast, good quality
    - gpt-4o-transcribe: Higher quality
    - gpt-4o-transcribe-diarize: Best quality with speaker diarization
    
    Args:
        audio_bytes: Raw audio data
        model: Whisper model to use
        language: Language code (default: "id" for Indonesian)
        prompt: Optional prompt to improve transcription accuracy
    
    Returns:
        Transcribed text
    """
    url = f"{OPENAI_BASE_URL}/audio/transcriptions"
    
    files = {
        "file": ("audio.webm", audio_bytes, "audio/webm"),
    }
    data = {
        "model": model,
        "language": language,
        "response_format": "text",
    }
    if prompt:
        data["prompt"] = prompt
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, files=files, data=data, headers={"Authorization": f"Bearer {OPENAI_API_KEY}"})
        resp.raise_for_status()
        return resp.text

async def transcribe_with_diarization(audio_bytes: bytes) -> dict:
    """
    Transcribe audio with speaker diarization.
    Returns both transcript and speaker segments.
    
    Uses gpt-4o-transcribe-diarize for best quality.
    """
    url = f"{OPENAI_BASE_URL}/audio/transcriptions"
    
    files = {
        "file": ("audio.webm", audio_bytes, "audio/webm"),
    }
    data = {
        "model": "gpt-4o-transcribe-diarize",
        "language": "id",
        "response_format": "verbose_json",
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, files=files, data=data, headers={"Authorization": f"Bearer {OPENAI_API_KEY}"})
        resp.raise_for_status()
        return resp.json()

# ── TTS (Text-to-Speech) ─────────────────────────────────────

async def text_to_speech(
    text: str,
    voice: str = "marin",
    model: str = os.environ.get("OPENAI_TTS_MODEL", "tts-1"),
    response_format: str = "mp3",
    speed: float = 1.0,
) -> bytes:
    """
    Convert text to speech using OpenAI TTS API.
    
    Models:
    - gpt-4o-mini-tts: Best quality, efficient
    - tts-1: Standard quality
    - tts-1-hd: High quality
    
    Voices: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse, marin, cedar
    
    Args:
        text: Text to convert to speech
        voice: Voice ID (default: marin - best for Indonesian)
        model: TTS model to use
        response_format: Output format (mp3, opus, aac, flac)
        speed: Speech speed (0.25 to 4.0)
    
    Returns:
        Audio data as bytes
    """
    url = f"{OPENAI_BASE_URL}/audio/speech"
    
    # Optimize for Indonesian: use slower speed for better clarity
    id_optimized_speed = min(max(speed, 0.9), 1.1)  # Keep close to 1.0 for ID
    
    payload = {
        "model": model,
        "input": text,
        "voice": voice,
        "response_format": response_format,
        "speed": id_optimized_speed,
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json=payload, headers={"Authorization": f"Bearer {OPENAI_API_KEY}"})
        resp.raise_for_status()
        return resp.content

async def text_to_speech_stream(
    text: str,
    voice: str = "marin",
    model: str = "gpt-4o-mini-tts",
) -> bytes:
    """
    Convert text to speech and return audio data.
    For streaming, use the non-streaming endpoint and return chunks.
    """
    return await text_to_speech(text, voice, model)

def build_voice_config(
    persona: dict,
    preferred_voice: Optional[str] = None,
) -> dict:
    """
    Build TTS configuration based on persona settings.
    
    Returns config with voice, model, and Indonesian optimization.
    """
    style = persona.get("communication_style", "casual")
    voice = get_voice_for_persona(style, preferred_voice)
    
    return {
        "voice": voice,
        "model": "gpt-4o-mini-tts",
        "response_format": "mp3",
        "speed": 1.0,
        "language_hint": "Indonesian",
        "persona_style": style,
    }