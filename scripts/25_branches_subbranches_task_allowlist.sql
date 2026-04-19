-- Optional: align `public.branches` / `public.sub_branches` names with app allowlists in
-- `lib/utils/org-structure.ts` (tasks + profiles use slugified names).
--
-- Branches (exact display names recommended): Executives, Admissions, Work Experience,
--   Tutoring, Education, Social Media
-- Sub-branches: Medical, Dental
--
-- Adjust to your PK/unique constraints. Example if `name` is unique:

-- INSERT INTO public.branches (name) VALUES
--   ('Executives'),
--   ('Admissions'),
--   ('Work Experience'),
--   ('Tutoring'),
--   ('Education'),
--   ('Social Media')
-- ON CONFLICT (name) DO NOTHING;

-- INSERT INTO public.sub_branches (name) VALUES
--   ('Medical'),
--   ('Dental')
-- ON CONFLICT (name) DO NOTHING;

-- Remove or rename old rows in Supabase Table Editor if they no longer apply.
