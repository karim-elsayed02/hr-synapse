-- Clean up all existing RLS policies and create simple, non-recursive ones
-- This script forcefully removes all policies and creates clean ones

-- Disable RLS temporarily to avoid conflicts
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles table (ignore errors if they don't exist)
DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    -- Get all policy names for profiles table and drop them
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_name);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Policy 1: Allow authenticated users to read their own profile
CREATE POLICY "users_can_read_own_profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Policy 2: Allow authenticated users to update their own profile
CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Policy 3: Allow admin users full access (using direct email check)
CREATE POLICY "admin_full_access" ON public.profiles
    FOR ALL
    USING (
        auth.jwt() ->> 'email' IN (
            'admin@synapseuk.org',
            'umar@synapseuk.org',
            'mohsin@synapseuk.org', 
            'zara@synapseuk.org'
        )
    );

-- Policy 4: Allow managers to read profiles in their branch (simple version)
CREATE POLICY "manager_branch_access" ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email IN (
                'umar@synapseuk.org',
                'mohsin@synapseuk.org', 
                'zara@synapseuk.org',
                'admin@synapseuk.org'
            )
        )
    );

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';
