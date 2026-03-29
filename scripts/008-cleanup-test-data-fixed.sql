-- Clean up test request data and ensure only real SynapseUK staff data remains
-- This script safely removes test data without breaking the existing structure

-- First, let's see what test data exists (optional - for debugging)
-- SELECT * FROM profiles WHERE email NOT LIKE '%@synapseuk.org';

-- Remove any requests from test users (users not with @synapseuk.org emails)
DELETE FROM requests 
WHERE profile_id IN (
    SELECT id FROM profiles 
    WHERE email NOT LIKE '%@synapseuk.org'
);

-- Remove test profiles (keeping only real SynapseUK staff)
DELETE FROM profiles 
WHERE email NOT LIKE '%@synapseuk.org';

-- Ensure we have the real SynapseUK admin and staff
-- Insert admin if not exists
INSERT INTO profiles (email, full_name, department, position, employee_id)
SELECT 'admin@synapseuk.org', 'SynapseUK Admin', 'Administration', 'Administrator', 'ADMIN001'
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@synapseuk.org');

-- Insert Zara S Khan if not exists
INSERT INTO profiles (email, full_name, department, position, employee_id)
SELECT 'zara.khan@synapseuk.org', 'Zara S Khan', 'Operations', 'Manager', 'EMP003'
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'zara.khan@synapseuk.org');

-- Set line manager relationships for real staff
UPDATE profiles 
SET line_manager_id = (SELECT id FROM profiles WHERE email = 'admin@synapseuk.org')
WHERE email = 'zara.khan@synapseuk.org';

-- Display remaining profiles to confirm cleanup
SELECT email, full_name, department, position FROM profiles ORDER BY email;
