-- Migration to implement attendance permissions for all employees

-- Step 1: Update account status for employees with system access but no_account status
UPDATE public.employees 
SET account_status = 'active' 
WHERE has_system_access = true 
AND account_status = 'no_account'
AND user_id IS NOT NULL;

-- Step 2: Update employees table to ensure has_system_access is true for active employees with user accounts
UPDATE public.employees 
SET has_system_access = true 
WHERE user_id IS NOT NULL 
AND is_active = true 
AND account_status IN ('active', 'pending');

-- Step 3: Grant employee role to all users who have employee records but no roles yet
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT e.user_id, 'employee'::user_role
FROM public.employees e
WHERE e.user_id IS NOT NULL 
AND e.is_active = true
AND e.has_system_access = true
AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = e.user_id
);