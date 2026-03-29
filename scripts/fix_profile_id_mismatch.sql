-- Fix the profile ID mismatch by updating the existing profile to use the current session user ID
-- This handles foreign key constraints by temporarily removing line manager references

BEGIN;

-- First, find the current profile ID for admin@synapseuk.org
DO $$
DECLARE
    old_profile_id UUID;
    new_profile_id UUID := '31c5b00a-a565-4883-aef1-2b87ff11558c';
BEGIN
    -- Get the existing profile ID
    SELECT id INTO old_profile_id FROM profiles WHERE email = 'admin@synapseuk.org';
    
    IF old_profile_id IS NOT NULL AND old_profile_id != new_profile_id THEN
        -- Temporarily remove line manager references to this profile
        UPDATE profiles 
        SET line_manager_id = NULL 
        WHERE line_manager_id = old_profile_id;
        
        -- Update the profile ID to match the current session
        UPDATE profiles 
        SET id = new_profile_id 
        WHERE email = 'admin@synapseuk.org';
        
        -- Restore line manager references with the new ID
        UPDATE profiles 
        SET line_manager_id = new_profile_id 
        WHERE line_manager_id IS NULL AND email != 'admin@synapseuk.org';
        
        RAISE NOTICE 'Updated profile ID from % to %', old_profile_id, new_profile_id;
    ELSE
        RAISE NOTICE 'Profile ID already matches or profile not found';
    END IF;
END $$;

COMMIT;

-- Verify the fix
SELECT 
    'Profile after fix' as info,
    id,
    email,
    full_name,
    role
FROM profiles 
WHERE email = 'admin@synapseuk.org';
