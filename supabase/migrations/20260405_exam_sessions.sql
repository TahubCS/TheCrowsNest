-- ============================================================
-- TheCrowsNest — Exam Session Model Migration
-- Supports shared class exams, multiple personal exam generations,
-- and dynamic question counts (5..30) with AI-suggested defaults.
-- ============================================================

-- 1) Exam sessions — one row per generated exam instance
CREATE TABLE IF NOT EXISTS exam_sessions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id                  TEXT NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
  user_email                TEXT REFERENCES users(email) ON DELETE SET NULL,
  exam_scope                TEXT NOT NULL CHECK (exam_scope IN ('shared', 'personal')),
  resource_type             TEXT NOT NULL DEFAULT 'exam' CHECK (resource_type = 'exam'),
  suggested_question_count   INT NOT NULL CHECK (suggested_question_count BETWEEN 5 AND 30),
  question_count            INT NOT NULL CHECK (question_count BETWEEN 5 AND 30),
  difficulty                TEXT NOT NULL DEFAULT 'Medium',
  material_ids              TEXT[] DEFAULT '{}'::TEXT[],
  content_json              JSONB NOT NULL,
  generation_status         TEXT NOT NULL DEFAULT 'ready' CHECK (generation_status IN ('generating', 'ready', 'failed')),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Shared resources — keep latest shared exam pointer + summary fields
ALTER TABLE shared_resources
  ADD COLUMN IF NOT EXISTS shared_exam_session_id UUID REFERENCES exam_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shared_exam_question_count INT,
  ADD COLUMN IF NOT EXISTS shared_exam_updated_at TIMESTAMPTZ;

-- 3) Personal resources — compatibility columns for exam history/querying
ALTER TABLE personal_resources
  ADD COLUMN IF NOT EXISTS exam_session_id UUID REFERENCES exam_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suggested_question_count INT,
  ADD COLUMN IF NOT EXISTS question_count INT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- 4) Helpful indexes for saved exam history and class-level lookups
CREATE INDEX IF NOT EXISTS idx_exam_sessions_class_scope_created
  ON exam_sessions(class_id, exam_scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_class_created
  ON exam_sessions(user_email, class_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_status
  ON exam_sessions(generation_status);

CREATE INDEX IF NOT EXISTS idx_personal_resources_user_class_created
  ON personal_resources(user_email, class_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_personal_resources_type_class_user
  ON personal_resources(resource_type, class_id, user_email);

-- 5) Optional array search optimization for future material-based filtering
CREATE INDEX IF NOT EXISTS idx_personal_resources_material_ids_gin
  ON personal_resources USING GIN (material_ids);

-- 6) Seed note: question-count policy should be enforced in backend routes
--    and clamped to 5..30 even if AI suggests a value outside that range.
