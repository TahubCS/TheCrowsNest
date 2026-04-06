-- ============================================================
-- Shared Flashcard Material Coverage
-- Tracks which class materials have already been consumed by
-- shared flashcard generation to avoid reprocessing.
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_flashcard_material_coverage (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id                        TEXT NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
  material_id                     TEXT NOT NULL REFERENCES materials(material_id) ON DELETE CASCADE,
  generation_trigger_material_id  TEXT REFERENCES materials(material_id) ON DELETE SET NULL,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_flashcard_coverage_class_created
  ON shared_flashcard_material_coverage(class_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shared_flashcard_coverage_material
  ON shared_flashcard_material_coverage(material_id);
