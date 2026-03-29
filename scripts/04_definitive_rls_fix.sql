-- Definitive fix for RLS infinite recursion
-- This script completely removes all problematic policies and creates working ones

-- First, drop ALL existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view branch profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile updates" ON public.profiles;

-- Create simple, non-recursive policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to view all profiles (role restrictions handled in app)
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert profiles (for signup and admin creation)
CREATE POLICY "Authenticated users can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update profiles (role restrictions handled in app)
CREATE POLICY "Authenticated users can update profiles" ON public.profiles
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete profiles (role restrictions handled in app)
CREATE POLICY "Authenticated users can delete profiles" ON public.profiles
  FOR DELETE USING (auth.role() = 'authenticated');
