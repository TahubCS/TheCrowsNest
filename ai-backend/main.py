import math
import json
import time
import traceback
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

from core.ingest import process_material, _update_parser_status, _supabase, STORAGE_BUCKET
from core.ai import (
    generate_flashcards,
    generate_personal_flashcards_from_materials,
    generate_personal_practice_exam_from_materials,
    generate_shared_flashcards_from_materials,
    generate_shared_practice_exam_from_materials,
    generate_study_plan_from_context,
    generate_practice_exam,
    chat_with_tutor,
    stream_chat_with_tutor,
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


def _get_unprocessed_material_ids(class_id: str, resource_type: str) -> list[str]:
    """Return material IDs that are PROCESSED but not yet covered for this resource_type."""
    materials_res = _supabase.table("materials").select("material_id").eq("class_id", class_id).eq("status", "PROCESSED").execute()
    covered_res = (
        _supabase.table("shared_material_coverage")
        .select("material_id")
        .eq("class_id", class_id)
        .eq("resource_type", resource_type)
        .execute()
    )

    all_ids = [row.get("material_id") for row in (materials_res.data or []) if row.get("material_id")]
    covered_ids = {row.get("material_id") for row in (covered_res.data or []) if row.get("material_id")}
    return [mid for mid in all_ids if mid not in covered_ids]


def _record_material_coverage(class_id: str, material_ids: list[str], trigger_material_id: str | None, resource_type: str):
    """Mark materials as covered for a given resource_type."""
    rows = [
        {
            "class_id": class_id,
            "material_id": material_id,
            "resource_type": resource_type,
            "generation_trigger_material_id": trigger_material_id,
        }
        for material_id in material_ids
    ]
    if not rows:
        return

    _supabase.table("shared_material_coverage").upsert(rows, on_conflict="class_id,material_id,resource_type").execute()


# Material types that qualify to generate study plan items.
# Notes and Other are excluded — they don't represent structured course content.
STUDY_PLAN_MATERIAL_TYPES = {"Lecture Slides", "Syllabus", "Study Guide", "Past Exam"}


def _generate_shared_resources(class_id: str, trigger_material_id: str | None = None):
    """Incrementally grow shared flashcards, exam, and study plan for a class.
    Called after a high-context material is fully embedded.

    All three resource types follow the same pattern:
      1. Find PROCESSED materials not yet covered for this resource type.
      2. Generate 5 new items/questions from those materials only.
      3. Merge with existing items (deduplicated).
      4. Record coverage so those materials are never re-processed.
    """
    try:
        _supabase.table("shared_resources").upsert({
            "class_id": class_id,
            "generation_status": "generating",
        }, on_conflict="class_id").execute()

        print(f"[SHARED] Starting incremental shared resource update for class {class_id}...")

        # Fetch existing shared resource row for merging
        existing_res = (
            _supabase.table("shared_resources")
            .select("flashcards_json, study_plan_json, shared_exam_session_id")
            .eq("class_id", class_id)
            .maybe_single()
            .execute()
        )
        existing_data = existing_res.data or {}

        shared_resource_update: dict = {
            "class_id": class_id,
            "generation_status": "ready",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # ── Flashcards (no material_type gate — all high-context materials qualify) ──
        unprocessed_for_flashcards = _get_unprocessed_material_ids(class_id, "flashcards")
        if unprocessed_for_flashcards:
            print(f"[SHARED] Generating flashcards from {len(unprocessed_for_flashcards)} new material(s)...")
            new_cards = generate_shared_flashcards_from_materials(class_id, unprocessed_for_flashcards, count=5)
            if new_cards:
                existing_cards = _normalize_flashcards(existing_data.get("flashcards_json"))
                merged_cards = _dedupe_flashcards(existing_cards + _normalize_flashcards(new_cards))
                shared_resource_update["flashcards_json"] = merged_cards
                _record_material_coverage(class_id, unprocessed_for_flashcards, trigger_material_id, "flashcards")
                print(f"[SHARED] Flashcards: {len(existing_cards)} existing + {len(new_cards)} new = {len(merged_cards)} total")
        else:
            print(f"[SHARED] Flashcards: no new materials to process.")

        # ── Exam (no material_type gate — all high-context materials qualify) ──
        unprocessed_for_exam = _get_unprocessed_material_ids(class_id, "exam")
        if unprocessed_for_exam:
            print(f"[SHARED] Generating exam questions from {len(unprocessed_for_exam)} new material(s)...")
            new_questions = generate_shared_practice_exam_from_materials(class_id, unprocessed_for_exam, count=5)
            if new_questions:
                existing_session_id = existing_data.get("shared_exam_session_id")
                existing_questions: list[dict] = []

                if existing_session_id:
                    # Fetch and extend the existing exam session
                    session_res = (
                        _supabase.table("exam_sessions")
                        .select("content_json, question_count")
                        .eq("id", existing_session_id)
                        .maybe_single()
                        .execute()
                    )
                    if session_res.data:
                        content = session_res.data.get("content_json") or {}
                        existing_questions = content.get("questions", []) if isinstance(content, dict) else []

                # Deduplicate on question text
                seen_texts: set[str] = {" ".join(q.get("text", "").lower().split()) for q in existing_questions}
                for q in new_questions:
                    key = " ".join(q.get("text", "").lower().split())
                    if key and key not in seen_texts:
                        existing_questions.append(q)
                        seen_texts.add(key)

                merged_exam = {"title": "Community Practice Exam", "questions": existing_questions}
                merged_count = len(existing_questions)

                if existing_session_id:
                    # Update the existing session row — do NOT create a new one
                    _supabase.table("exam_sessions").update({
                        "content_json": merged_exam,
                        "question_count": merged_count,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("id", existing_session_id).execute()
                    shared_resource_update["shared_exam_question_count"] = merged_count
                    shared_resource_update["shared_exam_updated_at"] = datetime.now(timezone.utc).isoformat()
                    print(f"[SHARED] Exam: updated session {existing_session_id}, now {merged_count} questions")
                else:
                    # First time — create the initial session
                    session_resp = _supabase.table("exam_sessions").insert({
                        "class_id": class_id,
                        "user_email": None,
                        "exam_scope": "shared",
                        "resource_type": "exam",
                        "suggested_question_count": merged_count,
                        "question_count": merged_count,
                        "difficulty": "Medium",
                        "material_ids": [],
                        "content_json": merged_exam,
                        "generation_status": "ready",
                    }).execute()
                    if session_resp.data:
                        new_session_id = session_resp.data[0].get("id")
                        shared_resource_update["shared_exam_session_id"] = new_session_id
                        shared_resource_update["exam_json"] = existing_questions
                        shared_resource_update["shared_exam_question_count"] = merged_count
                        shared_resource_update["shared_exam_updated_at"] = datetime.now(timezone.utc).isoformat()
                        print(f"[SHARED] Exam: created first session with {merged_count} questions")

                _record_material_coverage(class_id, unprocessed_for_exam, trigger_material_id, "exam")
        else:
            print(f"[SHARED] Exam: no new materials to process.")

        # ── Study Plan (gated by material_type) ──
        unprocessed_for_sp = _get_unprocessed_material_ids(class_id, "study_plan")
        if unprocessed_for_sp:
            # Filter to only academically structured content types
            type_res = (
                _supabase.table("materials")
                .select("material_id, material_type")
                .in_("material_id", unprocessed_for_sp)
                .execute()
            )
            qualifying_ids = [
                row["material_id"] for row in (type_res.data or [])
                if row.get("material_type") in STUDY_PLAN_MATERIAL_TYPES
            ]

            if qualifying_ids:
                print(f"[SHARED] Generating study plan items from {len(qualifying_ids)} qualifying material(s)...")
                new_items = generate_study_plan_from_context(class_id, material_ids=qualifying_ids)
                if new_items:
                    existing_items: list[dict] = existing_data.get("study_plan_json") or []
                    if not isinstance(existing_items, list):
                        existing_items = []

                    seen_titles: set[str] = {" ".join(i.get("title", "").lower().split()) for i in existing_items}
                    for item in new_items:
                        key = " ".join(item.get("title", "").lower().split())
                        if key and key not in seen_titles:
                            existing_items.append(item)
                            seen_titles.add(key)

                    shared_resource_update["study_plan_json"] = existing_items
                    print(f"[SHARED] Study plan: {len(existing_items)} total items after merge")
            else:
                print(f"[SHARED] Study plan: {len(unprocessed_for_sp)} new material(s) don't qualify by type — skipping.")

            # Record coverage for ALL unprocessed materials (including non-qualifying ones)
            # so they aren't re-evaluated on the next trigger
            _record_material_coverage(class_id, unprocessed_for_sp, trigger_material_id, "study_plan")
        else:
            print(f"[SHARED] Study plan: no new materials to process.")

        _supabase.table("shared_resources").upsert(shared_resource_update, on_conflict="class_id").execute()
        print(f"[SHARED] Shared resources updated for class {class_id}")

    except Exception as e:
        print(f"[SHARED ERROR] Failed to update shared resources for {class_id}: {e}")
        traceback.print_exc()
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
    timeframe: str = "Current semester"
    materialIds: list[str] = []

@app.post("/generate/study-plan")
async def study_plan(req: StudyPlanReq):
    plan = generate_study_plan_from_context(
        req.classId, 
        material_ids=req.materialIds if req.materialIds else None, 
        timeframe=req.timeframe
    )
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

@app.post("/chat/stream")
async def chat_stream(req: ChatReq):
    def generate():
        for chunk in stream_chat_with_tutor(req.classId, req.messages):
            yield chunk
    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")

@app.delete("/materials/{material_id}")
async def delete_material_vectors(material_id: str):
    from core.vector_store import delete_documents
    delete_documents(material_id)
    return {"success": True}

@app.get("/")
def root():
    return {"status": "ok", "service": "TheCrowsNest AI Backend"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
