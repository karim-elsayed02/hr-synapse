-- Task attachments: storage bucket + RLS (run in Supabase SQL editor after creating bucket "tasks-attachments").
--
-- 1) Storage → Create bucket: name tasks-attachments, public bucket ON (app builds public URLs; restrict who sees links in UI).
-- 2) Or use a private bucket and switch the app to signed URLs later.
--
-- Example policies for a PUBLIC bucket (authenticated upload/delete; public read):

-- INSERT — authenticated users can upload
-- CREATE POLICY "tasks_attachments_insert_authenticated"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'tasks-attachments');

-- SELECT — public read (required for /object/public/... URLs)
-- CREATE POLICY "tasks_attachments_select_public"
-- ON storage.objects FOR SELECT TO public
-- USING (bucket_id = 'tasks-attachments');

-- UPDATE — optional, if using upsert
-- CREATE POLICY "tasks_attachments_update_authenticated"
-- ON storage.objects FOR UPDATE TO authenticated
-- USING (bucket_id = 'tasks-attachments');

-- DELETE — allow removing objects when replacing or deleting a task
-- CREATE POLICY "tasks_attachments_delete_authenticated"
-- ON storage.objects FOR DELETE TO authenticated
-- USING (bucket_id = 'tasks-attachments');

-- If policies already exist for this bucket, adjust names or drop first.
