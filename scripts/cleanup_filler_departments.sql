-- Clean up filler departments and positions
-- Remove generic "Administration" department and "Administrator" positions
-- Update to use proper SynapseUK structure

-- Remove the generic admin user (keep real staff)
DELETE FROM profiles 
WHERE email = 'admin@synapseuk.org' 
   OR full_name = 'SynapseUK Admin';

-- Update any remaining generic positions to proper SynapseUK roles
UPDATE profiles 
SET department = 'Executive Leadership',
    position = 'Chief Executive Officer'
WHERE position = 'Administrator' AND department = 'Administration';

-- Update Operations Manager to proper role
UPDATE profiles 
SET department = 'Operations',
    position = 'Operations Lead'
WHERE position = 'Operations Manager';

-- Update any NULL departments/positions for existing staff
UPDATE profiles 
SET department = 'Medical Services',
    position = 'Medical Practitioner'
WHERE department IS NULL AND position IS NULL;

-- Show remaining data
SELECT id, email, full_name, department, position, line_manager_id 
FROM profiles 
ORDER BY department, position;
