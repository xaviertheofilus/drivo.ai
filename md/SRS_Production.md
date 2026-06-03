# Software Requirements Specification (SRS) - Production
## DrivoAI v3.0

---

## 1. Functional Requirements

### 1.1 Authentication & Profile
- **F-101**: User shall be able to register and login via Supabase Auth.
- **F-102**: User shall be able to update their profile (name, avatar, language).
- **F-103**: System shall support English and Bahasa Indonesia.

### 1.2 Persona Management
- **F-201**: User shall be able to create a custom persona using text descriptions.
- **F-202**: User shall be able to upload documents (.pdf, .docx, .txt) or images to generate a persona.
- **F-203**: System shall use OpenAI Vision API to parse text from images and scanned PDFs.
- **F-204**: User shall select one of 6 ElevenLabs voices for each persona.

### 1.3 Voice Session & RAG
- **F-301**: System shall provide real-time voice interaction using ElevenLabs Conversational AI.
- **F-302**: System shall retrieve relevant context from Pinecone using OpenAI embeddings.
- **F-303**: System shall use Claude 3.5 Sonnet to generate safety-focused responses.
- **F-304**: System shall monitor for driver drowsiness and intervene via voice.

### 1.4 Analytics Dashboard
- **F-401**: System shall display global usage analytics in the Settings page.
- **F-402**: Analytics shall include total queries, average latency, groundedness, and total cost in IDR.
- **F-403**: System shall provide date-range filtering for analytics.

---

## 2. Interface Requirements

### 2.1 ElevenLabs Voice Interface
- **V-101**: STT/TTS shall support multilingual capabilities with a focus on Indonesian.
- **V-102**: Latency for voice response shall be less than 2 seconds.

### 2.2 Analytics Visualization
- **A-101**: Charts shall be generated using Matplotlib on the backend.
- **A-102**: Dashboard shall be responsive and accessible on mobile devices.

---

## 3. Security & Compliance
- **S-101**: All data in Supabase and Pinecone shall be encrypted at rest.
- **S-102**: API communication shall be over HTTPS.
- **S-103**: User credentials shall be managed securely by Supabase.
