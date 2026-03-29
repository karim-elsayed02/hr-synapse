-- Safe cleanup of filler data handling foreign key constraints

-- First, let's see what we're working with
SELECT id, full_name, department, position, line_manager_id 
FROM profiles 
WHERE department IN ('Administration', 'Operations') 
   OR position IN ('Administrator', 'Operations Manager')
   OR full_name LIKE '%Admin%';

-- Update any profiles that have the admin as line manager to NULL temporarily
UPDATE profiles 
SET line_manager_id = NULL 
WHERE line_manager_id = '77a45470-cb7c-4973-b759-67fd4f5ce7ea';

-- Now we can safely update the admin user to have proper SynapseUK data
-- Convert the admin to a proper role instead of deleting
UPDATE profiles 
SET 
    full_name = 'System Administrator',
    department = 'Executive',
    position = 'Chief Executive Officer'
WHERE id = '77a45470-cb7c-4973-b759-67fd4f5ce7ea';

-- Update Zara's line manager to point to the CEO (former admin)
UPDATE profiles 
SET line_manager_id = '77a45470-cb7c-4973-b759-67fd4f5ce7ea'
WHERE email = 'zara.khan@synapseuk.org';

-- Clean up any remaining filler departments/positions
UPDATE profiles 
SET 
    department = CASE 
        WHEN department = 'Operations' THEN 'Executive'
        ELSE department 
    END,
    position = CASE 
        WHEN position = 'Operations Manager' THEN 'Chief Operating Officer'
        ELSE position 
    END
WHERE department = 'Operations' OR position = 'Operations Manager';

-- Fill in NULL departments and positions for any remaining users
UPDATE profiles 
SET 
    department = 'Medical Services',
    position = 'Medical Professional'
WHERE department IS NULL OR position IS NULL;

-- Show final results
SELECT id, full_name, department, position, line_manager_id FROM profiles ORDER BY full_name;
