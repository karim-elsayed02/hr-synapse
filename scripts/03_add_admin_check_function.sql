-- Create a function to check if any admin exists without triggering RLS
CREATE OR REPLACE FUNCTION public.check_admin_exists()
RETURNS BOOLEAN AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS when checking for admin existence
  SELECT COUNT(*) INTO admin_count 
  FROM public.profiles 
  WHERE role = 'admin';
  
  RETURN admin_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_admin_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_exists() TO anon;
