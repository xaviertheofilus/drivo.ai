# System Design Document (SDD) - Production
## DrivoAI v3.0 with Supabase, Pinecone, Claude, ElevenLabs

---

## 1. Architecture Overview

```
┌──────────────────────────────────────┐
│   User (Browser / Car Console)       │
└───────────┬──────────────────────────┘
            │ HTTP/WebSocket (HTTPS)
            ↓
┌──────────────────────────────────────┐
│  FastAPI Backend (Docker/EC2)        │
│  - Auth & Profile Management         │
│  - RAG Retrieval & Ingestion         │
│  - Document Vision Parsing           │
│  - Analytics & Chart Generation      │
└───────────┬──────────────────────────┘
            │
    ┌───────┴────────────┬──────────────┬─────────────┐
    ↓                    ↓              ↓             ↓
┌──────────┐        ┌──────────┐  ┌────────────┐  ┌────────────┐
│ Supabase │        │ Pinecone │  │ ElevenLabs │  │ Anthropic  │
│ (DB/FS)  │        │ (Vector) │  │ (STT/TTS)  │  │ (Claude)   │
└──────────┘        └──────────┘  └────────────┘  └────────────┘
     │                    │              │             │
     └────────────────────┴──────┬───────┴─────────────┘
                                 ↓
                            ┌──────────┐
                            │ Langfuse │
                            └──────────┘
```

---

## 2. Backend Services

### 1. Database & Storage (Supabase)
- **Profiles**: User information and preferences.
- **Sessions**: Historical voice sessions and transcripts.
- **Storage**: User uploads (avatars, reference documents).

### 2. Vector Store (Pinecone)
- **Index**: `drivoai`
- **Embedding**: `text-embedding-3-large` (3072 dimensions).
- **Namespaces**: Per-user or per-persona isolation.

### 3. LLM (Claude 3.5 Sonnet)
- **Model**: `claude-3-5-sonnet-20240620`
- **Role**: Reasoning, dialogue generation, and persona creation.

### 4. Voice (ElevenLabs)
- **STT/TTS**: Real-time conversational AI.
- **Voices**: 6 distinct agents (3 male, 3 female) supporting Indonesian.

---

## 3. Data Flow

### RAG Ingestion Flow
1. User uploads document → `FastAPI`.
2. `FastAPI` → `OpenAI Vision` (if image/scan) or `PyMuPDF`.
3. Extracted text → `OpenAI text-embedding-3-large`.
4. Embeddings + Metadata → `Pinecone`.
5. Original file → `Supabase Storage`.

### Chat Flow
1. User speaks → `ElevenLabs STT`.
2. Transcript → `FastAPI`.
3. `FastAPI` → `Pinecone` (Retrieve context).
4. Context + Transcript → `Claude 3.5 Sonnet`.
5. Claude response → `ElevenLabs TTS`.
6. Response spoken to user.

---

## 4. Analytics Engine

### Metrics Collection
Every interaction is logged in the `analytics` table in Supabase:
- `total_query`: Number of messages.
- `response_time`: Latency in ms.
- `groundedness`: Score (0-1) of RAG accuracy.
- `cost_idr`: Estimated cost in Rupiah based on token usage.

### Visualization
- **Backend**: Uses `matplotlib` and `pandas` to generate charts.
- **Delivery**: Charts are converted to Base64 PNGs and sent to the frontend.
- **Real-time**: Analytics are aggregated across all users for global insights.
