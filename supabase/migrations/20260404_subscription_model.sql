-- ============================================================
-- TheCrowsNest — Subscription Model Migration
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1) Profiles table — tracks subscription plan per user
CREATE TABLE IF NOT EXISTS profiles (
  email              TEXT PRIMARY KEY REFERENCES users(email),
  subscription_plan  TEXT NOT NULL DEFAULT 'free',   -- 'free' | 'premium'
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  plan_expires_at        TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Admins table — replaces ADMIN_EMAILS env variable
CREATE TABLE IF NOT EXISTS admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  added_by   TEXT  -- tracks who granted admin access
);

-- Seed admin emails
INSERT INTO admins (email, added_by) VALUES
  ('khatrim23@students.ecu.edu', 'system'),
  ('heminwayj25@students.ecu.edu', 'system')
ON CONFLICT (email) DO NOTHING;

-- 3) Admin dev-mode — allows admins to simulate free/premium for testing
CREATE TABLE IF NOT EXISTS admin_dev_mode (
  admin_email TEXT PRIMARY KEY,
  active_plan TEXT NOT NULL DEFAULT 'premium',  -- 'free' | 'premium'
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4) Extend materials table with context-score columns
ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS high_context  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS context_score NUMERIC;

-- 5) Shared resources — one row per class, auto-generated for all students
CREATE TABLE IF NOT EXISTS shared_resources (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id           TEXT REFERENCES classes(class_id) NOT NULL UNIQUE,
  exam_json          JSONB,
  study_plan_json    JSONB,
  flashcards_json    JSONB,
  generation_status  TEXT NOT NULL DEFAULT 'idle',  -- 'idle' | 'generating' | 'ready'
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 6) Personal resources — premium users' custom-generated tools
CREATE TABLE IF NOT EXISTS personal_resources (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email     TEXT REFERENCES users(email) NOT NULL,
  class_id       TEXT REFERENCES classes(class_id) NOT NULL,
  resource_type  TEXT NOT NULL,  -- 'exam' | 'study_plan' | 'flashcards'
  material_ids   TEXT[],          -- array of material_id strings the user selected
  content_json   JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 7) GenAI usage tracking — for quota enforcement
CREATE TABLE IF NOT EXISTS genai_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT REFERENCES users(email) NOT NULL,
  api_type    TEXT NOT NULL,  -- 'chat' | 'exam' | 'study_plan' | 'flashcards'
  class_id    TEXT,
  called_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_genai_usage_lookup
  ON genai_usage(user_email, api_type, called_at);

-- 8) Quota configuration — adjustable without code deploy
CREATE TABLE IF NOT EXISTS quota_config (
  plan        TEXT NOT NULL,
  api_type    TEXT NOT NULL,
  daily_limit INT NOT NULL,
  PRIMARY KEY (plan, api_type)
);
INSERT INTO quota_config (plan, api_type, daily_limit) VALUES
  -- Free plan: 0 for everything (shared resources are pre-generated, no personal API calls)
  ('free', 'chat',        0),
  ('free', 'exam',        0),
  ('free', 'study_plan',  0),
  ('free', 'flashcards',  0),
  -- Premium plan
  ('premium', 'chat',        25),
  ('premium', 'exam',         5),
  ('premium', 'study_plan',   5),
  ('premium', 'flashcards',   5)
ON CONFLICT (plan, api_type) DO UPDATE SET daily_limit = EXCLUDED.daily_limit;
