-- Account enable/disable for login (checked in the app after sign-in; see hooks/use-auth.tsx).
-- Run once if `active` is not already on public.profiles.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.active IS 'When false, user cannot stay signed in; admin toggles on Staff page.';
