-- Create authentication users for existing profiles
-- This script creates users in Supabase's auth.users table and links them to profiles

-- Note: You'll need to run this in the Supabase SQL Editor
-- The passwords will need to be set through Supabase's dashboard or API

-- First, let's check if profiles exist
DO $$
BEGIN
  -- Create admin user if profile exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = 'admin@synapseuk.org') THEN
    -- Insert into auth.users (this requires admin privileges)
    -- You'll need to do this through Supabase Dashboard > Authentication > Users > Add User
    RAISE NOTICE 'Profile exists for admin@synapseuk.org - Create auth user in Supabase Dashboard';
  END IF;

  -- Create CEO user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = 'umar@synapseuk.org') THEN
    RAISE NOTICE 'Profile exists for umar@synapseuk.org - Create auth user in Supabase Dashboard';
  END IF;

  -- Create CFO user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = 'mohsin@synapseuk.org') THEN
    RAISE NOTICE 'Profile exists for mohsin@synapseuk.org - Create auth user in Supabase Dashboard';
  END IF;

  -- Create COO user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = 'zara@synapseuk.org') THEN
    RAISE NOTICE 'Profile exists for zara@synapseuk.org - Create auth user in Supabase Dashboard';
  END IF;
END $$;

-- Update the profiles table to ensure it has the correct structure
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create a trigger to automatically create profiles when auth users are created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
