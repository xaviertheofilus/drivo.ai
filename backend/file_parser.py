"""Plain text extraction using OpenAI Vision API for images/PDFs and standard parsers for text/docx."""
import io
import os
import base64
from typing import Optional, List
import fitz  # PyMuPDF
from openai import OpenAI
from docx import Document
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def _encode_image(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode('utf-8')

async def _parse_with_vision(image_bytes: bytes) -> str:
    """Use OpenAI Vision to extract text from an image."""
    base64_image = _encode_image(image_bytes)
    
    response = client.chat.completions.create(
        model="gpt-4o", # Using gpt-4o for vision tasks
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract all text from this document image. Return only the extracted text, maintaining the layout where possible. Do not add any commentary."},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}",
                        },
                    },
                ],
            }
        ],
        max_tokens=2000,
    )
    return response.choices[0].message.content

async def extract_text(content: bytes, filename: str, content_type: Optional[str] = None) -> str:
    name_lower = (filename or "").lower()
    
    # Image files
    if name_lower.endswith((".png", ".jpg", ".jpeg", ".webp")) or (content_type or "").startswith("image/"):
        return await _parse_with_vision(content)

    # PDF files - use Vision for each page if it looks like a scan, or just use fitz for text
    if name_lower.endswith(".pdf") or (content_type or "") == "application/pdf":
        try:
            text_parts = []
            with fitz.open(stream=content, filetype="pdf") as doc:
                # If the PDF has actual text, use it. If not, use Vision.
                for page in doc:
                    page_text = page.get_text().strip()
                    if page_text:
                        text_parts.append(page_text)
                    else:
                        # Convert page to image for Vision
                        pix = page.get_pixmap()
                        img_bytes = pix.tobytes("jpeg")
                        vision_text = await _parse_with_vision(img_bytes)
                        text_parts.append(vision_text)
            return "\n".join(text_parts).strip()
        except Exception as e:
            raise RuntimeError(f"PDF parse failed: {e}")

    # Word files
    if name_lower.endswith(".docx") or "officedocument" in (content_type or ""):
        try:
            doc = Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs).strip()
        except Exception as e:
            raise RuntimeError(f"DOCX parse failed: {e}")

    # Plain text
    if name_lower.endswith(".txt") or (content_type or "").startswith("text/"):
        try:
            return content.decode("utf-8", errors="replace")
        except Exception:
            return content.decode("latin-1", errors="replace")

    # Fallback
    try:
        return content.decode("utf-8", errors="replace")
    except Exception:
        return ""
