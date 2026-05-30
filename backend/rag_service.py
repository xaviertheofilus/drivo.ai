"""Lightweight RAG using TF-IDF over per-user chunks.

# ----------------------------------------------------------------------
# SWAP TO REAL EMBEDDINGS LATER:
# - Replace `_score_chunks` body with a vector search over stored embeddings.
# - Generate embeddings at ingestion time via OpenAI text-embedding-3-small.
# - Store the 1536-dim vector alongside each chunk in `rag_chunks` collection.
# - The retrieve_context() return contract stays the same.
# ----------------------------------------------------------------------
"""
import uuid
from typing import List, Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from db import chunks_col

CHUNK_SIZE = 512  # chars (approx tokens for v1)
OVERLAP = 64


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


async def ingest_document(
    user_id: str,
    text: str,
    source_type: str,
    source_id: Optional[str] = None,
    persona_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> int:
    chunks = chunk_text(text)
    if not chunks:
        return 0
    docs = []
    for i, c in enumerate(chunks):
        docs.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "source_type": source_type,
            "source_id": source_id,
            "persona_id": persona_id,
            "session_id": session_id,
            "chunk_index": i,
            "text": c,
        })
    if docs:
        await chunks_col.insert_many(docs)
    return len(docs)


async def retrieve_context(user_id: str, query: str, top_k: int = 5) -> List[str]:
    if not query.strip():
        return []
    # Pull all chunks for user (small data assumption — v1)
    chunks = await chunks_col.find({"user_id": user_id}, {"_id": 0, "text": 1}).to_list(2000)
    texts = [c["text"] for c in chunks]
    if not texts:
        return []
    return _score_chunks(texts, query, top_k)


def _score_chunks(texts: List[str], query: str, top_k: int = 5) -> List[str]:
    try:
        vec = TfidfVectorizer(stop_words="english").fit(texts + [query])
        m = vec.transform(texts)
        q = vec.transform([query])
        sims = cosine_similarity(q, m)[0]
        order = sims.argsort()[::-1][:top_k]
        return [texts[i] for i in order if sims[i] > 0.05]
    except Exception:
        return texts[:top_k]


async def purge_for_persona(user_id: str, persona_id: str) -> None:
    await chunks_col.delete_many({"user_id": user_id, "persona_id": persona_id})


async def purge_for_session(user_id: str, session_id: str) -> None:
    await chunks_col.delete_many({"user_id": user_id, "session_id": session_id})
