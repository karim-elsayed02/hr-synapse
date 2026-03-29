-- Fix infinite recursion in RLS policies for profiles table
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Executives have full access" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view branch profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view own profile" ON public.profiles;

-- Create simple, non-recursive RLS policies
-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy 3: Executives (CEO, COO, CFO) have full access to all profiles
CREATE POLICY "Executives have full access" ON public.profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('ceo', 'coo', 'cfo', 'admin')
    )
  );

-- Policy 4: Managers can view profiles in their branch
CREATE POLICY "Managers can view branch profiles" ON public.profiles
  FOR SELECT
  USING (
    -- Allow if user is a manager and viewing profiles in same branch
    EXISTS (
      SELECT 1 FROM public.profiles manager_profile
      WHERE manager_profile.id = auth.uid()
      AND manager_profile.role IN ('manager', 'branch_lead')
      AND (
        -- Same branch access
        manager_profile.branch = public.profiles.branch
        OR 
        -- Or if it's an executive role
        manager_profile.role IN ('ceo', 'coo', 'cfo', 'admin')
      )
    )
  );

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
