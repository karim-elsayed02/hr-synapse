-- Staff work log / timesheet diary.
-- Only profiles.role IN ('admin', 'branch_lead') may read or insert.
-- Each INSERT must be for yourself: staff_profile_id = logged_by_id = auth.uid().
-- Branch leads only see rows where the author is in the same branch (slug-normalized like tasks RLS).

CREATE TABLE IF NOT EXISTS public.staff_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  logged_by_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  work_date DATE NOT NULL,
  hours_worked NUMERIC(5, 2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT staff_work_logs_hours_check CHECK (
    hours_worked > 0::numeric
    AND hours_worked <= 24::numeric
  ),
  CONSTRAINT staff_work_logs_description_nonempty CHECK (char_length(trim(description)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_staff_work_logs_work_date ON public.staff_work_logs (work_date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_work_logs_staff_profile_id ON public.staff_work_logs (staff_profile_id);

COMMENT ON TABLE public.staff_work_logs IS 'Self-reported hours: each row is one user''s own work (staff_profile_id = who worked = who logged).';

ALTER TABLE public.staff_work_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_work_logs_select_admin" ON public.staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_select_branch_lead" ON public.staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_insert_admin" ON public.staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_insert_branch_lead" ON public.staff_work_logs;
DROP POLICY IF EXISTS "staff_work_logs_insert_self" ON public.staff_work_logs;

-- Same branch helper as tasks / payroll (display name vs slug)
-- Admins: all rows
CREATE POLICY "staff_work_logs_select_admin"
  ON public.staff_work_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE POLICY "staff_work_logs_select_branch_lead"
  ON public.staff_work_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles viewer
      INNER JOIN public.profiles subject ON subject.id = staff_work_logs.staff_profile_id
      WHERE viewer.id = auth.uid()
        AND viewer.role = 'branch_lead'
        AND viewer.branch IS NOT NULL
        AND subject.branch IS NOT NULL
        AND (
          subject.branch = viewer.branch
          OR lower(regexp_replace(trim(subject.branch::text), '\s+', '_', 'g')) = lower(regexp_replace(trim(viewer.branch::text), '\s+', '_', 'g'))
        )
    )
  );

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

GRANT SELECT, INSERT ON public.staff_work_logs TO authenticated;
