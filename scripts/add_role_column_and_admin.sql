-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';

-- Create index for better performance on role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update admin user to have admin role
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@synapseuk.org';

-- If admin user doesn't exist, create them
INSERT INTO profiles (email, full_name, role, department, position)
VALUES ('admin@synapseuk.org', 'System Administrator', 'admin', 'IT', 'Administrator')
ON CONFLICT (email) DO UPDATE SET 
  role = 'admin',
  full_name = COALESCE(profiles.full_name, 'System Administrator'),
  department = COALESCE(profiles.department, 'IT'),
  position = COALESCE(profiles.position, 'Administrator');

-- Verify the admin user
SELECT id, email, full_name, role, department, position 
FROM profiles 
WHERE email = 'admin@synapseuk.org';
