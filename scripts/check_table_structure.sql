-- Check what columns exist in the profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if there are any role-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%role%' 
OR table_name LIKE '%department%'
OR table_name LIKE '%staff%';

-- Check sample data from profiles table
SELECT * FROM profiles LIMIT 5;
