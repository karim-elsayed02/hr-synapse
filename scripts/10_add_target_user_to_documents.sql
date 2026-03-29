-- Add target_user_id column to documents table for user-specific document access
ALTER TABLE documents 
ADD COLUMN target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance on target_user queries
CREATE INDEX idx_documents_target_user_id ON documents(target_user_id);

-- Update RLS policies to support user-specific document access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- Create new policies that support both uploaded documents and targeted documents
-- Users can view documents they uploaded OR documents targeted to them OR if they are admin/manager
CREATE POLICY "Users can view accessible documents" ON documents
  FOR SELECT USING (
    auth.uid() = user_id OR  -- Documents they uploaded
    auth.uid() = target_user_id OR  -- Documents targeted to them
    EXISTS (  -- Admin users can see all documents
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    ) OR
    EXISTS (  -- Department managers can see documents for their department members
      SELECT 1 FROM profiles p1, profiles p2
      WHERE p1.id = auth.uid() 
      AND p1.role = 'manager'
      AND p2.id = COALESCE(target_user_id, user_id)
      AND p1.department = p2.department
    )
  );

-- Fixed column references from profiles.user_id to profiles.id
-- Users can insert documents (either for themselves or targeting others if they have permission)
CREATE POLICY "Users can insert documents" ON documents
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      target_user_id IS NULL OR  -- General documents
      target_user_id = auth.uid() OR  -- Self-targeted documents
      EXISTS (  -- Admin users can target anyone
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
      ) OR
      EXISTS (  -- Managers can target their department members
        SELECT 1 FROM profiles p1, profiles p2
        WHERE p1.id = auth.uid() 
        AND p1.role = 'manager'
        AND p2.id = target_user_id
        AND p1.department = p2.department
      )
    )
  );

-- Users can update documents they uploaded
CREATE POLICY "Users can update their documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete documents they uploaded
CREATE POLICY "Users can delete their documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- Verify the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
ORDER BY ordinal_position;
