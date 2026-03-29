-- Check all users in the profiles table
SELECT 
  id,
  email,
  full_name,
  role,
  branch,
  department,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- Also check auth.users table to see if there are users without profiles
SELECT 
  u.id,
  u.email,
  u.created_at as auth_created,
  p.full_name,
  p.role,
  CASE 
    WHEN p.id IS NULL THEN 'Missing Profile'
    ELSE 'Has Profile'
  END as profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
