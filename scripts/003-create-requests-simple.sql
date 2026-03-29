-- Create requests table without direct auth.users references
-- This avoids the "user_id does not exist" error
CREATE TABLE IF NOT EXISTS requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    line_manager_id UUID,
    
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
    swap_with_user_id UUID,
    
    -- Status and workflow
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Approval workflow
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
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

-- Create a profiles table to store additional user information
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    department TEXT,
    position TEXT,
    line_manager_id UUID,
    employee_id TEXT UNIQUE,
    phone TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Policy: Line managers can view and update requests assigned to them
CREATE POLICY "Line managers can manage assigned requests" ON requests
    FOR ALL USING (
        auth.uid() = line_manager_id OR 
        auth.uid() IN (
            SELECT p.line_manager_id FROM profiles p 
            WHERE p.id = requests.user_id
        )
    );

-- Create RLS policies for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and manage their own profile
CREATE POLICY "Users can manage own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- Policy: Line managers can view their team members' profiles
CREATE POLICY "Line managers can view team profiles" ON profiles
    FOR SELECT USING (auth.uid() = line_manager_id);
