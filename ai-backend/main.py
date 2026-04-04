import math
import json
import time
import traceback
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from core.ingest import process_material, _update_parser_status, _supabase, STORAGE_BUCKET
from core.ai import generate_flashcards, generate_study_plan, generate_practice_exam, chat_with_tutor
from core.vector_store import pool

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    pool.close()

app = FastAPI(title="The Crows Nest AI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Helpers — direct DB updates for material lifecycle
# ============================================================

def _update_material_status(material_id: str, class_id: str, updates: dict):
    """Update material columns directly in PostgreSQL."""
    if not updates:
        return
    set_clauses = ", ".join(f"{k} = %s" for k in updates.keys())
    values = list(updates.values()) + [material_id, class_id]
    query = f"UPDATE materials SET {set_clauses} WHERE material_id = %s AND class_id = %s"
    try:
        with pool.connection() as conn:
            conn.execute(query, values)
        print(f"[DB] Updated material {material_id}: {list(updates.keys())}")
    except Exception as e:
        print(f"[DB ERROR] Failed to update material {material_id}: {e}")
        print(f"[DB ERROR] Query: {query}")
        print(f"[DB ERROR] Values: {values}")
        raise


def _log_upload_event(material_id: str, class_id: str, user_email: str,
                      event_type: str, event_stage: str, decision: str = None,
                      reason_code: str = None, reason_text: str = None, metrics: dict = None):
    """Log to material_upload_events table."""
    try:
        with pool.connection() as conn:
            conn.execute(
                """INSERT INTO material_upload_events
                   (material_id, class_id, user_email, event_type, event_stage,
                    decision, reason_code, reason_text, metrics)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (material_id, class_id, user_email, event_type, event_stage,
                 decision, reason_code, reason_text,
                 json.dumps(metrics) if metrics else None)
            )
    except Exception as e:
        print(f"[DB WARNING] Failed to log upload event: {e}")


def _mark_material_failed(material_id: str, class_id: str, error: Exception, storage_key: str | None = None):
    """Best-effort terminal failure update with explicit logging."""
    # Delete file from storage so orphaned files don't accumulate in the bucket
    if storage_key:
        try:
            _supabase.storage.from_(STORAGE_BUCKET).remove([storage_key])
            print(f"[STORAGE] Deleted failed file {storage_key} from bucket")
        except Exception as s_err:
            print(f"[STORAGE WARNING] Could not delete failed file {storage_key}: {s_err}")
    try:
        _update_material_status(material_id, class_id, {
            "status": "FAILED",
            "last_error": str(error)[:500],
            "parser_status": "error",
        })
        print(f"[DB] Marked material {material_id} as FAILED")
    except Exception as db_err:
        print(f"[CRITICAL] Failed to mark material {material_id} as FAILED: {db_err}")
        print(f"[CRITICAL] Original error for material {material_id}: {error}")


# ============================================================
# Routes
# ============================================================

class IngestReq(BaseModel):
    classId: str
    materialId: str
    storageKey: str
    fileName: str

@app.post("/ingest")
def ingest_material(req: IngestReq):
    process_material(req.classId, req.materialId, req.storageKey, req.fileName)
    return {"success": True}

class EvalIngestReq(BaseModel):
    classId: str
    materialId: str
    storageKey: str
    fileName: str
    classContext: str
    userEmail: str = ""

@app.post("/evaluate-and-ingest")
def evaluate_and_ingest(req: EvalIngestReq, background_tasks: BackgroundTasks):
    """
    Evaluate a material and handle the full lifecycle.
    Next.js fires this without awaiting — we update the DB directly at each stage.

    NOTE: This is a regular `def` (not async) so FastAPI runs it in a thread pool,
    preventing the blocking sync code from freezing the event loop.
    """
    from core.ingest import download_extract_and_evaluate
    from core.vector_store import add_documents, ChunkCapExceededError, EmbeddingExhaustedError, MAX_CHUNKS_PER_MATERIAL

    print(f"\n{'='*60}")
    print(f"[EVAL] Starting evaluation for material {req.materialId}")
    print(f"[EVAL] File: {req.fileName}, Class: {req.classId}")
    print(f"{'='*60}")

    try:
        result = download_extract_and_evaluate(
            req.classId, req.materialId, req.storageKey, req.fileName, req.classContext
        )

        evaluation = result.get("evaluation", "FAILED")
        confidence = result.get("confidence", 0)
        reason = result.get("reason", "Unknown")
        reason_code = result.get("reasonCode", "")
        metrics = result.get("metrics", {})

        print(f"[EVAL] Result: {evaluation} (confidence: {confidence}, reason: {reason_code or reason})")

        # Log the evaluation event
        _log_upload_event(
            req.materialId, req.classId, req.userEmail,
            "evaluation", "ai_evaluation", evaluation, reason_code, reason, metrics
        )

        if evaluation == "APPROVED":
            texts = result.pop("texts", [])
            metadatas = result.pop("metadatas", [])

            # EM-001: Chunk cap check
            if len(texts) > MAX_CHUNKS_PER_MATERIAL:
                print(f"[EVAL] Chunk cap exceeded: {len(texts)} > {MAX_CHUNKS_PER_MATERIAL}")
                _update_material_status(req.materialId, req.classId, {
                    "status": "PENDING_REVIEW",
                    "rejection_code": "excessive_chunks",
                    "rejection_reason": f"File produces {len(texts)} chunks (cap: {MAX_CHUNKS_PER_MATERIAL}).",
                    "ai_confidence": confidence,
                    "extract_char_count": metrics.get("extractCharCount"),
                    "page_count": metrics.get("pageCount"),
                    "ocr_used": metrics.get("ocrUsed", False),
                    "parser_status": "complete",
                })
                return {"success": True, "data": result}

            # Stay in PROCESSING until embedding is confirmed complete.
            # Only transition to PROCESSED inside safe_embed after add_documents() succeeds.
            print(f"[EVAL] Approved! Scheduling embedding (staying PROCESSING until done)...")
            _update_material_status(req.materialId, req.classId, {
                "status": "PROCESSING",
                "ai_confidence": confidence,
                "extract_char_count": metrics.get("extractCharCount"),
                "page_count": metrics.get("pageCount"),
                "ocr_used": metrics.get("ocrUsed", False),
                "parser_status": "embedding",
            })

            def safe_embed():
                try:
                    print(f"[EMBED] Starting embedding for {req.materialId} ({len(texts)} chunks)...")
                    add_documents(req.classId, req.materialId, texts, metadatas)
                    # Embedding succeeded — now it is safe to mark PROCESSED
                    _update_material_status(req.materialId, req.classId, {
                        "status": "PROCESSED",
                        "parser_status": "complete",
                        "processed_at": datetime.now(timezone.utc).isoformat(),
                    })
                    print(f"[EMBED] Completed and marked PROCESSED for {req.materialId}")
                except (ChunkCapExceededError, EmbeddingExhaustedError) as e:
                    print(f"[EMBED ERROR] {req.materialId}: {e}")
                    _mark_material_failed(req.materialId, req.classId, e, req.storageKey)
                except Exception as e:
                    print(f"[EMBED ERROR] Unexpected: {req.materialId}: {e}")
                    _mark_material_failed(req.materialId, req.classId, e, req.storageKey)

            background_tasks.add_task(safe_embed)

        elif evaluation == "REJECTED":
            print(f"[EVAL] Rejected. Deleting file from storage and updating DB...")
            try:
                _supabase.storage.from_(STORAGE_BUCKET).remove([req.storageKey])
            except Exception as e:
                print(f"[STORAGE WARNING] Failed to delete rejected file: {e}")

            seven_days = math.floor(time.time()) + (7 * 24 * 60 * 60)
            _update_material_status(req.materialId, req.classId, {
                "status": "REJECTED",
                "rejection_code": reason_code,
                "rejection_reason": f"AI Auto-Rejection: {reason}",
                "ai_confidence": confidence,
                "extract_char_count": metrics.get("extractCharCount"),
                "page_count": metrics.get("pageCount"),
                "ocr_used": metrics.get("ocrUsed", False),
                "expires_at": seven_days,
                "parser_status": "complete",
            })

        elif evaluation == "PENDING":
            print(f"[EVAL] Pending review. Updating DB...")
            _update_material_status(req.materialId, req.classId, {
                "status": "PENDING_REVIEW",
                "rejection_code": reason_code,
                "ai_confidence": confidence,
                "extract_char_count": metrics.get("extractCharCount"),
                "page_count": metrics.get("pageCount"),
                "ocr_used": metrics.get("ocrUsed", False),
                "parser_status": "complete",
            })

        else:
            print(f"[EVAL] Unknown/Failed evaluation: {evaluation}")
            try:
                _supabase.storage.from_(STORAGE_BUCKET).remove([req.storageKey])
                print(f"[STORAGE] Deleted failed file {req.storageKey} from bucket")
            except Exception as e:
                print(f"[STORAGE WARNING] Could not delete failed file: {e}")
            _update_material_status(req.materialId, req.classId, {
                "status": "FAILED",
                "rejection_code": reason_code,
                "last_error": reason,
                "parser_status": "error",
            })

        print(f"[EVAL] Done for {req.materialId}")
        return {"success": True, "data": result}

    except Exception as e:
        print(f"[CRITICAL] evaluate-and-ingest crashed for {req.materialId}:")
        traceback.print_exc()
        _mark_material_failed(req.materialId, req.classId, e, req.storageKey)
        return {"success": False, "error": str(e)}


class FlashcardsReq(BaseModel):
    classId: str
    topic: str = "Key core concepts"
    count: int = 20
    style: str = "Concepts"

@app.post("/generate/flashcards")
async def flashcards(req: FlashcardsReq):
    cards = generate_flashcards(req.classId, req.topic, req.count, req.style)
    return {"success": True, "data": {"flashcards": cards}}

class StudyPlanReq(BaseModel):
    classId: str
    timeframe: str = "1 week"

@app.post("/generate/study-plan")
async def study_plan(req: StudyPlanReq):
    plan = generate_study_plan(req.classId, req.timeframe)
    return {"success": True, "data": {"studyPlan": plan}}

class PracticeExamReq(BaseModel):
    classId: str
    topic: str = "General"
    difficulty: str = "Medium"
    count: int = 10

@app.post("/generate/practice-exam")
async def practice_exam(req: PracticeExamReq):
    exam = generate_practice_exam(req.classId, req.topic, req.difficulty, req.count)
    return {"success": True, "data": {"practiceExam": exam}}

class ChatReq(BaseModel):
    classId: str
    messages: list[dict]

@app.post("/chat")
async def chat(req: ChatReq):
    reply = chat_with_tutor(req.classId, req.messages)
    return {"success": True, "reply": reply}

@app.delete("/materials/{material_id}")
async def delete_material_vectors(material_id: str):
    from core.vector_store import delete_documents
    delete_documents(material_id)
    return {"success": True}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
