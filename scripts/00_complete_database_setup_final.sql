-- Complete SynapseUK Staff Platform Database Setup (Final Version)
-- This script handles existing data gracefully

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;

-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES public.departments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table with all necessary columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    branch TEXT,
    department TEXT,
    department_id INTEGER REFERENCES public.departments(id),
    phone TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    address TEXT,
    date_of_birth DATE,
    hire_date DATE,
    salary DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraint for valid roles
    CONSTRAINT valid_role CHECK (role IN (
        'admin', 'staff', 'manager', 'director', 'head_of_department',
        'ceo', 'coo', 'cfo', 'cto', 'chief_marketing_officer',
        'chief_academic_officer', 'chief_admissions_officer',
        'senior_manager', 'assistant_manager', 'team_lead',
        'senior_staff', 'junior_staff', 'intern', 'consultant'
    ))
);

-- Insert main departments (using SERIAL for auto-incrementing IDs)
INSERT INTO public.departments (name, parent_id) VALUES
('Executive', NULL),
('Admissions', NULL),
('Academic Affairs', NULL),
('Student Services', NULL),
('Operations', NULL);

-- Get the department IDs for sub-departments
DO $$
DECLARE
    exec_id INTEGER;
    admissions_id INTEGER;
    academic_id INTEGER;
    student_id INTEGER;
    ops_id INTEGER;
BEGIN
    -- Get department IDs
    SELECT id INTO exec_id FROM public.departments WHERE name = 'Executive' AND parent_id IS NULL;
    SELECT id INTO admissions_id FROM public.departments WHERE name = 'Admissions' AND parent_id IS NULL;
    SELECT id INTO academic_id FROM public.departments WHERE name = 'Academic Affairs' AND parent_id IS NULL;
    SELECT id INTO student_id FROM public.departments WHERE name = 'Student Services' AND parent_id IS NULL;
    SELECT id INTO ops_id FROM public.departments WHERE name = 'Operations' AND parent_id IS NULL;

    -- Insert sub-departments
    INSERT INTO public.departments (name, parent_id) VALUES
    -- Executive sub-departments
    ('CEO Office', exec_id),
    ('COO Office', exec_id),
    ('CFO Office', exec_id),
    
    -- Admissions sub-departments
    ('Medical Admissions', admissions_id),
    ('Dental Admissions', admissions_id),
    ('Pharmacy Admissions', admissions_id),
    ('Nursing Admissions', admissions_id),
    
    -- Academic sub-departments
    ('Medical Faculty', academic_id),
    ('Dental Faculty', academic_id),
    ('Pharmacy Faculty', academic_id),
    ('Nursing Faculty', academic_id),
    
    -- Student Services sub-departments
    ('Student Support', student_id),
    ('Career Services', student_id),
    ('International Office', student_id),
    
    -- Operations sub-departments
    ('IT Department', ops_id),
    ('HR Department', ops_id),
    ('Finance Department', ops_id),
    ('Facilities', ops_id);
END $$;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Everyone can view departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Executives and admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id::text = auth.uid()::text 
            AND (role IN ('admin', 'ceo', 'coo', 'cfo') OR role = 'admin')
        )
    );

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Executives and admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id::text = auth.uid()::text 
            AND (role IN ('admin', 'ceo', 'coo', 'cfo') OR role = 'admin')
        )
    );

CREATE POLICY "Executives and admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id::text = auth.uid()::text 
            AND (role IN ('admin', 'ceo', 'coo', 'cfo') OR role = 'admin')
        )
    );

CREATE POLICY "Executives and admins can delete profiles" ON public.profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id::text = auth.uid()::text 
            AND (role IN ('admin', 'ceo', 'coo', 'cfo') OR role = 'admin')
        )
    );

-- Create RLS policies for departments
CREATE POLICY "Everyone can view departments" ON public.departments
    FOR SELECT USING (true);

CREATE POLICY "Executives and admins can manage departments" ON public.departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id::text = auth.uid()::text 
            AND (role IN ('admin', 'ceo', 'coo', 'cfo') OR role = 'admin')
        )
    );

-- Create function to handle profile updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS departments_updated_at ON public.departments;
CREATE TRIGGER departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to sync user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'staff');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.departments TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
