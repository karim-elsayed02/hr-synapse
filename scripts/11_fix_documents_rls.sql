-- Fix documents table RLS policies to work without profiles table dependency
-- Drop existing policies that reference profiles table
DROP POLICY IF EXISTS "Users can view accessible documents" ON documents;
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can update their documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their documents" ON documents;

-- Create simple RLS policies that work with auth.users only
-- Users can view documents they uploaded OR documents targeted to them
CREATE POLICY "Users can view their documents" ON documents
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = target_user_id OR
    target_user_id IS NULL  -- General documents visible to all
  );

-- Simplified insert policy that allows users to create documents
CREATE POLICY "Users can insert documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update documents they uploaded
CREATE POLICY "Users can update their documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete documents they uploaded
CREATE POLICY "Users can delete their documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'documents';
