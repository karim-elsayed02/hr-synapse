-- =============================================================================
-- Migration 32: New Role & Branch System
-- =============================================================================
-- Roles:   admin | executive | branch_lead | sub_branch_lead | staff
-- Branches (top-level): medical | dental | tutoring
-- Sub-branches (under medical/dental only): work_experience | admissions | education | events
-- Tutoring has NO sub-branches.
--
-- RUN IN TWO SEPARATE STEPS in Supabase SQL editor:
--   STEP 1 — run the block under "STEP 1" alone, then click Run.
--   STEP 2 — run everything under "STEP 2" alone, then click Run.
--
-- This is required because PostgreSQL cannot use a newly-added enum value
-- in the same transaction that added it.
-- =============================================================================


-- =========================================================
-- STEP 1: Add 'executive' to the app_role enum
-- Run this block by itself first, then commit/run before Step 2.
-- =========================================================

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'executive';


-- =========================================================
-- STEP 2: Everything else — run after Step 1 has been committed
-- =========================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 2. Reset branches table to Medical, Dental, Tutoring
-- Drop NOT NULL on FK columns first so we can clear references safely.
-- Tasks/documents will need their branch re-assigned after migration.
-- -----------------------------------------------------------------------------

ALTER TABLE tasks     ALTER COLUMN branch_id     DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN branch_id     DROP NOT NULL;

UPDATE tasks     SET branch_id = NULL WHERE branch_id IS NOT NULL;
UPDATE documents SET branch_id = NULL WHERE branch_id IS NOT NULL;

TRUNCATE branches CASCADE;

INSERT INTO branches (name) VALUES
  ('Medical'),
  ('Dental'),
  ('Tutoring');

-- -----------------------------------------------------------------------------
-- 3. Reset sub_branches table to Work Experience, Admissions, Education, Events
-- (Old sub-branches were Medical and Dental — they are now top-level branches)
-- -----------------------------------------------------------------------------

ALTER TABLE tasks     ALTER COLUMN sub_branch_id DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN sub_branch_id DROP NOT NULL;

UPDATE tasks     SET sub_branch_id = NULL WHERE sub_branch_id IS NOT NULL;
UPDATE documents SET sub_branch_id = NULL WHERE sub_branch_id IS NOT NULL;

TRUNCATE sub_branches CASCADE;

INSERT INTO sub_branches (name) VALUES
  ('Work Experience'),
  ('Admissions'),
  ('Education'),
  ('Events');

-- -----------------------------------------------------------------------------
-- 4. Profile data migration
--
-- Old model: profiles.branch = operational team  (e.g. work_experience, admissions)
--            profiles.department = service area  (e.g. medical, dental)
--
-- New model: profiles.branch = service area      (medical | dental | tutoring)
--            profiles.department = operational   (work_experience | admissions | education | events)
--
-- For users whose old department was 'medical' or 'dental':
--   swap branch <-> department so (work_experience, medical) -> (medical, work_experience)
-- -----------------------------------------------------------------------------

-- Step 4a: Swap branch <-> department for medical/dental users via temp column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS _branch_tmp TEXT;

UPDATE profiles
SET _branch_tmp = branch
WHERE department IN ('medical', 'dental');

UPDATE profiles
SET
  branch     = department,
  department = _branch_tmp
WHERE department IN ('medical', 'dental');

ALTER TABLE profiles DROP COLUMN IF EXISTS _branch_tmp;

-- Step 4b: Tutoring users — clear department (tutoring has no sub-branches)
UPDATE profiles
SET department = NULL
WHERE branch = 'tutoring' AND department IS NOT NULL;

-- Step 4c: Users on old-only branches (executives, social_media, etc.)
-- Clear branch/department so an admin can re-assign via the Staff Directory.
UPDATE profiles
SET branch = NULL, department = NULL
WHERE branch IN ('executives', 'social_media')
   OR (branch NOT IN ('medical', 'dental', 'tutoring') AND branch IS NOT NULL);

-- -----------------------------------------------------------------------------
-- 5. RLS policy cleanup
-- Replace legacy role strings with the standardised 5-role model.
-- -----------------------------------------------------------------------------

-- profiles: admin + executive can manage all rows
DROP POLICY IF EXISTS "Admin can manage profiles" ON profiles;
CREATE POLICY "Admin and executive can manage profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'executive')
    )
  );

-- profiles: users can read/update their own row
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- tasks: admin + executive see all
DROP POLICY IF EXISTS "Admins see all tasks" ON tasks;
CREATE POLICY "Admin and executive see all tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'executive')
    )
  );

-- tasks: branch/sub-branch leads and staff see branch-scoped tasks
DROP POLICY IF EXISTS "Branch members see branch tasks" ON tasks;
CREATE POLICY "Branch members see branch tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('branch_lead', 'sub_branch_lead', 'staff')
    )
  );

-- tasks: admin + executive + branch_lead can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admin can manage tasks" ON tasks;
CREATE POLICY "Admin executive branch_lead can manage tasks"
  ON tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'executive', 'branch_lead')
    )
  );

-- staff_work_logs: admin + executive + branch_lead can see all; others see own
DROP POLICY IF EXISTS "Admin can view all work logs" ON staff_work_logs;
DROP POLICY IF EXISTS "Branch lead can view branch work logs" ON staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_select_admin" ON staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_select_branch_lead" ON staff_work_logs;
CREATE POLICY "Admin executive branch_lead can view all work logs"
  ON staff_work_logs FOR SELECT
  USING (
    staff_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'executive', 'branch_lead')
    )
  );

-- payroll_entries: admin + executive full access
DROP POLICY IF EXISTS "Admin manages payroll" ON payroll_entries;
CREATE POLICY "Admin and executive manage payroll"
  ON payroll_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'executive')
    )
  );

-- announcements: admin + executive full access
DROP POLICY IF EXISTS "Admin manages announcements" ON announcements;
CREATE POLICY "Admin and executive manage announcements"
  ON announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'executive')
    )
  );

-- announcements: all authenticated users can read active ones
DROP POLICY IF EXISTS "All users can view active announcements" ON announcements;
CREATE POLICY "All users can view active announcements"
  ON announcements FOR SELECT
  USING (is_active = true);

COMMIT;

-- =============================================================================
-- Post-migration verification (run separately after migration):
-- =============================================================================
-- SELECT role, count(*) FROM profiles GROUP BY role ORDER BY role;
-- SELECT branch, department, count(*) FROM profiles GROUP BY branch, department ORDER BY branch, department;
-- SELECT name FROM branches ORDER BY name;
-- SELECT name FROM sub_branches ORDER BY name;
-- SELECT id, email, role, branch, department FROM profiles WHERE branch IS NULL ORDER BY email;
