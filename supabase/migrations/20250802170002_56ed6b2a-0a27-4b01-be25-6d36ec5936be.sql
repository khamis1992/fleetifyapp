-- Fix the has_role function parameter name issue

-- 1. Drop the existing function first
DROP FUNCTION IF EXISTS public.has_role(uuid, user_role);

-- 2. Recreate with correct parameter names
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = _user_id AND ur.role = _role
    );
END;
$$;

-- 3. Update other functions that might have search_path issues
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 4. Log the successful fix
INSERT INTO public.audit_logs (
    action,
    resource_type,
    severity,
    old_values,
    new_values
) VALUES (
    'fix_has_role_function_parameters',
    'database_functions',
    'info',
    '{"issue": "parameter name mismatch in has_role function"}'::jsonb,
    '{"resolution": "dropped and recreated has_role function with correct parameter names"}'::jsonb
);

SELECT 'Parameter fix applied successfully' as status;