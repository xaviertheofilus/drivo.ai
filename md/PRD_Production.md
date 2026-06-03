# Product Requirements Document (PRD) - Production Setup
## DrivoAI — In-Car AI Voice Assistant (v3.0)

**Version:** 3.0 - Production  
**Last Updated:** 2026-06-02  
**Status:** Production Ready

---

## 1. Tech Stack Update

### Final Production Stack

| Component | Technology |
|-----------|------------|
| **Database & Auth** | **Supabase (Postgres)** |
| **Reference Files** | **Supabase Storage** |
| **Vector Store** | **Pinecone** |
| **Embedding Model** | **OpenAI text-embedding-3-large** |
| **LLM** | **Claude 3.5 Sonnet** |
| **STT / TTS** | **ElevenLabs (Dynamic Agent)** |
| **Document Parsing**| **OpenAI Vision API** |
| **Monitoring** | **Langfuse** |
| **Dashboard** | **Matplotlib (Real-time Analytics)** |

---

## 2. Key Technology Rationale

### Why ElevenLabs?
- Best-in-class STT and TTS quality.
- Support for multiple voices (3 male, 3 female) with distinct tones.
- Low latency conversational AI agents.
- Native support for Indonesian language.

### Why Supabase?
- Managed PostgreSQL with built-in Auth.
- Scalable storage for reference documents and user avatars.
- Real-time data synchronization.

### Why Claude 3.5 Sonnet?
- Superior reasoning and coding capabilities.
- Better context handling for RAG.
- Safety-first alignment for in-car assistance.

---

## 3. System Architecture

```
┌─ Driver (Browser) ─┐
│   Voice Orb UI     │
└────────┬───────────┘
         │ HTTPS / WebSocket
         ↓
┌─ FastAPI Backend  ──────┐
│ • Auth & Profiles       │
│ • ElevenLabs Manager    │
│ • Analytics Engine      │
│ • RAG & Vision Parsing  │
└────────┬────────────────┘
    ↙    ↓    ↘    ↖
   ↓     ↓     ↓     ↓
 Supabase Pinecone OpenAI ElevenLabs
 (DB/Auth) (Vectors) (Vision) (STT/TTS)
   │      │         │       │
   └──────┴─────────┴───────┘
         Langfuse (Monitoring)
```

---

## 4. Feature Set

### Core Features
1. ✅ Persona Selection (6 ElevenLabs Voice Options)
2. ✅ Custom Persona Builder (Text/File via OpenAI Vision)
3. ✅ Voice Session (Real-time ElevenLabs STT/TTS)
4. ✅ RAG Integration (Pinecone + text-embedding-3-large)
5. ✅ Analytics Dashboard (Real-time, cross-user, IDR cost tracking)
6. ✅ Drowsiness Detection (Safety Monitoring)
7. ✅ Mobile-Responsive UI

---

## 5. Analytics Dashboard

Located under **Settings > Analysis**, the dashboard provides:
- **Total Queries**: Real-time count of interactions.
- **Response Time**: Latency distribution across all users.
- **Groundedness**: Accuracy of RAG-based responses.
- **Cost Analysis**: LLM and service costs calculated in **IDR (Rupiah)**.
- **Filters**: Start and End date filtering for historical analysis.
- **Visualization**: Matplotlib-generated charts embedded in the UI.

---

## 6. Credentials & Configuration

### Environment Variables
```bash
# ElevenLabs
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...

# Supabase
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SUPABASE_STORAGE_BUCKET=...

# Pinecone
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=...

# OpenAI (Embedding & Vision)
OPENAI_API_KEY=...
OPENAI_MODEL_EMBEDDING=text-embedding-3-large

# LLM (Claude)
MODEL_LLM_API_KEY=...
MODEL_LLM=claude-3-5-sonnet-20240620

# Monitoring
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_SECRET_KEY=...
LANGFUSE_HOST=...
```
