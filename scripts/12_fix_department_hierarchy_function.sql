-- Fix the type mismatch in the recursive CTE for get_department_hierarchy function

DROP FUNCTION IF EXISTS get_department_hierarchy();

-- Create function to get department hierarchy with consistent types
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
  WITH RECURSIVE dept_hierarchy AS (
    -- Base case: main branches
    SELECT 
      d.id,
      d.name,
      d.parent_id,
      -- Cast to TEXT to ensure consistent types throughout the CTE
      CAST(NULL AS TEXT) as parent_name,
      d.branch_type,
      -- Cast to TEXT for consistent type handling
      CAST(d.name AS TEXT) as full_path
    FROM public.departments d
    WHERE d.parent_id IS NULL
    
    UNION ALL
    
    -- Recursive case: sub-departments
    SELECT 
      d.id,
      d.name,
      d.parent_id,
      -- Cast to TEXT to match the base case
      CAST(dh.name AS TEXT) as parent_name,
      d.branch_type,
      -- Ensure TEXT concatenation
      dh.full_path || ' > ' || CAST(d.name AS TEXT) as full_path
    FROM public.departments d
    JOIN dept_hierarchy dh ON d.parent_id = dh.id
  )
  SELECT 
    -- Fixed table alias from dh to dept_hierarchy
    dept_hierarchy.id,
    dept_hierarchy.name,
    dept_hierarchy.parent_id,
    -- Cast back to VARCHAR(100) for the final result
    CAST(dept_hierarchy.parent_name AS VARCHAR(100)) as parent_name,
    dept_hierarchy.branch_type,
    dept_hierarchy.full_path
  FROM dept_hierarchy 
  ORDER BY dept_hierarchy.full_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_department_hierarchy() TO authenticated;
