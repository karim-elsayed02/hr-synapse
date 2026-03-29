-- Fix infinite recursion in RLS policies by using security definer functions
-- This script replaces the problematic policies with ones that don't create circular references

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view branch profiles" ON public.profiles;

-- Create a security definer function to check user roles without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS when checking roles
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE id = user_id;
  
  RETURN COALESCE(user_role, 'staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(user_id) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(user_id) IN ('manager', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policies using the security definer functions
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin());

-- Managers can view profiles in their branch (simplified to avoid recursion)
CREATE POLICY "Managers can view branch profiles" ON public.profiles
  FOR SELECT USING (
    public.is_manager_or_admin() AND (
      public.is_admin() OR 
      branch = (SELECT branch FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin(UUID) TO authenticated;
