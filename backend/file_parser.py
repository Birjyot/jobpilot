"""
file_parser.py — Extract plain text from PDF, DOCX, and TXT uploads.

Supported types:
    .pdf   — via pdfplumber
    .docx  — via python-docx
    .txt   — direct read
"""

import io
from typing import Tuple


def parse_uploaded_file(file_bytes: bytes, filename: str) -> Tuple[str, str]:
    """
    Extract text from an uploaded file.

    Args:
        file_bytes: raw bytes of the uploaded file
        filename:   original filename (used to detect type)

    Returns:
        (extracted_text, detected_type)
        detected_type is one of: "pdf", "docx", "txt", "unknown"

    Raises:
        ValueError: if the file type is unsupported
        RuntimeError: if extraction fails
    """
    name_lower = filename.lower().strip()

    if name_lower.endswith(".pdf"):
        return _parse_pdf(file_bytes), "pdf"
    elif name_lower.endswith(".docx"):
        return _parse_docx(file_bytes), "docx"
    elif name_lower.endswith(".txt"):
        return _parse_txt(file_bytes), "txt"
    else:
        ext = name_lower.rsplit(".", 1)[-1] if "." in name_lower else "unknown"
        raise ValueError(
            f"Unsupported file type: .{ext}. "
            "Please upload a PDF, DOCX, or TXT file."
        )


# ─── Private extractors ───────────────────────────────────────────────────────

def _parse_pdf(data: bytes) -> str:
    try:
        import pdfplumber
    except ImportError:
        raise RuntimeError(
            "pdfplumber is not installed. Run: pip install pdfplumber"
        )
    try:
        text_parts = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        result = "\n\n".join(text_parts).strip()
        if not result:
            raise RuntimeError("PDF appears to be empty or image-only (no extractable text).")
        return result
    except Exception as e:
        raise RuntimeError(f"PDF extraction failed: {e}")


def _parse_docx(data: bytes) -> str:
    try:
        from docx import Document
    except ImportError:
        raise RuntimeError(
            "python-docx is not installed. Run: pip install python-docx"
        )
    try:
        doc = Document(io.BytesIO(data))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        result = "\n".join(paragraphs).strip()
        if not result:
            raise RuntimeError("DOCX file contains no readable text.")
        return result
    except Exception as e:
        raise RuntimeError(f"DOCX extraction failed: {e}")


def _parse_txt(data: bytes) -> str:
    # Try UTF-8 first, fall back to latin-1
    for enc in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return data.decode(enc).strip()
        except UnicodeDecodeError:
            continue
    raise RuntimeError("TXT file encoding could not be detected.")
