-- Update the user profile to associate with a company and assign roles

-- First, associate the user with "البشائر الخليجية" company
UPDATE public.profiles 
SET company_id = '1ddee958-dd87-4aeb-a7ae-7a46b72aa46f'
WHERE user_id = '78af5030-1b7c-4068-9749-4b892109b1be';

-- Insert appropriate roles for the user (company_admin and manager)
INSERT INTO public.user_roles (user_id, role) 
VALUES 
  ('78af5030-1b7c-4068-9749-4b892109b1be', 'company_admin'),
  ('78af5030-1b7c-4068-9749-4b892109b1be', 'manager')
ON CONFLICT (user_id, role) DO NOTHING;