# UI/UX Design Guidelines - Production
## DrivoAI v3.0

---

## 1. Design Language

- **Theme**: Dark Mode (Automotive Aesthetic).
- **Primary Color**: `#F75F5F` (Drivo Red).
- **Background**: `#0A0A0A` (Deep Black).
- **Surface**: `#1A1A1A` (Card Surface).
- **Typography**: Display Sans for headers, Monospace for metadata/analytics.

---

## 2. Key Components

### 2.1 Voice Orb
- The central interaction point.
- Pulse animation during STT (User speaking).
- Wave animation during TTS (AI speaking).
- Smooth transitions between states.

### 2.2 Persona Builder
- Drag-and-drop file upload for reference documents.
- Preview section for extracted text (via OpenAI Vision).
- **ElevenLabs Voice Selection**: 6 grid-based options with gender and tone labels.

### 2.3 Analytics Dashboard
- Located in **Settings > Analysis**.
- Real-time KPI cards (Users, Queries, Latency, Cost).
- Date range picker for historical filtering.
- **Embedded Charts**: Matplotlib-generated graphs displayed as cards.

---

## 3. User Flows

### 3.1 Custom Persona Creation
1. User enters description or uploads a document.
2. System parses content and generates a profile using Claude 3.5.
3. User selects one of 6 ElevenLabs voices.
4. User saves and activates the persona.

### 3.2 Real-time Voice Session
1. User clicks the Voice Orb to start.
2. Connection established with ElevenLabs Agent.
3. RAG context injected dynamically from Pinecone.
4. User and AI interact with minimal latency.

---

## 4. Accessibility
- High contrast ratios for readability in bright sunlight.
- Large touch targets for in-car console usage.
- Voice-first design to minimize manual interaction.
