-- =============================================================================
-- Migration 35: Add fixed payment columns to tasks
-- Run in Supabase SQL Editor (Dashboard → SQL → New query → Run)
-- =============================================================================

-- payment_mode: 'hours' (default) or 'fixed'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'payment_mode'
  ) THEN
    ALTER TABLE public.tasks
      ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'hours';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_payment_mode_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_payment_mode_check
      CHECK (payment_mode IN ('hours', 'fixed'));
  END IF;
END $$;

-- fixed_payment_amount: GBP flat rate when payment_mode = 'fixed'
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS fixed_payment_amount NUMERIC(10, 2) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_fixed_payment_amount_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_fixed_payment_amount_check
      CHECK (fixed_payment_amount IS NULL OR fixed_payment_amount > 0);
  END IF;
END $$;

COMMENT ON COLUMN public.tasks.payment_mode IS
  'hours = pay via assigned_hours × staff hourly_rate; fixed = pay fixed_payment_amount GBP';
COMMENT ON COLUMN public.tasks.fixed_payment_amount IS
  'Flat GBP amount when payment_mode = fixed';

-- Verify:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'tasks' AND column_name IN ('payment_mode', 'fixed_payment_amount');
