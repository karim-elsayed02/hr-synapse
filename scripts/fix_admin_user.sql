-- Fix admin user permissions
-- First, check if admin profile exists
SELECT 'Current admin profile:' as info;
SELECT id, email, full_name, role, branch, department 
FROM profiles 
WHERE email = 'admin@synapseuk.org';

-- Update or insert admin profile with proper permissions
INSERT INTO profiles (id, email, full_name, role, branch, department)
SELECT 
    auth.uid(),
    'admin@synapseuk.org',
    'System Administrator',
    'admin',
    'Head Office',
    'Executive'
FROM auth.users 
WHERE email = 'admin@synapseuk.org'
ON CONFLICT (email) 
DO UPDATE SET 
    role = 'admin',
    full_name = COALESCE(profiles.full_name, 'System Administrator'),
    branch = COALESCE(profiles.branch, 'Head Office'),
    department = COALESCE(profiles.department, 'Executive');

-- Verify the fix
SELECT 'Updated admin profile:' as info;
SELECT id, email, full_name, role, branch, department 
FROM profiles 
WHERE email = 'admin@synapseuk.org';
