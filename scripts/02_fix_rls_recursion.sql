-- Fix infinite recursion in RLS policies for profiles table
-- This script removes problematic recursive policies and creates simple, non-recursive ones

-- Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view branch profiles" ON public.profiles;
DROP POLICY IF EXISTS "Executives have full access" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Manager branch access" ON public.profiles;
DROP POLICY IF EXISTS "User own profile access" ON public.profiles;

-- Create simple, non-recursive RLS policies
-- Policy 1: Users can view and update their own profile
CREATE POLICY "own_profile_access" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Policy 2: Admin users can access all profiles (non-recursive)
CREATE POLICY "admin_full_access" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN (
        'admin@synapseuk.org',
        'umar@synapseuk.org', 
        'mohsin@synapseuk.org', 
        'zara@synapseuk.org'
      )
    )
  );

-- Policy 3: Manager users can view profiles in their branch (simplified)
CREATE POLICY "manager_branch_access" ON public.profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE email LIKE '%@synapseuk.org'
    )
    AND (
      -- Allow if user is a manager/admin
      auth.uid() IN (
        SELECT id FROM auth.users 
        WHERE email IN (
          'admin@synapseuk.org',
          'umar@synapseuk.org', 
          'mohsin@synapseuk.org', 
          'zara@synapseuk.org'
        )
      )
      -- Or if viewing own profile
      OR auth.uid() = id
    )
  );

-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
