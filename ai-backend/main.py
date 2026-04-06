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
from core.ai import (
    generate_flashcards,
    generate_personal_flashcards_from_materials,
    generate_personal_practice_exam_from_materials,
    generate_shared_flashcards_from_materials,
    generate_study_plan,
    generate_practice_exam,
    chat_with_tutor,
    suggest_practice_exam_question_count,
)
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
# Context scoring — determines if an upload is "high context"
# enough to trigger shared-resource regeneration.
#
# Examples:
#   30-page lecture slides: 15 + 3 = 18 → high context
#   3-page student notes:   1.5 + 0.3 = 1.8 → low context
# ============================================================

HIGH_CONTEXT_THRESHOLD = 15

def _compute_context_score(metrics: dict) -> float:
    page_count = metrics.get("pageCount", 0) or 0
    char_count = metrics.get("extractCharCount", 0) or 0
    return (page_count * 0.5) + (char_count * 0.0001)


def _count_exam_questions(exam_payload: object) -> int:
    if isinstance(exam_payload, dict):
        questions = exam_payload.get("questions", [])
    elif isinstance(exam_payload, list):
        questions = exam_payload
    else:
        questions = []

    return len(questions) if isinstance(questions, list) else 0


def _normalize_flashcards(cards: object) -> list[dict]:
    if not isinstance(cards, list):
        return []

    normalized: list[dict] = []
    for card in cards:
        if not isinstance(card, dict):
            continue
        front = str(card.get("front", "")).strip()
        back = str(card.get("back", "")).strip()
        if not front or not back:
            continue
        normalized.append({"front": front, "back": back})
    return normalized


def _dedupe_flashcards(cards: list[dict]) -> list[dict]:
    seen: set[str] = set()
    deduped: list[dict] = []
    for card in cards:
        front = str(card.get("front", "")).strip().lower()
        key = " ".join(front.split())
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(card)
    return deduped


def _get_unprocessed_material_ids_for_flashcards(class_id: str) -> list[str]:
    materials_res = _supabase.table("materials").select("material_id").eq("class_id", class_id).eq("status", "PROCESSED").execute()
    processed_res = _supabase.table("shared_flashcard_material_coverage").select("material_id").eq("class_id", class_id).execute()

    all_ids = [row.get("material_id") for row in (materials_res.data or []) if row.get("material_id")]
    covered_ids = {row.get("material_id") for row in (processed_res.data or []) if row.get("material_id")}
    return [material_id for material_id in all_ids if material_id not in covered_ids]


def _record_flashcard_material_coverage(class_id: str, material_ids: list[str], trigger_material_id: str | None):
    rows = [
        {
            "class_id": class_id,
            "material_id": material_id,
            "generation_trigger_material_id": trigger_material_id,
        }
        for material_id in material_ids
    ]
    if not rows:
        return

    _supabase.table("shared_flashcard_material_coverage").upsert(rows, on_conflict="class_id,material_id").execute()


