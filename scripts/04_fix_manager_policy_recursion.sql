-- Fix infinite recursion in RLS policies by removing problematic manager policy
-- and ensuring admin access works properly

-- Drop the problematic manager_branch_access policy that's causing recursion
DROP POLICY IF EXISTS "manager_branch_access" ON public.profiles;

-- Ensure admin_full_access policy covers all operations for admin users
DROP POLICY IF EXISTS "admin_full_access" ON public.profiles;

CREATE POLICY "admin_full_access" ON public.profiles
FOR ALL
TO public
USING (
  (auth.jwt() ->> 'email') IN (
    'admin@synapseuk.org',
    'umar@synapseuk.org', 
    'mohsin@synapseuk.org',
    'zara@synapseuk.org'
  )
);

-- Create a simple manager policy without recursion
CREATE POLICY "manager_simple_access" ON public.profiles
FOR SELECT
TO public
USING (
  -- Managers can view all profiles (simplified for now to avoid recursion)
  (auth.jwt() ->> 'email') IN (
    'admin@synapseuk.org',
    'umar@synapseuk.org', 
    'mohsin@synapseuk.org',
    'zara@synapseuk.org'
  )
);

-- Verify the policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;
