-- Material Upload Safety: schema additions
-- Adds audit columns to materials + event log table + indexes

-- 1) Extend materials table with safety/audit columns
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

-- 2) Upload event log table for full audit trail
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

-- 3) Indexes for operations and anti-spam
CREATE INDEX IF NOT EXISTS idx_materials_content_hash ON materials(content_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_materials_class_hash ON materials(class_id, content_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_materials_rejection_code ON materials(rejection_code);
CREATE INDEX IF NOT EXISTS idx_materials_processed_at ON materials(processed_at);
CREATE INDEX IF NOT EXISTS idx_material_upload_events_material_id ON material_upload_events(material_id);
CREATE INDEX IF NOT EXISTS idx_material_upload_events_user_time ON material_upload_events(user_email, created_at DESC);
