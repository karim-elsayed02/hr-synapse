-- Optional: if attachment_path is not already on public.tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachment_path text;

COMMENT ON COLUMN public.tasks.attachment_path IS 'Path within Supabase Storage bucket tasks-attachments (e.g. {task_id}/{timestamp}_filename.pdf).';
