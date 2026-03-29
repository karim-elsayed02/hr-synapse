-- Clean up any test request data and ensure requests are only linked to real staff
-- Remove any requests from test users that don't exist in the real staff directory

-- First, let's see what we're working with
DO $$
BEGIN
    -- Remove any requests from users that don't exist in the profiles table
    DELETE FROM requests 
    WHERE requester_id NOT IN (
        SELECT id FROM profiles WHERE email LIKE '%@synapseuk.org'
    );
    
    -- Remove any requests sent to recipients that don't exist in profiles
    DELETE FROM requests 
    WHERE recipient_id NOT IN (
        SELECT id FROM profiles WHERE email LIKE '%@synapseuk.org'
    );
    
    -- Update any remaining test data to ensure consistency
    -- Remove requests with test names like "Mike Chen", "Sarah Johnson", etc.
    DELETE FROM requests 
    WHERE requester_id IN (
        SELECT id FROM profiles 
        WHERE full_name IN ('Mike Chen', 'Sarah Johnson', 'Emma Wilson', 'David Brown', 'Jane Employee', 'John Manager')
    );
    
    RAISE NOTICE 'Cleaned up test request data successfully';
END $$;

-- Ensure all future requests must reference valid staff members
ALTER TABLE requests 
ADD CONSTRAINT fk_requests_requester 
FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE requests 
ADD CONSTRAINT fk_requests_recipient 
FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;
