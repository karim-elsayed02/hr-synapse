-- =============================================================================
-- Migration 33: Fix RLS infinite recursion + staff role migration
-- =============================================================================
-- Run this entire script in one go in the Supabase SQL editor.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- PART 1: Fix infinite recursion on profiles RLS
--
-- The policy created in migration 32 queried profiles FROM WITHIN a profiles
-- policy, causing infinite recursion. The fix:
--   1. Create a SECURITY DEFINER helper that reads role without triggering RLS.
--   2. Drop the recursive policy.
--   3. Replace profiles policies with non-recursive equivalents.
-- -----------------------------------------------------------------------------

-- Helper function: reads the current user's role bypassing RLS (SECURITY DEFINER
-- runs as the function owner, not the calling user, so it skips row-level policies)
CREATE OR REPLACE FUNCTION public.get_my_claim_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid()
$$;

-- Drop all existing profiles policies so we can recreate them cleanly
DROP POLICY IF EXISTS "Admin and executive can manage profiles"  ON profiles;
DROP POLICY IF EXISTS "Admin can manage profiles"               ON profiles;
DROP POLICY IF EXISTS "Users can view own profile"              ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"            ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles"    ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles"   ON profiles;
DROP POLICY IF EXISTS "Allow profile creation"                  ON profiles;
DROP POLICY IF EXISTS "Allow profile updates"                   ON profiles;
DROP POLICY IF EXISTS "admin_full_access"                       ON profiles;
DROP POLICY IF EXISTS "manager_simple_access"                   ON profiles;

-- All authenticated users can read any profile (staff directory, etc.)
-- Admin/executive writes go through the service-role client which bypasses RLS.
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Admins and executives can update any profile (uses non-recursive helper)
CREATE POLICY "profiles_update_elevated"
  ON profiles FOR UPDATE
  USING (public.get_my_claim_role() IN ('admin', 'executive'));

-- Allow new profile rows to be inserted (sign-up / admin invite flow)
CREATE POLICY "profiles_insert_authenticated"
  ON profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Admins and executives can delete profiles (uses non-recursive helper)
CREATE POLICY "profiles_delete_elevated"
  ON profiles FOR DELETE
  USING (public.get_my_claim_role() IN ('admin', 'executive'));


-- -----------------------------------------------------------------------------
-- PART 2: Update other table policies to use the same non-recursive helper
--         (replaces the versions written in migration 32)
-- -----------------------------------------------------------------------------

-- tasks: admin + executive see all
DROP POLICY IF EXISTS "Admin and executive see all tasks"              ON tasks;
DROP POLICY IF EXISTS "Branch members see branch tasks"               ON tasks;
DROP POLICY IF EXISTS "Admin executive branch_lead can manage tasks"  ON tasks;

CREATE POLICY "tasks_select_elevated"
  ON tasks FOR SELECT
  USING (public.get_my_claim_role() IN ('admin', 'executive'));

CREATE POLICY "tasks_select_branch"
  ON tasks FOR SELECT
  USING (public.get_my_claim_role() IN ('branch_lead', 'sub_branch_lead', 'staff'));

CREATE POLICY "tasks_manage_elevated"
  ON tasks FOR ALL
  USING (public.get_my_claim_role() IN ('admin', 'executive', 'branch_lead'));

-- staff_work_logs
DROP POLICY IF EXISTS "Admin executive branch_lead can view all work logs" ON staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_select_admin"                       ON staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_select_branch_lead"                 ON staff_work_logs;

CREATE POLICY "work_logs_select"
  ON staff_work_logs FOR SELECT
  USING (
    staff_profile_id = auth.uid()
    OR public.get_my_claim_role() IN ('admin', 'executive', 'branch_lead')
  );

-- payroll_entries
DROP POLICY IF EXISTS "Admin and executive manage payroll" ON payroll_entries;

CREATE POLICY "payroll_manage_elevated"
  ON payroll_entries FOR ALL
  USING (public.get_my_claim_role() IN ('admin', 'executive'));

-- announcements
DROP POLICY IF EXISTS "Admin and executive manage announcements"   ON announcements;
DROP POLICY IF EXISTS "All users can view active announcements"    ON announcements;

CREATE POLICY "announcements_manage_elevated"
  ON announcements FOR ALL
  USING (public.get_my_claim_role() IN ('admin', 'executive'));

CREATE POLICY "announcements_select_active"
  ON announcements FOR SELECT
  USING (is_active = true);


-- -----------------------------------------------------------------------------
-- PART 3: Safe staff role migration
--
-- Maps existing staff to the correct roles based on their current profile data.
-- Review and adjust the UPDATE statements below before running.
--
-- Current role values in the database after migration 32:
--   admin          -> stays admin
--   branch_lead    -> stays branch_lead  (now scoped to medical/dental/tutoring)
--   sub_branch_lead-> stays sub_branch_lead
--   staff          -> stays staff
--   executive      -> NEW: assign to users who were previously on the executives branch
--
-- If you have specific users you want to promote to 'executive', update their
-- role here. The query below promotes any user whose branch was cleared to NULL
-- from the old 'executives' branch — you may want to verify this list first.
-- -----------------------------------------------------------------------------

-- Preview who will be affected (uncomment to check before running):
-- SELECT id, email, full_name, role, branch, department
-- FROM profiles
-- WHERE role = 'admin' AND branch IS NULL
-- ORDER BY email;

-- Promote users who were on the old 'executives' branch to the 'executive' role.
-- These users now have branch = NULL (cleared in migration 32).
-- If you want to target them differently, adjust the WHERE clause.
-- NOTE: This is intentionally commented out — run only after verifying the
--       preview query above returns the expected rows.
--
-- UPDATE profiles
-- SET role = 'executive'
-- WHERE <your condition here, e.g.: email IN ('person@synapseuk.org', ...)>;


-- Verify the final state:
-- SELECT role, count(*) FROM profiles GROUP BY role ORDER BY role;
-- SELECT id, email, full_name, role, branch, department
-- FROM profiles ORDER BY role, branch, email;

COMMIT;
