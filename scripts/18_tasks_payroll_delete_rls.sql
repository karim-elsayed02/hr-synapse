-- DELETE RLS for tasks and payroll_entries (task delete pre-removes payroll rows).
-- Run in Supabase SQL editor after verifying RLS is already enabled on these tables.
-- Adjust branch matching if your branches.name values differ from profiles.branch slugs.

-- ─── tasks ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
CREATE POLICY "Admins can delete tasks"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Branch leads can delete tasks in their branch" ON public.tasks;
CREATE POLICY "Branch leads can delete tasks in their branch"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'branch_lead'
        AND (
          branch_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.branches b
            WHERE b.id = branch_id
              AND (
                b.name = p.branch
                OR lower(regexp_replace(trim(b.name::text), '\s+', '_', 'g')) = lower(trim(p.branch::text))
              )
          )
        )
    )
  );

-- ─── payroll_entries ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can delete payroll entries" ON public.payroll_entries;
CREATE POLICY "Admins can delete payroll entries"
  ON public.payroll_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Branch leads can delete payroll entries in their branch" ON public.payroll_entries;
CREATE POLICY "Branch leads can delete payroll entries in their branch"
  ON public.payroll_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'branch_lead'
        AND EXISTS (
          SELECT 1 FROM public.tasks t
          WHERE t.id = task_id
            AND (
              t.branch_id IS NULL
              OR EXISTS (
                SELECT 1 FROM public.branches b
                WHERE b.id = t.branch_id
                  AND (
                    b.name = p.branch
                    OR lower(regexp_replace(trim(b.name::text), '\s+', '_', 'g')) = lower(trim(p.branch::text))
                  )
              )
            )
        )
    )
  );
