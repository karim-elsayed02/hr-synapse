-- Remove filler/generic roles and departments, keep only real SynapseUK structure
-- This script removes generic system roles and keeps only the specific SynapseUK roles

-- First, let's see what we currently have
SELECT 'Current Roles:' as info;
SELECT DISTINCT role FROM profiles WHERE role IS NOT NULL ORDER BY role;

SELECT 'Current Departments:' as info;
SELECT name, branch_type, description FROM departments ORDER BY branch_type, name;

-- Update any profiles with generic roles to more specific SynapseUK roles
-- Convert generic 'admin' to 'Chief Executive Officer' for the main admin
UPDATE profiles 
SET role = 'Chief Executive Officer'
WHERE email = 'admin@synapseuk.org' AND role = 'admin';

-- Convert generic 'manager' to appropriate leadership roles based on department
UPDATE profiles 
SET role = 'Chief Operating Officer'
WHERE role = 'manager' AND (department = 'Operations' OR position LIKE '%Operations%');

-- Convert generic 'staff' to 'Tutor' for tutoring department
UPDATE profiles 
SET role = 'Tutor'
WHERE role = 'staff' AND (department LIKE '%Tutoring%' OR position LIKE '%Tutor%');

-- Remove the generic role constraints and keep only SynapseUK-specific roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add constraint with only real SynapseUK roles (no generic admin/manager/staff)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'Chief Executive Officer',
  'Chief Operating Officer', 
  'Chief Financial Officer',
  'Tutoring Lead',
  'Medical Lead',
  'Dental Lead',
  'Medical Admissions Lead',
  'Dental Admissions Lead',
  'Oxbridge Admissions Lead',
  'Medical Work Experience Lead',
  'Dental Work Experience Lead',
  'Tutor',
  'Dental Admissions Mentor',
  'Medical Admissions Mentor',
  'Dental Work Experience Mentor',
  'Medical Work Experience Mentor',
  'Ambassador',
  'Medical Education Lead',
  'Dental Education Lead',
  'Medical Events Lead',
  'Dental Events Lead',
  'Events Curriculum Lead',
  'Events Representative',
  'Events Outreach Officer'
));

-- Clean up any test departments that aren't part of the real SynapseUK structure
-- Keep only the real departmental structure we created

-- Show final results
SELECT 'Final Roles:' as info;
SELECT DISTINCT role FROM profiles WHERE role IS NOT NULL ORDER BY role;

SELECT 'Final Departments:' as info;
SELECT name, branch_type, description FROM departments ORDER BY branch_type, name;

SELECT 'Final Staff:' as info;
SELECT email, full_name, role, department FROM profiles ORDER BY role, full_name;