def _generate_shared_resources(class_id: str, trigger_material_id: str | None = None):
    """Regenerate shared exam/study-plan/flashcards for a class.
    Called after a high-context material is embedded."""
    try:
        # Mark status as generating
        _supabase.table("shared_resources").upsert({
            "class_id": class_id,
            "generation_status": "generating",
        }, on_conflict="class_id").execute()

        print(f"[SHARED] Generating shared resources for class {class_id}...")

        existing_shared_res = _supabase.table("shared_resources").select("flashcards_json").eq("class_id", class_id).maybe_single().execute()
        existing_shared_cards = _normalize_flashcards((existing_shared_res.data or {}).get("flashcards_json"))

        suggested_exam_count = suggest_practice_exam_question_count(class_id, topic="Core class concepts")

        # Generate each resource type using existing AI functions.
        # Keep these defaults intentionally balanced: challenging but learnable.
        exam_result = generate_practice_exam(
            class_id,
            topic="Core class concepts",
            difficulty="Medium",
            count=suggested_exam_count,
        )
        unprocessed_material_ids = _get_unprocessed_material_ids_for_flashcards(class_id)
        flashcards_result: list[dict] = []
        if unprocessed_material_ids:
            flashcards_result = generate_shared_flashcards_from_materials(
                class_id,
                unprocessed_material_ids,
                count=5,
            )
        study_plan_result = generate_study_plan(
            class_id,
            timeframe="Current semester",
        )

        merged_flashcards = _dedupe_flashcards(existing_shared_cards + _normalize_flashcards(flashcards_result))

        exam_questions = exam_result.get("questions", []) if isinstance(exam_result, dict) else []
        exam_question_count = _count_exam_questions(exam_result)

        exam_session_payload = {
            "class_id": class_id,
            "user_email": None,
            "exam_scope": "shared",
            "resource_type": "exam",
            "suggested_question_count": suggested_exam_count,
            "question_count": exam_question_count or suggested_exam_count,
            "difficulty": "Medium",
            "material_ids": [],
            "content_json": exam_result,
            "generation_status": "ready",
        }

        session_response = _supabase.table("exam_sessions").insert(exam_session_payload).execute()
        shared_session_id = None
        if session_response.data:
            shared_session_id = session_response.data[0].get("id")

        # Upsert into shared_resources table
        _supabase.table("shared_resources").upsert({
            "class_id": class_id,
            "exam_json": exam_questions if exam_questions else None,
            "shared_exam_session_id": shared_session_id,
            "shared_exam_question_count": exam_question_count or suggested_exam_count,
            "shared_exam_updated_at": datetime.now(timezone.utc).isoformat(),
            "flashcards_json": merged_flashcards if merged_flashcards else None,
            "study_plan_json": study_plan_result if study_plan_result else None,
            "generation_status": "ready",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, on_conflict="class_id").execute()

        if unprocessed_material_ids and flashcards_result:
            _record_flashcard_material_coverage(class_id, unprocessed_material_ids, trigger_material_id)

        print(f"[SHARED] Shared resources ready for class {class_id}")
    except Exception as e:
        print(f"[SHARED ERROR] Failed to generate shared resources for {class_id}: {e}")
        traceback.print_exc()
        # Mark as idle (failed) so it can be retried
        try:
            _supabase.table("shared_resources").upsert({
                "class_id": class_id,
                "generation_status": "idle",
            }, on_conflict="class_id").execute()
        except:
            pass


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

            # Compute context score to decide if shared resources should be regenerated
            context_score = _compute_context_score(metrics)
            high_context = context_score >= HIGH_CONTEXT_THRESHOLD
            print(f"[EVAL] Context score: {context_score:.2f} (threshold: {HIGH_CONTEXT_THRESHOLD}, high_context: {high_context})")

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
                "high_context": high_context,
                "context_score": context_score,
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

                    # If this was a high-context material, regenerate shared resources
                    if high_context:
                        print(f"[EMBED] High-context material — triggering shared resource generation...")
                        _generate_shared_resources(req.classId, req.materialId)

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
    materialIds: list[str] = []
    questionCount: int | None = None


def _clamp_flashcard_count(value: int | None, default: int = 20) -> int:
    try:
        parsed = int(value) if value is not None else default
    except (TypeError, ValueError):
        parsed = default
    return max(5, min(30, parsed))

@app.post("/generate/flashcards")
async def flashcards(req: FlashcardsReq):
    target_count = _clamp_flashcard_count(req.questionCount if req.questionCount is not None else req.count, default=20)

    if req.materialIds:
        cards = generate_personal_flashcards_from_materials(
            req.classId,
            req.materialIds,
            count=target_count,
        )
    else:
        cards = generate_flashcards(req.classId, req.topic, target_count, req.style)

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
    materialIds: list[str] = []

@app.post("/generate/practice-exam")
async def practice_exam(req: PracticeExamReq):
    if req.materialIds:
        exam = generate_personal_practice_exam_from_materials(
            req.classId,
            req.materialIds,
            topic=req.topic,
            difficulty=req.difficulty,
            count=req.count,
        )
    else:
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
