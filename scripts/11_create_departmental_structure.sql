-- Create departmental structure for SynapseUK
-- Main branches: Admissions, Work Experience, Tutoring, Events, Education
-- Sub-departments: Medical, Dental, Oxbridge, Tutoring

-- Create departments table to store the hierarchical structure
CREATE TABLE IF NOT EXISTS public.departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  parent_id INTEGER REFERENCES public.departments(id),
  branch_type VARCHAR(50) NOT NULL, -- 'main_branch' or 'sub_department'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on departments table
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for departments
CREATE POLICY "Allow all authenticated users to read departments" ON public.departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admins to manage departments" ON public.departments
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Insert SynapseUK departmental structure
INSERT INTO public.departments (name, parent_id, branch_type, description) VALUES
-- Main branches (no parent)
('Admissions', NULL, 'main_branch', 'Student admissions and applications'),
('Work Experience', NULL, 'main_branch', 'Work experience placements and coordination'),
('Tutoring', NULL, 'main_branch', 'Educational tutoring services'),
('Events', NULL, 'main_branch', 'Event planning and management'),
('Education', NULL, 'main_branch', 'Educational programs and curriculum');

-- Get the IDs of main branches for sub-departments
WITH branch_ids AS (
  SELECT id, name FROM public.departments WHERE parent_id IS NULL
)
INSERT INTO public.departments (name, parent_id, branch_type, description) VALUES
-- Admissions sub-departments
('Medical', (SELECT id FROM branch_ids WHERE name = 'Admissions'), 'sub_department', 'Medical school admissions'),
('Dental', (SELECT id FROM branch_ids WHERE name = 'Admissions'), 'sub_department', 'Dental school admissions'),
('Oxbridge', (SELECT id FROM branch_ids WHERE name = 'Admissions'), 'sub_department', 'Oxford and Cambridge admissions'),

-- Work Experience sub-departments
('Medical', (SELECT id FROM branch_ids WHERE name = 'Work Experience'), 'sub_department', 'Medical work experience placements'),
('Dental', (SELECT id FROM branch_ids WHERE name = 'Work Experience'), 'sub_department', 'Dental work experience placements'),

-- Tutoring sub-departments
('Medical', (SELECT id FROM branch_ids WHERE name = 'Tutoring'), 'sub_department', 'Medical tutoring services'),
('Dental', (SELECT id FROM branch_ids WHERE name = 'Tutoring'), 'sub_department', 'Dental tutoring services'),

-- Events sub-departments
('Tutoring', (SELECT id FROM branch_ids WHERE name = 'Events'), 'sub_department', 'Tutoring-related events'),

-- Education sub-departments
('Medical', (SELECT id FROM branch_ids WHERE name = 'Education'), 'sub_department', 'Medical education programs'),
('Dental', (SELECT id FROM branch_ids WHERE name = 'Education'), 'sub_department', 'Dental education programs');

-- Create function to get department hierarchy
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
      CAST(NULL AS VARCHAR(100)) as parent_name,
      d.branch_type,
      d.name as full_path
    FROM public.departments d
    WHERE d.parent_id IS NULL
    
    UNION ALL
    
    -- Recursive case: sub-departments
    SELECT 
      d.id,
      d.name,
      d.parent_id,
      dh.name as parent_name,
      d.branch_type,
      dh.full_path || ' > ' || d.name as full_path
    FROM public.departments d
    JOIN dept_hierarchy dh ON d.parent_id = dh.id
  )
  SELECT * FROM dept_hierarchy ORDER BY full_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_department_hierarchy() TO authenticated;

-- Update existing profiles to have proper department structure
-- This is optional - you can manually assign users to departments via the UI
UPDATE public.profiles 
SET 
  branch = 'Admissions',
  department = 'Medical'
WHERE role = 'admin'; -- Assign admin to a default department

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON public.departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles(branch);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
