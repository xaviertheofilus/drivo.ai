"""Plain text extraction from .txt, .pdf, .docx uploads."""
import io
from typing import Optional


def extract_text(content: bytes, filename: str, content_type: Optional[str] = None) -> str:
    name_lower = (filename or "").lower()
    if name_lower.endswith(".txt") or (content_type or "").startswith("text/"):
        try:
            return content.decode("utf-8", errors="replace")
        except Exception:
            return content.decode("latin-1", errors="replace")
    if name_lower.endswith(".pdf") or (content_type or "") == "application/pdf":
        try:
            import fitz
            text_parts = []
            with fitz.open(stream=content, filetype="pdf") as doc:
                for page in doc:
                    text_parts.append(page.get_text())
            return "\n".join(text_parts).strip()
        except Exception as e:
            raise RuntimeError(f"PDF parse failed: {e}")
    if name_lower.endswith(".docx") or "officedocument" in (content_type or ""):
        try:
            from docx import Document
            doc = Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs).strip()
        except Exception as e:
            raise RuntimeError(f"DOCX parse failed: {e}")
    # Fallback: try as text
    try:
        return content.decode("utf-8", errors="replace")
    except Exception:
        return ""
