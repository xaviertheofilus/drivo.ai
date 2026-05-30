# DrivoAI — Development Plan (MVP)

## 1) Objectives
- Prove the **core drive loop** works end-to-end: **(STT EN/ID → LLM persona-aware response (+RAG) → TTS EN/ID)** with session persistence + drowsiness scoring.
- Ship a usable **v1 full-stack web app** (React + FastAPI + MongoDB) with the 12 screens and required UX (dark-first, voice orb states, large tap targets).
- Implement persona system (templates + custom + auto-persona), session history/reporting, avatar uploads (driver + persona).
- Keep integrations swappable: **Emergent LLM now** with comments for direct OpenAI; **GridFS now** with AWS S3 stub/hook for later.

---

## 2) Implementation Steps

### Phase 1 — Core Workflow POC (Isolation, must pass before app build)
**Goal:** Validate the failure-prone pieces (voice, LLM JSON, embeddings, file parsing) in isolation.

1. **Web research (quick playbook)**
   - Confirm Web Speech API best practices for **continuous recognition**, **language switching (id-ID/en-US)**, and TTS voice selection.
   - Confirm Agora RTC minimal join/leave + volume indication patterns.

2. **Backend POC script (single runnable Python file)**
   - Emergent LLM call: persona generation prompt → enforce **strict JSON** schema parse.
   - Emergent LLM chat: persona system prompt + short history → response text.
   - Embeddings: generate query embedding + cosine similarity over a tiny in-memory store.
   - File extraction: TXT + PDF (PyMuPDF) + DOCX (python-docx) → plain text.

3. **Frontend POC page (single route)**
   - Web Speech STT (toggle EN/ID) → shows interim/final transcript.
   - Web Speech TTS (toggle EN/ID) → speaks backend response.
   - Minimal API roundtrip: transcript → `/api/poc/chat` → response.

4. **Exit criteria (hard gate)**
   - EN and ID STT/TTS both function on Chrome.
   - LLM persona JSON parses reliably (retry-on-parse-fail).
   - Embeddings call succeeds; retrieval returns top-k.
   - File parsing returns non-empty text for sample files.

**Phase 1 user stories**
1. As a user, I can speak in Indonesian and see accurate live transcription.
2. As a user, I can switch to English and get transcription + spoken AI response.
3. As a developer, I can generate a persona profile as valid JSON every time.
4. As a developer, I can extract readable text from PDF/DOCX/TXT uploads.
5. As a developer, I can retrieve top-5 context chunks scoped to one user.

---

### Phase 2 — V1 App Development (build around proven core)
**Goal:** Deliver the full 12-screen app MVP **without auth first**, using a temporary “dev user” context to keep testing friction low.

1. **Backend (FastAPI + MongoDB)**
   - Data models (Mongo collections): users, refresh_tokens (later), personas, sessions, session_turns, embeddings, files.
   - Services:
     - `llm_service` (Emergent; include `# TODO: swap to OpenAI key` notes)
     - `rag_service` (chunk 512/overlap 64, embed, store in Mongo, cosine retrieve, user-scoped)
     - `storage_service` (GridFS now) + `s3_service_stub` (boto3 wrapper + comments)
     - `analysis_service` (async background task) + auto-persona draft
     - `drowsiness_service` (latency/silence/energy → 0-100 + escalation)
   - APIs (no auth gate in v1):
     - Personas: templates list, custom CRUD, generate preview, activate, upload avatar
     - Sessions: start/end, stream (WebSocket) for turn events, transcript/report endpoints
     - Uploads: driver avatar, persona avatar, persona context files

