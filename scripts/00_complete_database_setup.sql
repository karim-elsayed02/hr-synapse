-- Complete SynapseUK Staff Platform Database Setup
-- Run this script on a fresh Supabase database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table to extend auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff',
  branch TEXT,
  department TEXT,
  phone TEXT,
  emergency_contact TEXT,
  compliance_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comprehensive role constraint for SynapseUK roles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_role_check' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN (
      'admin', 'manager', 'staff',
      'Chief Executive Officer',
      'Chief Operating Officer', 
      'Chief Financial Officer',
      'Tutoring Lead',
      'Medical Lead',
      'Dental Lead',
      'Medical Admissions Lead',
      'Dental Admissions Lead',
      'Oxbridge Admissions Lead',
      'Medical Work Experience Lead',
      'Dental Work Experience Lead',
      'Tutor',
      'Dental Admissions Mentor',
      'Medical Admissions Mentor',
      'Dental Work Experience Mentor',
      'Medical Work Experience Mentor',
      'Ambassador',
      'Medical Education Lead',
      'Dental Education Lead',
      'Medical Events Lead',
      'Dental Events Lead',
      'Events Curriculum Lead',
      'Events Representative',
      'Events Outreach Officer'
    ));
  END IF;
END $$;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create departments table for hierarchical structure
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

-- Insert departments without ON CONFLICT to avoid constraint errors
-- Insert main branches only if they don't exist
INSERT INTO public.departments (id, name, parent_id, branch_type, description) 
SELECT 1, 'Admissions', NULL, 'main_branch', 'Student admissions and applications'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE id = 1);

INSERT INTO public.departments (id, name, parent_id, branch_type, description) 
SELECT 2, 'Work Experience', NULL, 'main_branch', 'Work experience placements and coordination'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE id = 2);

INSERT INTO public.departments (id, name, parent_id, branch_type, description) 
SELECT 3, 'Tutoring', NULL, 'main_branch', 'Educational tutoring services'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE id = 3);

INSERT INTO public.departments (id, name, parent_id, branch_type, description) 
SELECT 4, 'Events', NULL, 'main_branch', 'Event planning and management'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE id = 4);

INSERT INTO public.departments (id, name, parent_id, branch_type, description) 
SELECT 5, 'Education', NULL, 'main_branch', 'Educational programs and curriculum'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE id = 5);

-- Insert sub-departments only if they don't exist
INSERT INTO public.departments (name, parent_id, branch_type, description) 
SELECT 'Medical Admissions', 1, 'sub_department', 'Medical school admissions'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'Medical Admissions' AND parent_id = 1);

INSERT INTO public.departments (name, parent_id, branch_type, description) 
SELECT 'Dental Admissions', 1, 'sub_department', 'Dental school admissions'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'Dental Admissions' AND parent_id = 1);

INSERT INTO public.departments (name, parent_id, branch_type, description) 
SELECT 'Oxbridge Admissions', 1, 'sub_department', 'Oxford and Cambridge admissions'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'Oxbridge Admissions' AND parent_id = 1);

INSERT INTO public.departments (name, parent_id, branch_type, description) 
SELECT 'Medical Work Experience', 2, 'sub_department', 'Medical work experience placements'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'Medical Work Experience' AND parent_id = 2);

INSERT INTO public.departments (name, parent_id, branch_type, description) 
SELECT 'Dental Work Experience', 2, 'sub_department', 'Dental work experience placements'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'Dental Work Experience' AND parent_id = 2);

INSERT INTO public.departments (name, parent_id, branch_type, description) 
SELECT 'Medical Tutoring', 3, 'sub_department', 'Medical tutoring services'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'Medical Tutoring' AND parent_id = 3);

INSERT INTO public.departments (name, parent_id, branch_type, description) 
SELECT 'Dental Tutoring', 3, 'sub_department', 'Dental tutoring services'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'Dental Tutoring' AND parent_id = 3);

INSERT INTO public.departments (name, parent_id, branch_type, description) 
SELECT 'Tutoring Events', 4, 'sub_department', 'Tutoring-related events'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'Tutoring Events' AND parent_id = 4);

INSERT INTO public.departments (name, parent_id, branch_type, description) 
SELECT 'Medical Education', 5, 'sub_department', 'Medical education programs'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'Medical Education' AND parent_id = 5);

INSERT INTO public.departments (name, parent_id, branch_type, description) 
SELECT 'Dental Education', 5, 'sub_department', 'Dental education programs'
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'Dental Education' AND parent_id = 5);

