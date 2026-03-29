-- Check all recent requests and their assignments
SELECT 
  r.id,
  r.title,
  r.status,
  r.created_at,
  r.profile_id as requester_id,
  r.assigned_to,
  requester.email as requester_email,
  requester.full_name as requester_name,
  assignee.email as assignee_email,
  assignee.full_name as assignee_name
FROM requests r
LEFT JOIN profiles requester ON r.profile_id = requester.id
LEFT JOIN profiles assignee ON r.assigned_to = assignee.id
ORDER BY r.created_at DESC
LIMIT 10;

-- Check if Umar's profile exists
SELECT 
  id,
  email,
  full_name,
  role
FROM profiles 
WHERE email ILIKE '%umar%' OR full_name ILIKE '%umar%';

-- Check auth users for Umar
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE email ILIKE '%umar%';
