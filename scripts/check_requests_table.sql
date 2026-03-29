SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'requests' 
ORDER BY ordinal_position;

-- Also show sample data to understand the structure
SELECT * FROM requests LIMIT 3;
