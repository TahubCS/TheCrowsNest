# Material Upload Safety Implementation Guide

## Goal
Design a robust upload-to-embedding pipeline that:
- blocks dangerous or low-quality uploads early,
- preserves AI retrieval quality,
- captures audit data for moderation,
- provides clear user-facing outcomes.

## Current Flow
1. Browser requests signed upload URL via `/api/materials/presign`.
2. Browser uploads file to Supabase Storage.
3. Browser calls `/api/materials` to persist metadata.
4. Next.js API calls Python backend `/evaluate-and-ingest`.
5. Python extracts text, evaluates relevance, and (if approved) embeds chunks.

---

## Policy Table (Rule Set v1)

| Rule ID | Gate | Condition | Action | Reason Code | User Message |
|---|---|---|---|---|---|
| UP-001 | Presign | MIME not in allowlist | Reject | unsupported_type | This file type is not supported. |
| UP-002 | Presign | Extension does not match MIME | Reject | mime_extension_mismatch | File extension does not match file type. |
| UP-003 | Presign | File size over 20 MB | Reject | file_too_large | File is too large. Max is 20 MB. |
| UP-004 | Pre-ingest | Magic bytes mismatch claimed type | Reject | magic_bytes_mismatch | Could not verify file format. |
| UP-005 | Pre-ingest | Unsafe filename or traversal pattern | Reject | invalid_filename | File name is invalid. |
| UP-006 | Pre-ingest | Duplicate content hash in same class window | Reject | duplicate_content | Similar material was already uploaded recently. |
| EX-001 | Extraction | Parser cannot open file | Reject | unreadable_file | File could not be read. |
| EX-002 | Extraction | Encrypted/password protected file | Reject | encrypted_file | Encrypted files are not supported. |
| EX-003 | Extraction | Pages over threshold (300) | Review | excessive_pages | File is very large and needs admin review. |
| EX-004 | Extraction | Extracted text under threshold (120 chars) | Reject | empty_or_low_text | Not enough readable text found. |
| EX-005 | Extraction | Garbled text ratio over threshold (35%) | Reject | garbled_text | Extracted text appears corrupted. |
| EX-006 | OCR | Image OCR text under threshold (80 chars) | Reject | low_ocr_content | Not enough readable text found in image. |
| RL-001 | Relevance | Deterministic hard fail (no class overlap) | Reject | irrelevant_material | File appears unrelated to this class. |
| RL-002 | Relevance | AI confidence below 50 | Reject | low_relevance_confidence | AI review found low relevance to class. |
| RL-003 | Relevance | AI confidence 50 to 74 | Review | uncertain_relevance | Uploaded and routed to admin review. |
| RL-004 | Relevance | AI confidence >= 75 and deterministic pass | Approve | approved | Material approved and processed. |
| EM-001 | Embedding | Chunk count exceeds threshold (800) | Review | excessive_chunks | File is too large for auto embedding. |
| EM-002 | Embedding | Embedding retries exhausted | Fail | embedding_failed | Processing failed, please retry later. |
| AB-001 | Abuse | User exceeds upload rate | Temp block | rate_limited | Too many uploads. Try again shortly. |
| AB-002 | Abuse | Repeated rejected uploads pattern | Review | suspicious_upload_pattern | Uploads require manual review. |

---

## Reason Code Dictionary

| Code | Meaning |
|---|---|
| unsupported_type | MIME not allowed |
| mime_extension_mismatch | Extension and MIME disagree |
| file_too_large | Upload exceeds policy size |
| magic_bytes_mismatch | Binary signature does not match type |
| invalid_filename | Unsafe filename or path pattern |
| duplicate_content | Same hash recently uploaded for class |
| unreadable_file | File cannot be parsed |
| encrypted_file | File is password-protected/encrypted |
| excessive_pages | Document is too large for auto-processing |
| empty_or_low_text | Text extraction too small |
| garbled_text | Text appears corrupted/noisy |
| low_ocr_content | OCR result too small for quality retrieval |
| irrelevant_material | Deterministic relevance failure |
| low_relevance_confidence | AI confidence below reject threshold |
| uncertain_relevance | Mid confidence, needs admin review |
| approved | Passed all gates |
| excessive_chunks | Too many chunks for cost-safe ingestion |
| embedding_failed | Embedding pipeline failed after retries |
| rate_limited | Upload rate exceeded |
| suspicious_upload_pattern | Repeated low-quality upload behavior |

