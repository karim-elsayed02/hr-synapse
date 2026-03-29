SELECT 
  'Auth User' as source,
  au.id as user_id,
  au.email,
  au.created_at
FROM auth.users au 
WHERE au.email = 'admin@synapseuk.org'

UNION ALL

SELECT 
  'Profile' as source,
  p.id as user_id,
  p.email,
  p.created_at
FROM profiles p 
WHERE p.email = 'admin@synapseuk.org';

-- Check if there's a mismatch and show what the request creation is trying to use
SELECT 
  'Current session user ID that would be used for requests:' as info,
  au.id as auth_user_id
FROM auth.users au 
WHERE au.email = 'admin@synapseuk.org';
