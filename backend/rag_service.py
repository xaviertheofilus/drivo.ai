"""RAG service using OpenAI text-embedding-3-large + Pinecone."""
import os
import uuid
import logging
from typing import List, Optional, Dict, Any

from openai import OpenAI
from dotenv import load_dotenv

logger = logging.getLogger("drivoai.rag")

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Config
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
EMBEDDING_MODEL = os.environ.get("OPENAI_MODEL_EMBEDDING", "text-embedding-3-large")

PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "drivoai")
PINECONE_CLOUD = os.environ.get("PINECONE_CLOUD", "aws")
PINECONE_REGION = os.environ.get("PINECONE_REGION", "us-east-1")

# Clients
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Initialize Pinecone lazily
pc = None
index = None

def _init_pinecone():
    global pc, index
    if pc is not None:
        return True
    try:
        import pinecone
        pc = pinecone.Pinecone(api_key=PINECONE_API_KEY)
        if PINECONE_INDEX_NAME not in pc.list_indexes().names():
            from pinecone import ServerlessSpec
            pc.create_index(
                name=PINECONE_INDEX_NAME,
                dimension=3072,
                metric='cosine',
                spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION)
            )
        index = pc.Index(PINECONE_INDEX_NAME)
        logger.info("Pinecone initialized successfully")
        return True
    except Exception as e:
        logger.warning(f"Pinecone not available: {e}. RAG features will be disabled.")
        pc = None
        index = None
        return False

# Try to initialize on module load - wrap in try/except to prevent crash
try:
    _init_pinecone()
except Exception as e:
    logger.warning(f"Pinecone init error (non-fatal): {e}")

CHUNK_SIZE = 800  # optimized for text-embedding-3-large (max 8191 tokens, ~32k chars)
OVERLAP = 100

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = OVERLAP) -> List[str]:
    text = (text or "").strip()
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        if end == len(text):
            break
        start = end - overlap
    return chunks

async def _get_embedding(text: str) -> List[float]:
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.embeddings.create(
            input=[text],
            model=EMBEDDING_MODEL
        )
        return resp.data[0].embedding
    except Exception as e:
        logger.warning(f"Embedding error: {e}, returning zero vector")
        # Return a zero vector as fallback to prevent crashes
        return [0.0] * 3072

async def ingest_document(
    text: str, 
    user_id: str, 
    persona_id: Optional[str] = None, 
    session_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> int:
    """Chunk and ingest text into Pinecone."""
    if index is None:
        logger.warning("Pinecone not available, skipping document ingestion")
        return 0
        
    chunks = chunk_text(text)
    if not chunks:
        return 0
    
    vectors = []
    for i, chunk in enumerate(chunks):
        embedding = await _get_embedding(chunk)
        vector_id = f"chunk_{uuid.uuid4()}"
        
        meta = metadata or {}
        meta.update({
            "text": chunk,
            "user_id": user_id,
            "persona_id": persona_id or "global",
            "session_id": session_id or "global",
        })
        
        vectors.append({
            "id": vector_id,
            "values": embedding,
            "metadata": meta
        })
    
    try:
        if index is None:
            logger.warning("Pinecone index not available, skipping ingest")
            return 0
        index.upsert(vectors=vectors)
        return len(chunks)
    except Exception as e:
        logger.error(f"Failed to ingest document: {e}")
        return 0

async def retrieve_context(
    query: str, 
    user_id: str, 
    persona_id: Optional[str] = None, 
    limit: int = 5
) -> str:
    """Retrieve relevant context from Pinecone."""
    if index is None:
        logger.warning("Pinecone not available, returning empty context")
        return ""
        
    try:
        query_embedding = await _get_embedding(query)
        
        filter_dict = {"user_id": user_id}
        if persona_id:
            filter_dict["persona_id"] = persona_id
            
        results = index.query(
            vector=query_embedding,
            top_k=limit,
            include_metadata=True,
            filter=filter_dict
        )
        
        contexts = [match.metadata["text"] for match in results.matches if "text" in match.metadata]
        return "\n\n---\n\n".join(contexts)
    except Exception as e:
        logger.error(f"Failed to retrieve context: {e}")
        return ""

async def purge_for_persona(user_id: str, persona_id: str) -> None:
    """Delete all chunks for a specific persona."""
    if index is None:
        return
    try:
        index.delete(filter={"user_id": user_id, "persona_id": persona_id})
    except Exception as e:
        logger.error(f"Failed to purge persona chunks: {e}")

async def purge_for_session(user_id: str, session_id: str) -> None:
    """Delete all chunks for a specific session."""
    if index is None:
        return
    try:
        index.delete(filter={"user_id": user_id, "session_id": session_id})
    except Exception as e:
        logger.error(f"Failed to purge session chunks: {e}")
