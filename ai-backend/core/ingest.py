import os
import tempfile
import fitz  # PyMuPDF
from supabase import create_client
from .config import settings
from .vector_store import add_documents

STORAGE_BUCKET = "thecrowsnest"

_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def download_and_extract_text(storage_key: str) -> list[str]:
    fd, local_path = tempfile.mkstemp(suffix=os.path.splitext(storage_key)[1] or ".pdf")
    os.close(fd)

    print(f"Downloading {storage_key} from Supabase Storage to {local_path}...")
    file_bytes = _supabase.storage.from_(STORAGE_BUCKET).download(storage_key)
    with open(local_path, "wb") as f:
        f.write(file_bytes)

    # Extract text
    texts = []
    if local_path.lower().endswith(".pdf"):
        try:
            doc = fitz.open(local_path)
            for page in doc:
                texts.append(page.get_text())
            doc.close()
        except Exception as e:
            print(f"PyMuPDF fast-extraction failed: {e}. Activating pdfplumber Dual-Engine fallback...")
            import pdfplumber
            with pdfplumber.open(local_path) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    texts.append(extracted or "")
    elif local_path.lower().endswith(".pptx"):
        from pptx import Presentation
        prs = Presentation(local_path)
        for slide in prs.slides:
            slide_text = []
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    slide_text.append(shape.text.strip())
            texts.append("\n".join(slide_text))
    elif local_path.lower().endswith(".docx"):
        from docx import Document
        doc = Document(local_path)
        content = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        texts = [content[i:i+2000] for i in range(0, len(content), 2000)]
    elif local_path.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
        from .ai import extract_text_from_image
        content = extract_text_from_image(local_path)
        if content:
            texts = [content[i:i+2000] for i in range(0, len(content), 2000)]
    else:
        with open(local_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            texts = [content[i:i+2000] for i in range(0, len(content), 2000)]

    # Cleanup
    if os.path.exists(local_path):
        os.remove(local_path)

    # Strip null bytes to prevent PostgreSQL 'cannot contain NUL' errors
    return [t.replace('\x00', '') for t in texts if t.strip()]


def process_material(class_id: str, material_id: str, storage_key: str, file_name: str):
    print(f"Processing material: {file_name} for class: {class_id}")
    texts = download_and_extract_text(storage_key)
    metadatas = [{"source": file_name, "page": i+1} for i in range(len(texts))]
    add_documents(class_id, material_id, texts, metadatas)
    print("Added material to PostgreSQL Database.")


def download_extract_and_evaluate(class_id: str, material_id: str, storage_key: str, file_name: str, class_context: str) -> dict:
    """Autonomous evaluation logic."""
    print(f"Autonomous Evaluation for material: {file_name} (class: {class_id})")

    # 1. Extract text
    texts = download_and_extract_text(storage_key)
    if not texts:
        return {"evaluation": "REJECTED", "confidence": 0, "reason": "File is empty or unreadable."}

    # 2. Grab a snippet of the text (first ~15,000 characters to fit context window comfortably)
    full_text = " ".join(texts)
    snippet = full_text[:15000]

    # 3. Evaluate using Google Gemini
    from .ai import evaluate_material_against_syllabus
    try:
        results = evaluate_material_against_syllabus(class_context, snippet)
        confidence = results.get("confidence", 50)
        reason = results.get("reason", "Unknown reason.")
    except Exception as e:
        print(f"AI Evaluation failed: {e}")
        return {"evaluation": "PENDING", "confidence": 50, "reason": "AI evaluation crashed. Needs manual review."}

    print(f"Evaluation resulted in confidence {confidence}: {reason}")

    # 4. Tri-State Logic Execution
    if confidence >= 75:
        print(f"Confidence {confidence} >= 75. Approving.")
        metadatas = [{"source": file_name, "page": i+1} for i in range(len(texts))]
        return {
            "evaluation": "APPROVED",
            "confidence": confidence,
            "reason": reason,
            "texts": texts,
            "metadatas": metadatas
        }
    elif confidence >= 50:
        print(f"Confidence {confidence} between 50 and 74. Leaving as PENDING_REVIEW.")
        return {"evaluation": "PENDING", "confidence": confidence, "reason": reason}
    else:
        print("Confidence < 50. Marking REJECTED for auto-deletion.")
        return {"evaluation": "REJECTED", "confidence": confidence, "reason": reason}
