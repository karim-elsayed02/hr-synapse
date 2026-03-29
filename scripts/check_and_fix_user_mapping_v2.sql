-- Check and fix user ID mapping between auth.users and profiles
-- First, let's see what we have in both tables for admin@synapseuk.org

-- Check auth.users table
SELECT 
  'auth.users' as source,
  id::text as user_id,
  email,
  created_at
FROM auth.users 
WHERE email = 'admin@synapseuk.org';

-- Check profiles table  
SELECT 
  'profiles' as source,
  id::text as user_id,
  email,
  created_at
FROM profiles 
WHERE email = 'admin@synapseuk.org';

-- Now let's fix the profile record to match the auth user ID
UPDATE profiles 
SET id = (
  SELECT id FROM auth.users WHERE email = 'admin@synapseuk.org'
)
WHERE email = 'admin@synapseuk.org';

-- Verify the fix
SELECT 
  'After fix - profiles' as source,
  id::text as user_id,
  email,
  full_name,
  role
FROM profiles 
WHERE email = 'admin@synapseuk.org';
