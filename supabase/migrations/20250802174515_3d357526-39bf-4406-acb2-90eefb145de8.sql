-- Step 5: Create performance optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_id_role 
ON public.user_roles (user_id, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id_company_id 
ON public.profiles (user_id, company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_user_id_company_id 
ON public.employees (user_id, company_id) 
WHERE user_id IS NOT NULL;

-- Step 6: Create data integrity check and fix function
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

-- Step 7: Execute the data integrity fix
SELECT public.check_and_fix_user_data_integrity() as integrity_fix_results;

-- Step 8: Run quality monitoring check
SELECT * FROM public.monitor_user_data_quality();

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_user_company_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_secure(uuid, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.monitor_user_data_quality() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_fix_user_data_integrity() TO service_role;

-- Step 10: Add helpful comments
COMMENT ON FUNCTION public.monitor_user_data_quality() IS 
'Run this function weekly to monitor data quality. Usage: SELECT * FROM public.monitor_user_data_quality();';

COMMENT ON FUNCTION public.check_and_fix_user_data_integrity() IS 
'Run this function when data quality issues are detected. Should be run by system administrators only.';

-- Final success message
SELECT 'User ID ambiguity fix script completed successfully - Core functions updated' as completion_status;