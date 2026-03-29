-- Add comprehensive SynapseUK roles to the database
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new comprehensive role constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'admin', 'manager', 'staff',
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
