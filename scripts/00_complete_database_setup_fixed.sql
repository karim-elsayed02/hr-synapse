-- SynapseUK Staff Platform - Complete Database Setup (Fixed Version)
-- This script sets up all tables, roles, and permissions for a fresh Supabase database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- Create roles table first
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert roles
INSERT INTO public.roles (name, description, permissions) VALUES
('admin', 'System Administrator', '{"all": true}'),
('ceo', 'Chief Executive Officer', '{"all": true}'),
('coo', 'Chief Operating Officer', '{"all": true}'),
('cfo', 'Chief Financial Officer', '{"all": true}'),
('manager', 'Department Manager', '{"manage_department": true, "view_reports": true}'),
('staff', 'Regular Staff Member', '{"view_profile": true, "edit_own_profile": true}');

-- Create departments table
CREATE TABLE public.departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES public.departments(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert main departments
INSERT INTO public.departments (id, name, description) VALUES
(1, 'Admissions', 'Student admissions and enrollment'),
(2, 'Academic Affairs', 'Academic programs and curriculum'),
(3, 'Student Services', 'Student support and services'),
(4, 'Administration', 'Administrative operations'),
(5, 'Finance', 'Financial operations and accounting');

-- Insert sub-departments
INSERT INTO public.departments (name, parent_id, description) VALUES
('Medical Admissions', 1, 'Medical program admissions'),
('Dental Admissions', 1, 'Dental program admissions'),
('Undergraduate Programs', 2, 'Undergraduate academic programs'),
('Graduate Programs', 2, 'Graduate academic programs'),
('Student Housing', 3, 'Student accommodation services'),
('Student Activities', 3, 'Student clubs and activities'),
('Human Resources', 4, 'Staff recruitment and management'),
('IT Services', 4, 'Information technology support'),
('Accounting', 5, 'Financial accounting and reporting'),
('Budgeting', 5, 'Budget planning and management');

-- Reset sequence for departments
SELECT setval('departments_id_seq', COALESCE(MAX(id), 0) + 1, false) FROM public.departments;

-- Create profiles table with all necessary columns
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    branch TEXT, -- This is the branch column that was missing
    department TEXT,
    department_id INTEGER REFERENCES public.departments(id),
    phone TEXT,
    address TEXT,
    date_of_birth DATE,
    hire_date DATE,
    salary DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_role CHECK (role IN ('admin', 'ceo', 'coo', 'cfo', 'manager', 'staff'))
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Create simplified RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admin and executive access policies
CREATE POLICY "Admins have full access" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'ceo', 'coo', 'cfo')
        )
    );

-- Department managers can view their department staff
CREATE POLICY "Managers can view department staff" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles manager
            WHERE manager.id = auth.uid() 
            AND manager.role = 'manager'
            AND manager.department_id = public.profiles.department_id
        )
    );

-- RLS policies for departments table
CREATE POLICY "Everyone can view departments" ON public.departments
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage departments" ON public.departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'ceo', 'coo')
        )
    );

-- RLS policies for roles table
CREATE POLICY "Everyone can view roles" ON public.roles
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage roles" ON public.roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'ceo')
        )
    );

-- Create function to handle user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'staff'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
