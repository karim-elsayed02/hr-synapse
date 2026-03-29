-- Check the structure of the profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check what data is actually in the profiles table
SELECT id, email, full_name, 
       CASE 
         WHEN column_name = 'role' THEN 'role column exists'
         ELSE 'checking other columns'
       END as role_check
FROM profiles 
LIMIT 5;

-- Check if there's a separate roles or user_roles table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%role%' OR table_name LIKE '%user%');
