-- Create requests table (basic version without RLS for now)
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

-- Create profiles table (basic version)
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

-- Create indexes for better performance
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
