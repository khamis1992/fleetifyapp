-- Drop existing functions first to avoid parameter conflicts
DROP FUNCTION IF EXISTS public.get_user_company_secure(uuid);
DROP FUNCTION IF EXISTS public.has_role_secure(uuid, user_role);
DROP FUNCTION IF EXISTS public.resolve_user_access_data(uuid);
DROP FUNCTION IF EXISTS public.check_and_fix_user_data_integrity();
DROP FUNCTION IF EXISTS public.validate_user_access_consistency();
DROP FUNCTION IF EXISTS public.monitor_user_data_quality();

-- Now recreate all functions with the correct implementation
CREATE OR REPLACE FUNCTION public.get_user_company_secure(user_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
    company_id_result uuid;
BEGIN
    SELECT p.company_id INTO company_id_result
    FROM public.profiles p
    WHERE p.user_id = user_id_param
    LIMIT 1;
    
    RETURN company_id_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role_secure(user_id_param uuid, role_name user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM public.user_roles ur
        WHERE ur.user_id = user_id_param 
        AND ur.role = role_name
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_user_access_data(target_user_id uuid)
RETURNS TABLE(
    user_id uuid,
    company_id uuid,
    has_profile boolean,
    is_employee boolean,
    employee_id uuid,
    roles text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        target_user_id as user_id,
        p.company_id,
        (p.user_id IS NOT NULL) as has_profile,
        (e.user_id IS NOT NULL) as is_employee,
        e.id as employee_id,
        COALESCE(
            ARRAY(
                SELECT ur.role::text 
                FROM public.user_roles ur 
                WHERE ur.user_id = target_user_id
            ), 
            ARRAY[]::text[]
        ) as roles
    FROM public.profiles p
    LEFT JOIN public.employees e ON e.user_id = target_user_id AND e.company_id = p.company_id
    WHERE p.user_id = target_user_id;
END;
$$;

-- Update existing core functions with explicit aliases
CREATE OR REPLACE FUNCTION public.get_user_company(user_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
    company_id_result uuid;
BEGIN
    SELECT p.company_id INTO company_id_result
    FROM public.profiles p
    WHERE p.user_id = user_id_param
    LIMIT 1;
    
    RETURN company_id_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(user_id_param uuid, role_name user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM public.user_roles ur
        WHERE ur.user_id = user_id_param 
        AND ur.role = role_name
    );
END;
$$;