-- Test the documents table structure and queries
SELECT 'Testing documents table...' as status;

-- Check if documents table exists and its structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test a simple query to see if there are any type issues
SELECT COUNT(*) as document_count FROM documents;

-- Check if there are any documents in the table
SELECT id, user_id, title, created_at 
FROM documents 
ORDER BY created_at DESC 
LIMIT 5;

-- Test the RLS policies by checking if they exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'documents';
