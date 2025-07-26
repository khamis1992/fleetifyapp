-- Phase 1: Fix Existing Data Issues

-- First, let's fix the profiles table to ensure all users have proper company_id
-- Check if there are any profiles with NULL company_id that should have a company
UPDATE public.profiles 
SET company_id = (
    SELECT e.company_id 
    FROM public.employees e 
    WHERE e.user_id = profiles.user_id 
    LIMIT 1
)
WHERE company_id IS NULL 
AND user_id IN (
    SELECT DISTINCT user_id 
    FROM public.employees 
    WHERE user_id IS NOT NULL
);

-- Add missing user roles for employees who have system access but no roles
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT e.user_id, 'company_admin'::user_role
FROM public.employees e
WHERE e.has_system_access = true 
AND e.user_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = e.user_id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure all employees with system access have their account_status properly set
UPDATE public.employees 
SET account_status = 'active'
WHERE has_system_access = true 
AND user_id IS NOT NULL 
AND account_status != 'active';