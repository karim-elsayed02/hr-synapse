-- Work log approval flow + payroll linkage.
-- Non-admins submit pending requests; admins/executives approve and trigger payroll.
-- Run in Supabase SQL Editor after scripts/34 (or 35).

-- -----------------------------------------------------------------------------
-- staff_work_logs: approval columns
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_log_status') THEN
    CREATE TYPE public.work_log_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

ALTER TABLE public.staff_work_logs
  ADD COLUMN IF NOT EXISTS status public.work_log_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS payroll_entry_id UUID;

-- Existing rows (pre-migration) treated as approved diary entries without payroll.
UPDATE public.staff_work_logs
SET status = 'approved'
WHERE status = 'pending'
  AND reviewed_by_id IS NULL
  AND payroll_entry_id IS NULL
  AND created_at < now();

CREATE INDEX IF NOT EXISTS idx_staff_work_logs_status ON public.staff_work_logs (status);

COMMENT ON COLUMN public.staff_work_logs.status IS 'pending = awaiting admin approval; approved/rejected after review.';

-- -----------------------------------------------------------------------------
-- payroll_entries: optional work_log_id (task_id may already be nullable)
-- -----------------------------------------------------------------------------
ALTER TABLE public.payroll_entries
  ADD COLUMN IF NOT EXISTS work_log_id UUID REFERENCES public.staff_work_logs (id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payroll_entries'
      AND column_name = 'task_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.payroll_entries ALTER COLUMN task_id DROP NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS payroll_entries_work_log_id_key
  ON public.payroll_entries (work_log_id)
  WHERE work_log_id IS NOT NULL;

-- Link work log → payroll entry (after payroll_entries.work_log_id exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'staff_work_logs'
      AND constraint_name = 'staff_work_logs_payroll_entry_id_fkey'
  ) THEN
    ALTER TABLE public.staff_work_logs
      ADD CONSTRAINT staff_work_logs_payroll_entry_id_fkey
      FOREIGN KEY (payroll_entry_id) REFERENCES public.payroll_entries (id) ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- RLS: allow all authenticated users to submit own requests; admins review
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "work_logs_update_elevated" ON public.staff_work_logs;

CREATE POLICY "work_logs_update_elevated"
  ON public.staff_work_logs
  FOR UPDATE
  TO authenticated
  USING (public.get_my_claim_role() IN ('admin', 'executive'))
  WITH CHECK (public.get_my_claim_role() IN ('admin', 'executive'));

GRANT UPDATE ON public.staff_work_logs TO authenticated;
