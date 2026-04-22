-- Superseded by: scripts/28_staff_work_logs_upgrade_from_original_26.sql
-- (full upgrade for DBs that already ran the original 26). Kept for reference.

DROP POLICY IF EXISTS "staff_work_logs_insert_admin" ON public.staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_insert_branch_lead" ON public.staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_insert_self" ON public.staff_work_logs;

CREATE POLICY "staff_work_logs_insert_self"
  ON public.staff_work_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    staff_profile_id = auth.uid()
    AND logged_by_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'branch_lead')
    )
  );