---

## Database Changes (SQL Plan)

### 1) Alter materials table for auditability and lifecycle

```sql
ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS file_extension TEXT,
  ADD COLUMN IF NOT EXISTS content_hash_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS parser_status TEXT,
  ADD COLUMN IF NOT EXISTS extract_char_count INTEGER,
  ADD COLUMN IF NOT EXISTS page_count INTEGER,
  ADD COLUMN IF NOT EXISTS ocr_used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS rejection_code TEXT,
  ADD COLUMN IF NOT EXISTS ingestion_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT;
```

### 2) Add optional upload event log table

```sql
CREATE TABLE IF NOT EXISTS material_upload_events (
  event_id BIGSERIAL PRIMARY KEY,
  material_id TEXT REFERENCES materials(material_id) ON DELETE CASCADE,
  class_id TEXT REFERENCES classes(class_id),
  user_email TEXT REFERENCES users(email),
  event_type TEXT NOT NULL,
  event_stage TEXT NOT NULL,
  decision TEXT,
  reason_code TEXT,
  reason_text TEXT,
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3) Add indexes for operations and anti-spam

```sql
CREATE INDEX IF NOT EXISTS idx_materials_content_hash ON materials(content_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_materials_class_hash ON materials(class_id, content_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_materials_rejection_code ON materials(rejection_code);
CREATE INDEX IF NOT EXISTS idx_materials_processed_at ON materials(processed_at);
CREATE INDEX IF NOT EXISTS idx_material_upload_events_material_id ON material_upload_events(material_id);
CREATE INDEX IF NOT EXISTS idx_material_upload_events_user_time ON material_upload_events(user_email, created_at DESC);
```

### 4) Add uniqueness policy for duplicate suppression (optional strict mode)

```sql
-- Optional: hard uniqueness by class+hash
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_materials_class_hash
--   ON materials(class_id, content_hash_sha256)
--   WHERE content_hash_sha256 IS NOT NULL;
```

---

## API and Service Change Matrix

| Layer | File | Required Change |
|---|---|---|
| Presign API | `src/app/api/materials/presign/route.ts` | Enforce MIME+extension pairs, size limits, filename sanitation, structured reason payloads |
| Materials API | `src/app/api/materials/route.ts` | Persist new metadata fields, save and update reason codes, route decisions to statuses |
| Data layer | `src/lib/db.ts` | Add helpers to update parser metrics, rejection code, confidence, processing attempt count |
| AI backend ingestion | `ai-backend/core/ingest.py` | Return extraction metrics and deterministic extraction gate outcomes |
| AI backend relevance | `ai-backend/core/ai.py` | Add deterministic overlap checks + confidence matrix decision payload |
| AI backend vector store | `ai-backend/core/vector_store.py` | Enforce chunk caps and fail-safe error propagation |
| Backend entrypoint | `ai-backend/main.py` | Return structured evaluation object with reason codes and metrics |
| UI class page | `src/app/dashboard/classes/[classId]/page.tsx` | Surface user status and rejection reason mapped to human messages |

---

## Decision Matrix (Implementation Logic)

| Deterministic Check | AI Confidence | Final Decision | Material Status |
|---|---:|---|---|
| Fail | Any | Reject | REJECTED |
| Pass | < 50 | Reject | REJECTED |
| Pass | 50-74 | Manual Review | PENDING_REVIEW |
| Pass | >= 75 | Approve and embed | PROCESSED |

Deterministic check inputs:
- class code token overlap,
- syllabus keyword overlap,
- parser quality score,
- anti-spam signals.

---

## Implementation Steps (Execution Order)

### Phase 1: Schema and constants
1. Apply SQL migration for `materials` columns and `material_upload_events` table.
2. Add central constants file for thresholds and reason codes.
3. Add TypeScript type definitions for decision payloads.

### Phase 2: Presign hardening
1. Update presign endpoint to validate MIME+extension map.
2. Add filename normalization and unsafe pattern rejection.
3. Standardize error response format with reason code.

### Phase 3: Metadata persistence and lifecycle
1. On metadata save, persist file extension and file size.
2. Add processing status transitions:
   - `PENDING_REVIEW` initial,
   - `PROCESSED` on success,
   - `REJECTED` with rejection code,
   - `FAILED` on ingestion error.
3. Log all state transitions in `material_upload_events`.

### Phase 4: Python extraction gate
1. Compute extraction metrics: chars, pages, garble ratio, OCR used.
2. Reject unreadable or low-text files before relevance AI call.
3. Return structured gate output.

### Phase 5: Relevance gate
1. Add deterministic overlap checks in AI evaluation path.
2. Keep confidence scoring and map to matrix.
3. Persist confidence and reason code.

### Phase 6: Embedding controls
1. Enforce chunk count max and retry budget.
2. Record failure reason and mark material status `FAILED` if needed.
3. Ensure only approved items are embedded.

### Phase 7: Abuse controls
1. Add per-user rate limit checks before metadata persistence.
2. Add repeated rejection pattern routing to manual review.
3. Add duplicate hash suppression.

### Phase 8: UI and admin transparency
1. Map reason codes to clear user messages.
2. Show status badges and rejection reason in dashboard.
3. Add admin view for pending/rejected diagnostics.

---

## Structured Payload Contracts

### Evaluation response from Python backend
```json
{
  "evaluation": "APPROVED | REJECTED | PENDING | FAILED",
  "confidence": 0,
  "reason": "short human text",
  "reasonCode": "approved",
  "metrics": {
    "extractCharCount": 2450,
    "pageCount": 12,
    "ocrUsed": false,
    "garbleRatio": 0.02,
    "chunkCount": 42
  }
}
```

### API error response shape
```json
{
  "success": false,
  "message": "File is too large. Max is 20 MB.",
  "data": {
    "reasonCode": "file_too_large"
  }
}
```

---

## Rollout and Tuning Plan

### Initial thresholds (v1)
- max_file_size_bytes: 20971520
- max_pages_auto: 300
- min_extract_chars: 120
- min_ocr_chars: 80
- max_garble_ratio: 0.35
- approve_confidence: 75
- reject_confidence: 50
- max_chunks_per_material: 800
- rate_limit_uploads: 10 per 10 minutes

### Monitoring KPIs
- rejection rate by reason code,
- parser failure rate,
- percent pending vs approved,
- median embedding duration,
- duplicate rejection count,
- user appeal/retry success rate.

Adjust thresholds after 2 weeks of production data.

---

## Acceptance Criteria Checklist

| Area | Done Criteria |
|---|---|
| Security gate | Unsupported/dangerous files blocked before ingestion |
| Quality gate | Empty/garbled docs never reach embeddings |
| Relevance gate | Irrelevant docs rejected or manually reviewed |
| Reliability | Failed embeddings marked with reason and retry-safe |
| Observability | Every decision has reason code + event log |
| UX | User sees actionable status and reason |
| Admin ops | Admin can inspect pending/rejected details |

---

## Notes for Your Current Codebase
- `src/app/api/materials/presign/route.ts` already has MIME allowlist and 20 MB check; extend it with extension pairing and standardized reason codes.
- `src/app/api/materials/route.ts` already supports APPROVED/REJECTED/PENDING outcomes; enrich with structured reason codes and metrics persistence.
- `ai-backend/core/ingest.py` already extracts for PDF/PPTX/DOCX/images; add extraction quality metrics and deterministic fails before relevance evaluation.
- `ai-backend/core/ai.py` already returns confidence/reason; extend to include reasonCode and deterministic overlap checks.
- `ai-backend/core/vector_store.py` should enforce chunk caps to protect cost and latency.
