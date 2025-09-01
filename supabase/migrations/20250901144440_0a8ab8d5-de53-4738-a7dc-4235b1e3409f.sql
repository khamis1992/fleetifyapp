-- Create working functions to fix the authorization issue
-- Use text instead of enum for compatibility

-- Create a simple company lookup function
CREATE OR REPLACE FUNCTION public.get_user_company_simple(input_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    company_result uuid;
BEGIN
    -- Get from profiles table
    SELECT p.company_id INTO company_result
    FROM public.profiles p
    WHERE p.user_id = input_user_id
    AND p.company_id IS NOT NULL
    LIMIT 1;
    
    RETURN company_result;
END;
$$;

-- Create a simple role check function
CREATE OR REPLACE FUNCTION public.check_user_role_simple(input_user_id uuid, input_role text)
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
        AND ur.role::text = input_role
    );
END;
$$;

-- Test both functions
SELECT 
    public.get_user_company_simple('33104f93-57e7-4e5d-993f-a1e6be1cb121') as company_id,
    public.check_user_role_simple('33104f93-57e7-4e5d-993f-a1e6be1cb121', 'super_admin') as is_super_admin;