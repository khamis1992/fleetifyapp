
-- Fix the is_company_manager function to use valid user_role enum values
CREATE OR REPLACE FUNCTION is_company_manager(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND company_id = p_company_id 
        AND role IN ('company_admin'::user_role, 'manager'::user_role, 'super_admin'::user_role)
    );
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION is_company_manager(uuid) IS 'Checks if current user is a company admin, manager, or super admin for the given company';
;
