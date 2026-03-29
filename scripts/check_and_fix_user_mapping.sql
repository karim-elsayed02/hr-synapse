-- Check current auth user and profile relationship
SELECT 
  'Auth Users' as table_name,
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'admin@synapseuk.org'

UNION ALL

SELECT 
  'Profiles' as table_name,
  id::text,
  email,
  created_at
FROM profiles 
WHERE email = 'admin@synapseuk.org';

-- Update profile ID to match auth user ID
UPDATE profiles 
SET id = (
  SELECT id FROM auth.users WHERE email = 'admin@synapseuk.org'
)
WHERE email = 'admin@synapseuk.org';

-- Verify the fix
SELECT 
  'After Fix - Auth Users' as table_name,
  id,
  email
FROM auth.users 
WHERE email = 'admin@synapseuk.org'

UNION ALL

SELECT 
  'After Fix - Profiles' as table_name,
  id::text,
  email
FROM profiles 
WHERE email = 'admin@synapseuk.org';