2. **Frontend (React + Tailwind + shadcn/ui)**
   - Apply design tokens (colors, fonts) and shared layout (sidebar + protected-like sections).
   - Build all 12 screens per UI/UX doc:
     - Landing, Login/Register (UI only in v1), Dashboard, Persona Gallery/Builders/Preview, Session, Report, History, Settings.
   - Core components:
     - VoiceOrb (5 states), PersonaCard, DrowsinessAlert, SessionMetrics.
   - Voice session:
     - STT/TTS via Web Speech API with EN/ID toggle.
     - WebSocket for turn events; keep last 10 turns.
     - Silence timer (90s) → proactive prompt.
     - Drowsiness scoring updates UI + escalation prompts.
   - Uploads:
     - Driver avatar upload in Settings.
     - Persona avatar upload in persona create/edit.

3. **End-of-phase test (1 round)**
   - Run testing agent: navigation, persona flows, upload flows, session lifecycle (simulate text input instead of mic), report rendering.

**Phase 2 user stories**
1. As a user, I can choose a template persona and set it active from the gallery.
2. As a user, I can create a custom persona from text, preview it, regenerate up to 3 times, then save.
3. As a user, I can upload a persona photo so the active persona feels personal.
4. As a user, I can start a voice session, speak, and hear persona-styled responses in my chosen language.
5. As a user, I can end a session and immediately view a drive report with topics, engagement, and drowsiness timeline.

---

### Phase 3 — Add Auth + Hardening (post-v1 once flows proven)
**Goal:** Add full SRS-compliant auth and tighten security/validation.

1. **Auth implementation (SRS-aligned)**
   - Register/login, bcrypt cost 12, JWT access 60m, refresh 7d, server-side refresh token revocation.
   - Account lockout after 5 failed attempts (15 min).
   - Axios interceptor + route guards.

2. **Secure data isolation**
   - All persona/session/RAG queries scoped to `user_id` from JWT.
   - File access via signed download endpoints (GridFS now; S3 later).

3. **Background tasks & reliability**
   - Transcript checkpointing every 60s.
   - Analysis retries (3) with backoff.

4. **Testing (1 round)**
   - Testing agent: auth flows + protected routes + cross-user isolation checks.

**Phase 3 user stories**
1. As a user, I can register and log in securely with password rules enforced.
2. As a user, I stay logged in via refresh token until I log out.
3. As a user, my account locks temporarily after repeated failed logins.
4. As a user, I can only access my own personas, sessions, and embeddings.
5. As a user, logging out revokes my refresh token and blocks API access.

---

### Phase 4 — Monitoring + AWS Hooks (optional, production-readiness)
- Add structured logging, basic latency metrics, and stubs for Langfuse/CloudWatch.
- Finalize S3 integration toggle (env flag): store audio/transcripts/persona files in S3 instead of GridFS.

**Phase 4 user stories**
1. As an operator, I can inspect request/LLM latencies via structured logs.
2. As an operator, I can enable S3 storage without code rewrites.
3. As a user, my uploaded files remain accessible after app restarts.
4. As a user, my session reports load quickly and consistently.
5. As an operator, I can track drowsiness flag frequency over time.

---

## 3) Next Actions (immediate)
1. Implement and run **Phase 1 POC** (LLM JSON + chat, embeddings, file parsing, Web Speech EN/ID STT+TTS).
2. Fix until all Phase 1 exit criteria pass.
3. Start Phase 2: build backend services/routers + frontend screens/components in one integrated pass.
4. Run testing agent once v1 is wired end-to-end.

---

## 4) Success Criteria
- Core loop works: **STT (EN/ID) → LLM persona response (+RAG) → TTS (EN/ID)**.
- Persona system complete: templates + custom (text/file) + preview/regenerate + active persona + avatar upload; max 5 enforced in Phase 3.
- Sessions: start/end, turn history, proactive prompt at 90s, drowsiness scoring + alerts, report generated post-session.
- Reports/history: session list and report view render consistently with required fields.
- Auth (Phase 3): JWT + refresh + lockout + protected routes + strict user isolation.
- Code contains clear hooks/comments for swapping **Emergent→OpenAI** and **GridFS→S3** later.
