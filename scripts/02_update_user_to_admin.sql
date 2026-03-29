-- Update your user role to admin
-- Replace 'your-email@example.com' with your actual email address

UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Verify the update
SELECT id, email, full_name, role, branch, department 
FROM public.profiles 
WHERE email = 'your-email@example.com';
