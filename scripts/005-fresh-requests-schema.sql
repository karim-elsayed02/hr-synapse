-- Drop existing tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create the profiles table first (simpler structure)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    department TEXT,
    position TEXT,
    line_manager_id UUID REFERENCES profiles(id),
    employee_id TEXT UNIQUE,
    phone TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the requests table (referencing profiles, not auth.users)
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    line_manager_id UUID REFERENCES profiles(id),
    
    -- Request details
    type TEXT NOT NULL CHECK (type IN ('leave', 'expense', 'shift_swap', 'general')),
    title TEXT NOT NULL,
    description TEXT,
    
    -- Leave request fields
    leave_type TEXT CHECK (leave_type IN ('annual', 'sick', 'personal', 'maternity', 'paternity', 'compassionate')),
    start_date DATE,
    end_date DATE,
    days_requested DECIMAL(3,1),
    
    -- Expense request fields
    expense_amount DECIMAL(10,2),
    expense_category TEXT,
    receipt_url TEXT,
    
    -- Shift swap fields
    current_shift_date DATE,
    current_shift_time TEXT,
    requested_shift_date DATE,
    requested_shift_time TEXT,
    swap_with_profile_id UUID REFERENCES profiles(id),
    
    -- Status and workflow
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Approval workflow
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_requests_profile_id ON requests(profile_id);
CREATE INDEX idx_requests_line_manager_id ON requests(line_manager_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_type ON requests(type);
CREATE INDEX idx_requests_created_at ON requests(created_at);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_requests_updated_at 
    BEFORE UPDATE ON requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data to test
INSERT INTO profiles (id, email, full_name, department, position, employee_id) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'john.manager@synapseuk.com', 'John Manager', 'Operations', 'Operations Manager', 'EMP001'),
('550e8400-e29b-41d4-a716-446655440001', 'jane.employee@synapseuk.com', 'Jane Employee', 'Operations', 'Staff Member', 'EMP002');

-- Set line manager relationship
UPDATE profiles SET line_manager_id = '550e8400-e29b-41d4-a716-446655440000' WHERE id = '550e8400-e29b-41d4-a716-446655440001';