-- Reset sequence to continue from the highest ID
SELECT setval('departments_id_seq', (SELECT COALESCE(MAX(id), 0) FROM public.departments));

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'staff', 'managers', 'executives')),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on announcements table
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  uploaded_by UUID REFERENCES public.profiles(id),
  target_user UUID REFERENCES public.profiles(id), -- For user-specific documents
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create requests table
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_review')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  requested_by UUID REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on requests table
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Create safeguarding table
CREATE TABLE IF NOT EXISTS public.safeguarding_cases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  reported_by UUID REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  incident_date TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on safeguarding table
ALTER TABLE public.safeguarding_cases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones to avoid conflicts
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies on all tables
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
    END LOOP;
END $$;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Executive team (CEO, COO, CFO) can view all profiles
CREATE POLICY "Executive team can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

-- Executive team can update all profiles
CREATE POLICY "Executive team can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

-- Executive team can insert new profiles
CREATE POLICY "Executive team can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

-- Simplified branch-based access policy to avoid column reference issues
-- Leads and managers can view profiles in their branch
CREATE POLICY "Branch leads can view branch profiles" ON public.profiles
  FOR SELECT USING (
    -- Executive team can see all
    EXISTS (
      SELECT 1 FROM public.profiles user_profile
      WHERE user_profile.id = auth.uid() 
      AND user_profile.role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
    OR
    -- Branch leads can see their branch
    EXISTS (
      SELECT 1 FROM public.profiles user_profile
      WHERE user_profile.id = auth.uid() 
      AND user_profile.role LIKE '%Lead%'
      AND user_profile.branch = public.profiles.branch
    )
    OR
    -- Managers can see their branch
    EXISTS (
      SELECT 1 FROM public.profiles user_profile
      WHERE user_profile.id = auth.uid() 
      AND user_profile.role = 'manager'
      AND user_profile.branch = public.profiles.branch
    )
  );

-- RLS policies for departments
CREATE POLICY "Allow all authenticated users to read departments" ON public.departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow executive team to manage departments" ON public.departments
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

-- RLS policies for tasks
CREATE POLICY "Users can view assigned tasks" ON public.tasks
  FOR SELECT USING (
    assigned_to = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their tasks" ON public.tasks
  FOR UPDATE USING (
    assigned_to = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

-- RLS policies for announcements
CREATE POLICY "All users can read published announcements" ON public.announcements
  FOR SELECT USING (is_published = true);

CREATE POLICY "Executive team can manage announcements" ON public.announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

-- RLS policies for documents
CREATE POLICY "Users can view public documents" ON public.documents
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their assigned documents" ON public.documents
  FOR SELECT USING (target_user = auth.uid());

CREATE POLICY "Users can view documents they uploaded" ON public.documents
  FOR SELECT USING (uploaded_by = auth.uid());

CREATE POLICY "Executive team can manage all documents" ON public.documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

-- RLS policies for requests
CREATE POLICY "Users can view their requests" ON public.requests
  FOR SELECT USING (
    requested_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

CREATE POLICY "Users can create requests" ON public.requests
  FOR INSERT WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Assigned users can update requests" ON public.requests
  FOR UPDATE USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

-- RLS policies for safeguarding
CREATE POLICY "Executive team can view all safeguarding cases" ON public.safeguarding_cases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

CREATE POLICY "Users can view assigned safeguarding cases" ON public.safeguarding_cases
  FOR SELECT USING (assigned_to = auth.uid() OR reported_by = auth.uid());

CREATE POLICY "Executive team can manage safeguarding cases" ON public.safeguarding_cases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'Chief Executive Officer', 'Chief Operating Officer', 'Chief Financial Officer')
    )
  );

-- Drop existing functions and triggers before recreating to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers before recreating
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
DROP TRIGGER IF EXISTS update_requests_updated_at ON public.requests;
DROP TRIGGER IF EXISTS update_safeguarding_updated_at ON public.safeguarding_cases;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_safeguarding_updated_at
  BEFORE UPDATE ON public.safeguarding_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get department hierarchy
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

-- Create indexes for better performance (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON public.departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles(branch);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_target_user ON public.documents(target_user);
CREATE INDEX IF NOT EXISTS idx_requests_requested_by ON public.requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON public.requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_safeguarding_assigned_to ON public.safeguarding_cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_safeguarding_reported_by ON public.safeguarding_cases(reported_by);
