-- Storage policies for bucket `branch_documents`.
-- Upload uses INSERT; downloads use signed URLs from the API (`attachSignedDownloadUrls`), which requires
-- SELECT for the `authenticated` role (private buckets are OK — do not rely on /object/public/ URLs).
-- 1) Create bucket `branch_documents` (can stay private).
-- 2) Run this in the SQL editor.

DROP POLICY IF EXISTS "branch_documents_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "branch_documents_select_public" ON storage.objects;
DROP POLICY IF EXISTS "branch_documents_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "branch_documents_delete_authenticated" ON storage.objects;

-- Authenticated users can upload objects to this bucket
CREATE POLICY "branch_documents_insert_authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branch_documents');

-- Read objects (required for createSignedUrl in the app)
CREATE POLICY "branch_documents_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'branch_documents');

-- Optional: anonymous public read if you also use direct /object/public/ URLs and a Public bucket
CREATE POLICY "branch_documents_select_public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'branch_documents');

-- Allow delete when removing a document record (or replacing a file)
CREATE POLICY "branch_documents_delete_authenticated"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branch_documents');
