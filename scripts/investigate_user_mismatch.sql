-- Check for existing profiles and auth users with admin@synapseuk.org
SELECT 'Existing Profile' as source, id, email, full_name, created_at
FROM profiles 
WHERE email = 'admin@synapseuk.org';

-- Check auth users table
SELECT 'Auth User' as source, id, email, created_at
FROM auth.users 
WHERE email = 'admin@synapseuk.org';

-- Show current session info
SELECT 'Current Session' as source, '31c5b00a-a565-4883-aef1-2b87ff11558c'::uuid as id, 'admin@synapseuk.org' as email, now() as created_at;
