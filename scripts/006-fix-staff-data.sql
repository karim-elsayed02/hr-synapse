-- Remove test users and add real users
DELETE FROM profiles WHERE email IN ('john.manager@synapseuk.com', 'jane.employee@synapseuk.com');

-- Add real users based on your system
-- Update the existing admin profile with proper details
UPDATE profiles 
SET 
    full_name = 'SynapseUK Admin',
    department = 'Administration',
    position = 'System Administrator',
    employee_id = 'ADMIN001'
WHERE email = 'admin@synapseuk.org';

-- Add Zara S Khan if she doesn't exist
INSERT INTO profiles (id, email, full_name, department, position, employee_id) 
VALUES (
    gen_random_uuid(),
    'zara.khan@synapseuk.org',
    'Zara S Khan',
    'Operations',
    'Operations Manager',
    'EMP003'
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    department = EXCLUDED.department,
    position = EXCLUDED.position,
    employee_id = EXCLUDED.employee_id;
