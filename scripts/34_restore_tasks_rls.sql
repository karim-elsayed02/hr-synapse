-- =============================================================================
-- Migration 34: Restore tasks (and related tables) RLS to the working pattern
-- =============================================================================
-- Migration 33 introduced role-based SELECT policies on tasks that broke all
-- task fetches. This codebase enforces role-based visibility in the Next.js
-- server layer (tasks/page.tsx), not in RLS. RLS just gates authentication.
-- This script reverts tasks to the established pattern from scripts 30 & 31,
-- and also cleans up the over-restrictive policies on staff_work_logs,
-- payroll_entries, and announcements added in migration 33.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- tasks: restore to "any authenticated user can read/write; app layer scopes"
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_select_elevated"                         ON tasks;
DROP POLICY IF EXISTS "tasks_select_branch"                           ON tasks;
DROP POLICY IF EXISTS "tasks_manage_elevated"                         ON tasks;
DROP POLICY IF EXISTS "Authenticated users can view tasks"            ON tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks"          ON tasks;
DROP POLICY IF EXISTS "Admin and executive see all tasks"             ON tasks;
DROP POLICY IF EXISTS "Branch members see branch tasks"               ON tasks;
DROP POLICY IF EXISTS "Admin executive branch_lead can manage tasks"  ON tasks;

-- Allow any authenticated user to SELECT all task rows.
-- Role-based visibility (admin sees all, branch lead sees own branch, etc.)
-- is enforced by the server in app/(main)/tasks/page.tsx.
CREATE POLICY "tasks_select_authenticated"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

-- Allow any authenticated user to INSERT/UPDATE/DELETE.
-- The API routes and server actions enforce who is actually allowed to mutate.
CREATE POLICY "tasks_insert_authenticated"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "tasks_update_authenticated"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "tasks_delete_authenticated"
  ON tasks FOR DELETE
  TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- staff_work_logs: restore simple policy (self + elevated roles via helper)
-- The original script 26/27 used a per-role approach; keep that but ensure
-- the get_my_claim_role() helper from migration 33 is used (non-recursive).
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin executive branch_lead can view all work logs" ON staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_select_admin"                       ON staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_select_branch_lead"                 ON staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_insert_admin"                       ON staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_insert_branch_lead"                 ON staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_insert_self"                        ON staff_work_logs;

-- All authenticated users can read work logs (API enforces scoping)
CREATE POLICY "work_logs_select_authenticated"
  ON staff_work_logs FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert their own work log entries
CREATE POLICY "work_logs_insert_self"
  ON staff_work_logs FOR INSERT
  TO authenticated
  WITH CHECK (staff_profile_id = auth.uid());

-- Admins/executives can insert on behalf of others
CREATE POLICY "work_logs_insert_elevated"
  ON staff_work_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_claim_role() IN ('admin', 'executive'));

-- -----------------------------------------------------------------------------
-- payroll_entries: allow authenticated reads; API enforces role gates
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "payroll_manage_elevated" ON payroll_entries;

CREATE POLICY "payroll_select_authenticated"
  ON payroll_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "payroll_mutate_elevated"
  ON payroll_entries FOR ALL
  TO authenticated
  USING (public.get_my_claim_role() IN ('admin', 'executive'));

-- -----------------------------------------------------------------------------
-- announcements: authenticated users can read active ones; elevated can manage
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "announcements_manage_elevated"  ON announcements;
DROP POLICY IF EXISTS "announcements_select_active"    ON announcements;

CREATE POLICY "announcements_select_authenticated"
  ON announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "announcements_mutate_elevated"
  ON announcements FOR ALL
  TO authenticated
  USING (public.get_my_claim_role() IN ('admin', 'executive'));

COMMIT;

-- Verify no overlapping/blocking policies remain on tasks:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'tasks' ORDER BY cmd, policyname;
