-- Insert Chief Officers with proper roles
-- Run this script after the main database setup and after the users have signed up

-- Update Umar Humza Saifuddin to Chief Executive Officer
UPDATE public.profiles 
SET 
  role = 'Chief Executive Officer',
  branch = 'Executive',
  department = 'Leadership',
  compliance_status = 'approved'
WHERE email = 'umar@synapseuk.org' OR full_name ILIKE '%Umar Humza Saifuddin%';

-- Update Mohsin Mohammad to Chief Financial Officer
UPDATE public.profiles 
SET 
  role = 'Chief Financial Officer',
  branch = 'Executive',
  department = 'Finance',
  compliance_status = 'approved'
WHERE email = 'mohsin@synapseuk.org' OR full_name ILIKE '%Mohsin Mohammad%';

-- Update Zara S Khan to Chief Operating Officer
UPDATE public.profiles 
SET 
  role = 'Chief Operating Officer',
  branch = 'Executive',
  department = 'Operations',
  compliance_status = 'approved'
WHERE email = 'zara@synapseuk.org' OR full_name ILIKE '%Zara S Khan%';

-- Verify the updates
SELECT 
  id,
  email,
  full_name,
  role,
  branch,
  department,
  compliance_status,
  created_at
FROM public.profiles 
WHERE role IN ('Chief Executive Officer', 'Chief Financial Officer', 'Chief Operating Officer')
ORDER BY role;
