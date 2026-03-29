-- Add 'completed' status to the existing status check constraint
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE requests ADD CONSTRAINT requests_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed'));

-- Create comments table for request replies
CREATE TABLE IF NOT EXISTS request_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for comments
CREATE INDEX IF NOT EXISTS idx_request_comments_request_id ON request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_request_comments_profile_id ON request_comments(profile_id);
CREATE INDEX IF NOT EXISTS idx_request_comments_created_at ON request_comments(created_at);

-- Add trigger for comments updated_at
CREATE TRIGGER update_request_comments_updated_at 
    BEFORE UPDATE ON request_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
