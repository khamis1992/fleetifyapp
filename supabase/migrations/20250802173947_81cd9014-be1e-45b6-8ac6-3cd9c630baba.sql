-- ========================================
-- Comprehensive User ID Ambiguity Fix Script
-- ========================================

-- 1. Create secure functions to handle user access safely
-- ========================================

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
DECLARE
    role_exists boolean := false;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM public.user_roles ur
        WHERE ur.user_id = user_id_param 
        AND ur.role = role_name
    ) INTO role_exists;
    
    RETURN role_exists;
END;
$$;

-- 2. Create function to fix user_id ambiguity in complex joins
-- ========================================

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

-- 3. Update existing functions to use explicit table aliases
-- ========================================

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

-- 4. Create data integrity check and fix function
-- ========================================

CREATE OR REPLACE FUNCTION public.check_and_fix_user_data_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    fix_results jsonb := '{"profiles_fixed": 0, "employees_fixed": 0, "roles_created": 0, "issues_found": []}'::jsonb;
    profile_record record;
    employee_record record;
    profiles_fixed integer := 0;
    employees_fixed integer := 0;
    roles_created integer := 0;
    issues_found text[] := ARRAY[]::text[];
BEGIN
    -- Check for employees without corresponding profiles
    FOR employee_record IN 
        SELECT e.user_id, e.company_id, e.first_name, e.last_name, e.email
        FROM public.employees e
        LEFT JOIN public.profiles p ON p.user_id = e.user_id
        WHERE p.user_id IS NULL AND e.user_id IS NOT NULL
    LOOP
        -- Create missing profile
        INSERT INTO public.profiles (user_id, company_id, first_name, last_name, email)
        VALUES (employee_record.user_id, employee_record.company_id, 
                employee_record.first_name, employee_record.last_name, employee_record.email)
        ON CONFLICT (user_id) DO NOTHING;
        
        profiles_fixed := profiles_fixed + 1;
        issues_found := array_append(issues_found, 'Created missing profile for employee: ' || employee_record.email);
    END LOOP;
    
    -- Check for users without any roles
    FOR profile_record IN
        SELECT p.user_id, p.email
        FROM public.profiles p
        LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
        WHERE ur.user_id IS NULL
    LOOP
        -- Assign default user role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (profile_record.user_id, 'user'::user_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        roles_created := roles_created + 1;
        issues_found := array_append(issues_found, 'Created default role for user: ' || profile_record.email);
    END LOOP;
    
    -- Update results
    fix_results := jsonb_set(fix_results, '{profiles_fixed}', profiles_fixed::text::jsonb);
    fix_results := jsonb_set(fix_results, '{employees_fixed}', employees_fixed::text::jsonb);
    fix_results := jsonb_set(fix_results, '{roles_created}', roles_created::text::jsonb);
    fix_results := jsonb_set(fix_results, '{issues_found}', to_jsonb(issues_found));
    
    RETURN fix_results;
END;
$$;

-- 5. Create performance optimization indexes
-- ========================================

-- Optimize user_roles lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_id_role 
ON public.user_roles (user_id, role);

-- Optimize profiles lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id_company_id 
ON public.profiles (user_id, company_id);

-- Optimize employees lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_user_id_company_id 
ON public.employees (user_id, company_id) 
WHERE user_id IS NOT NULL;

-- 6. Create trigger to prevent user_id ambiguity issues
-- ========================================

CREATE OR REPLACE FUNCTION public.validate_user_access_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    profile_company_id uuid;
    employee_company_id uuid;
BEGIN
    -- For employee operations
    IF TG_TABLE_NAME = 'employees' AND NEW.user_id IS NOT NULL THEN
        -- Check if profile exists and has matching company_id
        SELECT p.company_id INTO profile_company_id
        FROM public.profiles p
        WHERE p.user_id = NEW.user_id;
        
        IF profile_company_id IS NOT NULL AND profile_company_id != NEW.company_id THEN
            RAISE EXCEPTION 'Employee company_id (%) does not match profile company_id (%)', 
                NEW.company_id, profile_company_id;
        END IF;
        
        -- Create profile if it doesn't exist
        IF profile_company_id IS NULL THEN
            INSERT INTO public.profiles (user_id, company_id, first_name, last_name, email)
            VALUES (NEW.user_id, NEW.company_id, NEW.first_name, NEW.last_name, NEW.email)
            ON CONFLICT (user_id) DO UPDATE SET
                company_id = NEW.company_id,
                first_name = COALESCE(profiles.first_name, NEW.first_name),
                last_name = COALESCE(profiles.last_name, NEW.last_name),
                email = COALESCE(profiles.email, NEW.email);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Apply trigger to employees table
DROP TRIGGER IF EXISTS trg_validate_user_access_consistency ON public.employees;
CREATE TRIGGER trg_validate_user_access_consistency
    BEFORE INSERT OR UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_user_access_consistency();

-- 7. Create monitoring function for ongoing data quality
-- ========================================

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

-- 8. Execute the data integrity fix
-- ========================================

SELECT public.check_and_fix_user_data_integrity() as integrity_fix_results;

-- 9. Run quality monitoring check
-- ========================================

SELECT * FROM public.monitor_user_data_quality();

-- 10. Grant necessary permissions
-- ========================================

-- Grant execute permissions on new functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_company_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_secure(uuid, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_user_access_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.monitor_user_data_quality() TO authenticated;

-- Grant execute permissions on fix function to admins only
GRANT EXECUTE ON FUNCTION public.check_and_fix_user_data_integrity() TO service_role;

-- 11. Create maintenance schedule recommendation
-- ========================================

COMMENT ON FUNCTION public.monitor_user_data_quality() IS 
'Run this function weekly to monitor data quality. 
Usage: SELECT * FROM public.monitor_user_data_quality();';

COMMENT ON FUNCTION public.check_and_fix_user_data_integrity() IS 
'Run this function when data quality issues are detected.
Should be run by system administrators only.';

-- Script execution completed successfully
SELECT 'User ID ambiguity fix script executed successfully' as completion_status;