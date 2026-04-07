-- ============================================================
-- TheCrowsNest — Unified material coverage tracking
-- Renames shared_flashcard_material_coverage → shared_material_coverage
-- and adds resource_type so exams and study plans share the same table.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1) Rename the table
ALTER TABLE shared_flashcard_material_coverage
  RENAME TO shared_material_coverage;

-- 2) Add resource_type column (backfill existing rows as 'flashcards')
ALTER TABLE shared_material_coverage
  ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT 'flashcards';

UPDATE shared_material_coverage SET resource_type = 'flashcards';

-- 3) Drop old unique constraint and add new one that includes resource_type
ALTER TABLE shared_material_coverage
  DROP CONSTRAINT IF EXISTS shared_flashcard_material_coverage_class_id_material_id_key;

ALTER TABLE shared_material_coverage
  ADD CONSTRAINT shared_material_coverage_unique
  UNIQUE (class_id, material_id, resource_type);
