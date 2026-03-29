-- Create requests table with line manager functionality
CREATE TABLE IF NOT EXISTS requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    line_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Request details
    type VARCHAR(50) NOT NULL CHECK (type IN ('leave', 'expense', 'shift_swap', 'general')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Leave request specific fields
    leave_type VARCHAR(50) CHECK (leave_type IN ('annual', 'sick', 'personal', 'maternity', 'paternity', 'compassionate')),
    start_date DATE,
    end_date DATE,
    days_requested DECIMAL(3,1),
    
    -- Expense request specific fields
    expense_amount DECIMAL(10,2),
    expense_category VARCHAR(100),
    receipt_url TEXT,
    
    -- Shift swap specific fields
    current_shift_date DATE,
    current_shift_time VARCHAR(50),
    requested_shift_date DATE,
    requested_shift_time VARCHAR(50),
    swap_with_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Status and workflow
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Approval workflow
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_line_manager_id ON requests(line_manager_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_requests_updated_at 
    BEFORE UPDATE ON requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add line_manager_id to users table if it doesn't exist
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS line_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create RLS policies for requests table
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view own requests" ON requests
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own requests
CREATE POLICY "Users can create own requests" ON requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own pending requests
CREATE POLICY "Users can update own pending requests" ON requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Policy: Line managers can view requests assigned to them
CREATE POLICY "Line managers can view assigned requests" ON requests
    FOR SELECT USING (auth.uid() = line_manager_id);

-- Policy: Line managers can update requests assigned to them
CREATE POLICY "Line managers can update assigned requests" ON requests
    FOR UPDATE USING (auth.uid() = line_manager_id);

-- Create a view for request details with user information
CREATE OR REPLACE VIEW request_details AS
SELECT 
    r.*,
    u.email as user_email,
    u.raw_user_meta_data->>'full_name' as user_name,
    lm.email as line_manager_email,
    lm.raw_user_meta_data->>'full_name' as line_manager_name,
    approver.email as approved_by_email,
    approver.raw_user_meta_data->>'full_name' as approved_by_name
FROM requests r
LEFT JOIN auth.users u ON r.user_id = u.id
LEFT JOIN auth.users lm ON r.line_manager_id = lm.id
LEFT JOIN auth.users approver ON r.approved_by = approver.id;
