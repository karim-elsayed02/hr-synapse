-- Create sample data for testing (optional)
-- Run this script after setting up the chief officers

-- Insert sample tasks
INSERT INTO public.tasks (title, description, status, priority, created_by) VALUES
('Complete Q4 Financial Review', 'Review and analyze Q4 financial performance', 'todo', 'high', 
  (SELECT id FROM public.profiles WHERE role = 'Chief Financial Officer' LIMIT 1)),
('Staff Performance Reviews', 'Conduct annual performance reviews for all staff', 'in_progress', 'medium',
  (SELECT id FROM public.profiles WHERE role = 'Chief Operating Officer' LIMIT 1)),
('Strategic Planning Session', 'Plan strategic initiatives for next year', 'todo', 'urgent',
  (SELECT id FROM public.profiles WHERE role = 'Chief Executive Officer' LIMIT 1));

-- Insert sample announcements
INSERT INTO public.announcements (title, content, author_id, priority, target_audience, is_published, published_at) VALUES
('Welcome to SynapseUK Staff Platform', 'We are excited to launch our new staff management platform. Please explore the features and let us know if you have any questions.', 
  (SELECT id FROM public.profiles WHERE role = 'Chief Executive Officer' LIMIT 1), 'high', 'all', true, NOW()),
('Q4 Financial Planning', 'All department heads please prepare your Q4 budget proposals by the end of this month.',
  (SELECT id FROM public.profiles WHERE role = 'Chief Financial Officer' LIMIT 1), 'medium', 'managers', true, NOW());

-- Insert sample documents
INSERT INTO public.documents (title, description, file_url, category, uploaded_by, is_public) VALUES
('Employee Handbook', 'Complete guide for all SynapseUK employees', '/documents/employee-handbook.pdf', 'policy', 
  (SELECT id FROM public.profiles WHERE role = 'Chief Operating Officer' LIMIT 1), true),
('Financial Procedures', 'Standard operating procedures for financial processes', '/documents/financial-procedures.pdf', 'finance',
  (SELECT id FROM public.profiles WHERE role = 'Chief Financial Officer' LIMIT 1), false);
