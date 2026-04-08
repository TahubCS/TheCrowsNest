-- Migration: user_activity_feed
-- Tracks the newest 40 user-triggered events globally across all users.
-- Events: material uploads, flashcard generation, exam creation, study plan creation.

CREATE TABLE user_activity_feed (
    id            BIGSERIAL    PRIMARY KEY,
    user_email    TEXT         NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    first_name    TEXT         NOT NULL,    -- split from users.name at insert time
    event_type    TEXT         NOT NULL CHECK (event_type IN ('upload', 'flashcards', 'exam', 'study_plan')),
    description   TEXT         NOT NULL,   -- e.g. "Khatri uploaded ch03-processes.pptx"
    file_name     TEXT,                    -- populated for 'upload' events only
    class_id      TEXT         REFERENCES classes(class_id),
    course_code   TEXT,                    -- cached e.g. "CSCI 3000"; for non-upload events
    resource_type TEXT,                    -- 'flashcards' | 'exam' | 'study_plan' | NULL for uploads
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_activity_feed_created ON user_activity_feed(created_at DESC);

-- Trigger function: after each insert, delete any rows not in the newest 40.
CREATE OR REPLACE FUNCTION trim_activity_feed_global()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM user_activity_feed
    WHERE id NOT IN (
        SELECT id FROM user_activity_feed
        ORDER BY created_at DESC
        LIMIT 40
    );
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_trim_activity_global
AFTER INSERT ON user_activity_feed
FOR EACH STATEMENT EXECUTE FUNCTION trim_activity_feed_global();
