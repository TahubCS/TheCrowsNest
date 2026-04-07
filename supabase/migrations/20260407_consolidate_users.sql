-- ============================================================
-- TheCrowsNest — Consolidate users table
-- Merges admins, admin_dev_mode, profiles, pending_verifications
-- into the users table to eliminate redundant tables.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1) Add subscription + admin dev-mode columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_plan       TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT,
  ADD COLUMN IF NOT EXISTS plan_expires_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dev_mode_plan           TEXT;  -- 'free' | 'premium' | NULL

-- 2) Migrate subscription data from profiles → users
UPDATE users u
SET
  subscription_plan       = p.subscription_plan,
  stripe_customer_id      = p.stripe_customer_id,
  stripe_subscription_id  = p.stripe_subscription_id,
  plan_expires_at         = p.plan_expires_at
FROM profiles p
WHERE LOWER(u.email) = LOWER(p.email);

-- 3) Mark admin users (from the admins table) in users.is_admin
UPDATE users u
SET is_admin = TRUE
FROM admins a
WHERE LOWER(u.email) = LOWER(a.email);

-- 4) Migrate dev-mode settings from admin_dev_mode → users
UPDATE users u
SET dev_mode_plan = adm.active_plan
FROM admin_dev_mode adm
WHERE LOWER(u.email) = LOWER(adm.admin_email);

-- 5) Drop the now-redundant tables
DROP TABLE IF EXISTS admin_dev_mode;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS profiles;
