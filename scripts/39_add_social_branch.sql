-- Add Social as a top-level branch (no sub-branches, same as Tutoring).
-- Run in Supabase SQL Editor after scripts/37–38.

INSERT INTO public.branches (name)
SELECT 'Social'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.branches
  WHERE lower(regexp_replace(trim(name), '\s+', '_', 'g')) = 'social'
);

-- Re-assign profiles that used legacy social_media slug (migration 32 cleared some; restore if needed)
UPDATE public.profiles
SET branch = 'social', department = NULL
WHERE lower(trim(branch)) IN ('social_media', 'social media')
   OR branch = 'Social';

COMMENT ON TABLE public.branches IS 'Top-level branches: Medical, Dental, Tutoring, Social. Match lib/utils/org-structure.ts.';
