-- Drop the problematic recursive function and create a simpler approach
DROP FUNCTION IF EXISTS get_department_hierarchy();

-- Create a simpler function that gets departments with parent information
CREATE OR REPLACE FUNCTION get_department_hierarchy()
RETURNS TABLE (
  id INTEGER,
  name VARCHAR(100),
  parent_id INTEGER,
  parent_name VARCHAR(100),
  branch_type VARCHAR(50),
  full_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.parent_id,
    COALESCE(p.name, '') as parent_name,
    d.branch_type,
    CASE 
      WHEN d.parent_id IS NULL THEN d.name
      ELSE COALESCE(p.name, '') || ' > ' || d.name
    END as full_path
  FROM public.departments d
  LEFT JOIN public.departments p ON d.parent_id = p.id
  ORDER BY 
    CASE WHEN d.parent_id IS NULL THEN 0 ELSE 1 END,
    COALESCE(p.name, ''),
    d.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_department_hierarchy() TO authenticated;
