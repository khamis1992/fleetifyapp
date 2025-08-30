-- Step 1: Drop functions with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS public.get_user_company_secure(uuid) CASCADE;

-- Step 2: Recreate the improved function
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

-- Step 3: Create additional secure functions
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

-- Step 4: Create monitoring function for data quality
CREATE OR REPLACE FUNCTION public.monitor_user_data_quality()
RETURNS TABLE(
    check_name text,
    status text,
    count_found integer,
    description text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
    -- Check 1: Employees without profiles
    RETURN QUERY
    SELECT 
        'employees_without_profiles'::text as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
        COUNT(*)::integer as count_found,
        'Employees with user_id but no corresponding profile'::text as description
    FROM public.employees e
    LEFT JOIN public.profiles p ON p.user_id = e.user_id
    WHERE e.user_id IS NOT NULL AND p.user_id IS NULL;
    
    -- Check 2: Users without roles
    RETURN QUERY
    SELECT 
        'users_without_roles'::text as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
        COUNT(*)::integer as count_found,
        'Users in profiles without any assigned roles'::text as description
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE ur.user_id IS NULL;
    
    -- Check 3: Company_id mismatches
    RETURN QUERY
    SELECT 
        'company_id_mismatches'::text as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
        COUNT(*)::integer as count_found,
        'Employees and profiles with different company_id for same user_id'::text as description
    FROM public.employees e
    INNER JOIN public.profiles p ON p.user_id = e.user_id
    WHERE e.company_id != p.company_id;
    
    RETURN;
END;
$$;