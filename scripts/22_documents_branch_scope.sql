-- Branch / sub-branch shared documents in Storage bucket `branch_documents`.
--
-- Base table (your production shape) is expected to include at least:
--   id, user_id -> profiles, document_title, document_type, description, metadata,
--   expiry_date, storage_bucket, storage_path, file_name, mime_type, file_size,
--   created_at, updated_at, expiry_warning_sent_at, …
-- The app never requires `metadata` for uploads; it can stay null.
--
-- Prerequisites before this migration:
--   1. Create Storage bucket `branch_documents` and apply policies in `23_branch_documents_storage.sql`.
--   2. Tables `public.branches` and `public.sub_branches` list ids used for folder grouping; `documents`
--      stores `branch_id` / `sub_branch_id` as plain UUIDs (no FK required). Match column types to those tables' ids.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'employee'
    CHECK (scope IN ('employee', 'branch'));

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS branch_id uuid;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS sub_branch_id uuid;

COMMENT ON COLUMN public.documents.scope IS 'employee = HR file for user_id; branch = shared file in branch_documents bucket';
COMMENT ON COLUMN public.documents.branch_id IS 'Set when scope=branch; folder grouping / access control';
COMMENT ON COLUMN public.documents.sub_branch_id IS 'Optional; null = visible to whole branch';

CREATE INDEX IF NOT EXISTS idx_documents_scope_branch ON public.documents (scope, branch_id);
