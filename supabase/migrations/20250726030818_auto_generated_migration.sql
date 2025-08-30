-- Migration to implement attendance permissions for all employees

-- Step 1: Update account status for employees with system access but no_account status
UPDATE public.employees 
SET account_status = 'active' 
WHERE has_system_access = true 
AND account_status = 'no_account'
AND user_id IS NOT NULL;

-- Step 2: Create attendance permission if it doesn't exist
INSERT INTO public.permissions (id, name, description, category, level)
VALUES ('attendance.clock_in', 'Clock In/Out', 'Record personal attendance times', 'hr', 'write')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Grant attendance permission to all users who have employee roles
INSERT INTO public.user_permissions (user_id, permission_id, granted, granted_by, granted_at)
SELECT DISTINCT ur.user_id, 'attendance.clock_in', true, 
       (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1), 
       now()
FROM public.user_roles ur 
WHERE ur.role IN ('employee', 'sales_agent', 'manager', 'company_admin', 'super_admin')
AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = ur.user_id 
    AND up.permission_id = 'attendance.clock_in'
);

-- Step 4: Update employees table to ensure has_system_access is true for active employees with user accounts
UPDATE public.employees 
SET has_system_access = true 
WHERE user_id IS NOT NULL 
AND is_active = true 
AND account_status = 'active';

-- Step 5: Create or update any employees that might have missing user associations
-- (This is a diagnostic query to help identify issues)