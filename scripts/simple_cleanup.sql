-- Remove filler departments and positions, set to NULL for manual assignment
UPDATE profiles 
SET 
    department = NULL,
    position = NULL
WHERE 
    department IN ('Administration', 'Operations') 
    OR position IN ('Administrator', 'Operations Manager');

-- Update the admin user to have a proper name but NULL role/department for manual assignment
UPDATE profiles 
SET 
    full_name = 'System Administrator',
    department = NULL,
    position = NULL
WHERE email = 'admin@synapseuk.org';
