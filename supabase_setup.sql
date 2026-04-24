-- ============================================================
-- TheCrowsNest — Supabase Setup Script
-- Run this once in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable pgvector (already available on Supabase free tier)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Metadata Tables (migrated from DynamoDB)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    email           TEXT PRIMARY KEY,
    id              UUID DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    pirate_id       TEXT,
    level           TEXT,
    major           TEXT,
    year_of_study   TEXT,
    enrolled_classes TEXT[] DEFAULT '{}',
    onboarding_complete BOOLEAN DEFAULT FALSE,
    is_admin        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
    class_id        TEXT PRIMARY KEY,
    course_code     TEXT NOT NULL,
    course_name     TEXT NOT NULL,
    department      TEXT NOT NULL,
    credit_hours    INTEGER,
    description     TEXT,
    related_majors  TEXT[] DEFAULT '{}',
    enrolled_count  INTEGER DEFAULT 0,
    syllabus        TEXT
);

CREATE TABLE IF NOT EXISTS materials (
    material_id     TEXT PRIMARY KEY,
    class_id        TEXT REFERENCES classes(class_id),
    file_name       TEXT NOT NULL,
    file_type       TEXT NOT NULL,
    storage_key     TEXT NOT NULL,
    material_type   TEXT NOT NULL,
    uploaded_by     TEXT REFERENCES users(email),
    uploaded_by_name TEXT,
    status          TEXT DEFAULT 'PENDING_REVIEW',
    rejection_reason TEXT,
    expires_at      BIGINT,   -- Unix timestamp, manually checked (no auto-TTL)
    uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
    popularity_rating INTEGER NOT NULL DEFAULT 0 CHECK (popularity_rating >= 0)
);

CREATE TABLE IF NOT EXISTS study_plans (
    plan_id         TEXT PRIMARY KEY,
    class_id        TEXT,
    user_email      TEXT REFERENCES users(email),
    title           TEXT NOT NULL,
    description     TEXT,
    items           JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requests (
    request_id      TEXT PRIMARY KEY,
    course_code     TEXT NOT NULL,
    course_name     TEXT NOT NULL,
    department      TEXT NOT NULL,
    status          TEXT DEFAULT 'PENDING',
    admin_note      TEXT,
    user_email      TEXT REFERENCES users(email),
    user_name       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    report_id       TEXT PRIMARY KEY,
    type            TEXT NOT NULL,  -- 'USER' | 'DOCUMENT'
    target_id       TEXT NOT NULL,
    target_name     TEXT,
    class_id        TEXT,
    reason          TEXT NOT NULL,
    details         TEXT,
    status          TEXT DEFAULT 'PENDING',
    reported_by     TEXT REFERENCES users(email),
    reported_by_name TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pending_verifications (
    email           TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    expires_at      BIGINT NOT NULL  -- Unix timestamp, manually checked
);

-- ============================================================
-- AI Backend Tables (migrated from RDS — same schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
    id      TEXT PRIMARY KEY,
    domain  TEXT,
    status  TEXT
);

CREATE TABLE IF NOT EXISTS embeddings (
    id          SERIAL PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    content     TEXT,
    embedding   vector(768)
);

CREATE TABLE IF NOT EXISTS nodes (
    id          SERIAL PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    label       TEXT,
    type        TEXT,
    UNIQUE (document_id, label)
);

CREATE TABLE IF NOT EXISTS edges (
    id              SERIAL PRIMARY KEY,
    document_id     TEXT REFERENCES documents(id) ON DELETE CASCADE,
    source_node_id  INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id  INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    relationship    TEXT,
    UNIQUE (document_id, source_node_id, target_node_id, relationship)
);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_materials_class_id ON materials(class_id);
CREATE INDEX IF NOT EXISTS idx_materials_class_popularity_uploaded_at ON materials(class_id, popularity_rating DESC, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_uploaded_by ON materials(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_email ON study_plans(user_email);
CREATE INDEX IF NOT EXISTS idx_requests_user_email ON requests(user_email);
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);

-- ============================================================
-- Supabase Storage Bucket
-- Run this in the SQL Editor OR create it manually in Storage tab:
--   Bucket name: thecrowsnest
--   Public: false
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('thecrowsnest', 'thecrowsnest', false)
-- ON CONFLICT DO NOTHING;
