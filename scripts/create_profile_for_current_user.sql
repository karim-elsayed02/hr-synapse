INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  department,
  position,
  created_at,
  updated_at
) VALUES (
  '31c5b00a-a565-4883-aef1-2b87ff11558c',
  'admin@synapseuk.org',
  'System Administrator',
  'admin',
  'Administration',
  'System Administrator',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  updated_at = NOW();

-- Verify the profile was created
SELECT id, email, full_name, role, department, position 
FROM profiles 
WHERE id = '31c5b00a-a565-4883-aef1-2b87ff11558c';
