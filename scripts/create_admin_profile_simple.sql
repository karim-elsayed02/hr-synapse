-- Create or update admin user profile with existing columns only
INSERT INTO profiles (
  id,
  email,
  full_name,
  department,
  position,
  role,
  created_at,
  updated_at
)
SELECT 
  auth.users.id,
  'admin@synapseuk.org',
  'System Administrator',
  'Administration',
  'System Admin',
  'admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE auth.users.email = 'admin@synapseuk.org'
ON CONFLICT (id) 
DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the profile was created
SELECT id, email, full_name, department, position, role 
FROM profiles 
WHERE email = 'admin@synapseuk.org';
