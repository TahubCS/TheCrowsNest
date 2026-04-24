-- Material popularity tracking
-- Existing and new materials start at zero; user-selected materials increment
-- after successful personal study object creation.

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS popularity_rating INTEGER DEFAULT 0;

UPDATE materials
SET popularity_rating = 0
WHERE popularity_rating IS NULL;

ALTER TABLE materials
  ALTER COLUMN popularity_rating SET DEFAULT 0,
  ALTER COLUMN popularity_rating SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'materials_popularity_rating_nonnegative'
      AND conrelid = 'materials'::regclass
  ) THEN
    ALTER TABLE materials
      ADD CONSTRAINT materials_popularity_rating_nonnegative
      CHECK (popularity_rating >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_materials_class_popularity_uploaded_at
  ON materials (class_id, popularity_rating DESC, uploaded_at DESC);
