# DrivoAI — AI Voice In-Car Assistant (v3.0)

AI-powered in-car voice assistant that combats driver drowsiness through real-time conversational engagement, personalized AI companions, and intelligent fatigue detection.

## Tech Stack (Production Ready)

- **Frontend**: React 19, Tailwind CSS, Lucide Icons, Axios
- **Backend**: FastAPI (Python 3.12)
- **Database & Auth**: Supabase (PostgreSQL)
- **Vector Search (RAG)**: Pinecone
- **LLM**: Claude 3.5 Sonnet
- **Embeddings**: OpenAI text-embedding-3-large
- **Voice (STT/TTS)**: ElevenLabs Conversational AI
- **Document Parsing**: OpenAI Vision API
- **Monitoring**: Langfuse
- **Analytics**: Matplotlib & Pandas (Real-time Dashboard)

## Quick Start (Local Setup)

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload
```

### Frontend (React)
```bash
cd frontend
yarn install
yarn start
```

## Deployment (Vercel)

This project is optimized for deployment on **Vercel**.

1. **Frontend**: Connect your GitHub repository to Vercel. It will automatically detect the React app in the `frontend/` directory.
2. **Backend**: You can deploy the FastAPI backend as a Vercel Serverless Function or to a separate service like Railway/Render.
3. **Environment Variables**: Ensure all variables listed in the "Environment Variables" section are added to your Vercel project settings.

**Services:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Key Features

- **Persona Selection**: 6 ElevenLabs voice options (3 Male, 3 Female)
- **Custom Persona Builder**: Text or File/Image upload (powered by OpenAI Vision)
- **Real-Time Voice Sessions**: Low-latency interaction with drowsiness detection
- **RAG Integration**: Intelligent context retrieval from Pinecone
- **Global Analysis Dashboard**: Real-time charts for usage, latency, and cost in IDR
- **Bilingual**: Native support for Bahasa Indonesia and English

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `PINECONE_API_KEY` | Pinecone API key |
| `OPENAI_API_KEY` | OpenAI API key (for Vision & Embeddings) |
| `MODEL_LLM_API_KEY` | Anthropic API key for Claude |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key |

## License

MIT
