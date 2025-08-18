-- Create a more robust version of get_user_company that handles null cases better
CREATE OR REPLACE FUNCTION public.get_user_company_safe(user_id_param uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_company_id uuid;
    browsed_company_id uuid;
    user_roles text[];
BEGIN
    -- Return null if no user provided - this prevents data leaks
    IF user_id_param IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get user's original company from profiles
    SELECT company_id INTO user_company_id
    FROM public.profiles
    WHERE user_id = user_id_param;
    
    -- Return null if user has no company
    IF user_company_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get user's roles (safely handle arrays)
    SELECT COALESCE(array_agg(role), ARRAY[]::text[]) INTO user_roles
    FROM public.user_roles
    WHERE user_id = user_id_param;
    
    -- Check if user is browsing another company (from session context)
    BEGIN
        SELECT NULLIF(current_setting('app.browsed_company_id', true), '')::uuid INTO browsed_company_id;
    EXCEPTION
        WHEN OTHERS THEN
            browsed_company_id := NULL;
    END;
    
    -- If user is super admin and browsing another company, return browsed company
    IF 'super_admin' = ANY(user_roles) AND browsed_company_id IS NOT NULL THEN
        RETURN browsed_company_id;
    END IF;
    
    -- Otherwise return user's original company
    RETURN user_company_id;
EXCEPTION
    WHEN OTHERS THEN
        -- On any error, return null to prevent data leaks
        RETURN NULL;
END;
$$;

-- Update RLS policies for vehicle installments to use the safer function
DROP POLICY IF EXISTS "Users can view vehicle installments in their company" ON public.vehicle_installments;
DROP POLICY IF EXISTS "Managers can manage vehicle installments in their company" ON public.vehicle_installments;

CREATE POLICY "Users can view vehicle installments in their company"
ON public.vehicle_installments
FOR SELECT
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND get_user_company_safe(auth.uid()) IS NOT NULL 
    AND company_id = get_user_company_safe(auth.uid())
);

CREATE POLICY "Managers can manage vehicle installments in their company"
ON public.vehicle_installments
FOR ALL
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND get_user_company_safe(auth.uid()) IS NOT NULL
    AND (
        has_role(auth.uid(), 'super_admin'::user_role) 
        OR (
            company_id = get_user_company_safe(auth.uid())
            AND (
                has_role(auth.uid(), 'company_admin'::user_role) 
                OR has_role(auth.uid(), 'manager'::user_role) 
                OR has_role(auth.uid(), 'sales_agent'::user_role)
            )
        )
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND get_user_company_safe(auth.uid()) IS NOT NULL
    AND (
        has_role(auth.uid(), 'super_admin'::user_role) 
        OR (
            company_id = get_user_company_safe(auth.uid())
            AND (
                has_role(auth.uid(), 'company_admin'::user_role) 
                OR has_role(auth.uid(), 'manager'::user_role) 
                OR has_role(auth.uid(), 'sales_agent'::user_role)
            )
        )
    )
);