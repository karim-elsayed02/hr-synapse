-- Default hourly pay rate for payroll (optional; null = not set).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(12, 4);

COMMENT ON COLUMN public.profiles.hourly_rate IS 'Default hourly pay rate in GBP; used when creating payroll entries.';
