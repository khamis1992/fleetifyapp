-- Drop the existing function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS public.get_user_company(uuid);
DROP FUNCTION IF EXISTS public.get_user_company();

-- Recreate the function with better null handling
CREATE OR REPLACE FUNCTION public.get_user_company(user_id_param uuid DEFAULT auth.uid())
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
    -- Return null if no user provided
    IF user_id_param IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get user's original company from profiles
    SELECT company_id INTO user_company_id
    FROM public.profiles
    WHERE user_id = user_id_param;
    
    -- Return null if user has no company (this should not happen in normal flow)
    IF user_company_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get user's roles
    SELECT array_agg(role) INTO user_roles
    FROM public.user_roles
    WHERE user_id = user_id_param;
    
    -- Check if user is browsing another company (from session context)
    BEGIN
        SELECT current_setting('app.browsed_company_id', true)::uuid INTO browsed_company_id;
    EXCEPTION
        WHEN OTHERS THEN
            browsed_company_id := NULL;
    END;
    
    -- If user is super admin and browsing another company, return browsed company
    IF 'super_admin' = ANY(COALESCE(user_roles, ARRAY[]::text[])) AND browsed_company_id IS NOT NULL THEN
        RETURN browsed_company_id;
    END IF;
    
    -- Otherwise return user's original company
    RETURN user_company_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback: return the user's company or null
        RETURN user_company_id;
END;
$$;

-- Update RLS policies to be more strict when user is not authenticated
DROP POLICY IF EXISTS "Users can view vehicle installments in their company" ON public.vehicle_installments;
DROP POLICY IF EXISTS "Managers can manage vehicle installments in their company" ON public.vehicle_installments;

CREATE POLICY "Users can view vehicle installments in their company"
ON public.vehicle_installments
FOR SELECT
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND get_user_company(auth.uid()) IS NOT NULL 
    AND company_id = get_user_company(auth.uid())
);

CREATE POLICY "Managers can manage vehicle installments in their company"
ON public.vehicle_installments
FOR ALL
TO authenticated
USING (
    auth.uid() IS NOT NULL 
    AND (
        has_role(auth.uid(), 'super_admin'::user_role) 
        OR (
            get_user_company(auth.uid()) IS NOT NULL 
            AND company_id = get_user_company(auth.uid())
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
    AND (
        has_role(auth.uid(), 'super_admin'::user_role) 
        OR (
            get_user_company(auth.uid()) IS NOT NULL 
            AND company_id = get_user_company(auth.uid())
            AND (
                has_role(auth.uid(), 'company_admin'::user_role) 
                OR has_role(auth.uid(), 'manager'::user_role) 
                OR has_role(auth.uid(), 'sales_agent'::user_role)
            )
        )
    )
);