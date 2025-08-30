-- Fix orphaned employee records by creating missing profiles and roles
-- This addresses the case where employees have user_id but no profile/roles

-- First, create profiles for employees who have user_id but no profile
INSERT INTO public.profiles (user_id, first_name, last_name, company_id, is_active, created_at, updated_at)
SELECT DISTINCT 
    e.user_id,
    e.first_name,
    e.last_name,
    e.company_id,
    true,
    now(),
    now()
FROM public.employees e
WHERE e.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = e.user_id
  );

-- Add default employee role for users who have profiles but no roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT DISTINCT 
    p.user_id,
    'employee'::user_role,
    now()
FROM public.profiles p
INNER JOIN public.employees e ON e.user_id = p.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.user_id
);