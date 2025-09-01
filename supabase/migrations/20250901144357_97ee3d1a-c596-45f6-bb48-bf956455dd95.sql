-- Create a completely new function to replace get_user_company_cached with proper parameter naming
CREATE OR REPLACE FUNCTION public.get_user_company_id(input_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result_company_id uuid;
BEGIN
    -- First try profiles table
    SELECT p.company_id INTO result_company_id
    FROM public.profiles p
    WHERE p.user_id = input_user_id
    AND p.company_id IS NOT NULL
    LIMIT 1;
    
    -- If not found, try employees table
    IF result_company_id IS NULL THEN
        SELECT e.company_id INTO result_company_id
        FROM public.employees e
        WHERE e.user_id = input_user_id
        AND e.company_id IS NOT NULL
        LIMIT 1;
    END IF;
    
    RETURN result_company_id;
END;
$$;

-- Create a new has_role function with proper parameter naming
CREATE OR REPLACE FUNCTION public.check_user_role(input_user_id uuid, input_role user_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = input_user_id
        AND ur.role = input_role::text
    );
END;
$$;

-- Test the new functions
DO $$
DECLARE
    test_user_id uuid := '33104f93-57e7-4e5d-993f-a1e6be1cb121';
    test_company_id uuid;
    test_is_admin boolean;
BEGIN
    -- Test company function
    SELECT public.get_user_company_id(test_user_id) INTO test_company_id;
    RAISE NOTICE 'Company ID for user: %', test_company_id;
    
    -- Test role function
    SELECT public.check_user_role(test_user_id, 'super_admin') INTO test_is_admin;
    RAISE NOTICE 'Is super admin: %', test_is_admin;
END;
$$;