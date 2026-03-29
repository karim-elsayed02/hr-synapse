-- Simple admin check that bypasses RLS issues
-- This creates a function that can check for admin existence without triggering RLS policies

-- Create a simple function to check if any admin exists
-- This uses a direct query with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.check_admin_exists()
RETURNS BOOLEAN AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Use a simple count query that bypasses RLS
  SELECT COUNT(*) INTO admin_count
  FROM public.profiles
  WHERE role = 'admin';
  
  RETURN admin_count > 0;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error (like table doesn't exist), assume no admin exists
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_admin_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_exists() TO anon;
