-- Create function to get effective company ID considering browsing mode
CREATE OR REPLACE FUNCTION public.get_effective_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_company_id uuid;
    browsed_company_id uuid;
    user_roles text[];
BEGIN
    -- Get user's original company
    SELECT company_id INTO user_company_id
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    -- Get user's roles
    SELECT array_agg(role) INTO user_roles
    FROM public.user_roles
    WHERE user_id = auth.uid();
    
    -- Check if user is browsing another company (from session or context)
    -- This would be set by the browsing mechanism in your app
    SELECT current_setting('app.browsed_company_id', true)::uuid INTO browsed_company_id;
    
    -- If user is super admin and browsing another company, return browsed company
    IF 'super_admin' = ANY(user_roles) AND browsed_company_id IS NOT NULL THEN
        RETURN browsed_company_id;
    END IF;
    
    -- Otherwise return user's original company
    RETURN user_company_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to user's original company
        RETURN user_company_id;
END;
$$;

-- Update contracts RLS policies to support browsing mode
DROP POLICY IF EXISTS "Users can view contracts in their company" ON public.contracts;
DROP POLICY IF EXISTS "Staff can manage contracts in their company" ON public.contracts;
DROP POLICY IF EXISTS "Super admins can manage all contracts" ON public.contracts;

-- Create new RLS policies for contracts
CREATE POLICY "Users can view contracts in their company" 
ON public.contracts 
FOR SELECT 
USING (company_id = get_effective_company_id());

CREATE POLICY "Staff can manage contracts in their company" 
ON public.contracts 
FOR ALL 
USING (
    (company_id = get_effective_company_id()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role) OR 
     has_role(auth.uid(), 'sales_agent'::user_role))
)
WITH CHECK (
    (company_id = get_effective_company_id()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role) OR 
     has_role(auth.uid(), 'sales_agent'::user_role))
);

CREATE POLICY "Super admins can manage all contracts" 
ON public.contracts 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

-- Also update contract_payment_schedules RLS policies
DROP POLICY IF EXISTS "Users can view payment schedules in their company" ON public.contract_payment_schedules;
DROP POLICY IF EXISTS "Staff can manage payment schedules in their company" ON public.contract_payment_schedules;

CREATE POLICY "Users can view payment schedules in their company" 
ON public.contract_payment_schedules 
FOR SELECT 
USING (company_id = get_effective_company_id());

CREATE POLICY "Staff can manage payment schedules in their company" 
ON public.contract_payment_schedules 
FOR ALL 
USING (
    (company_id = get_effective_company_id()) AND 
    (has_role(auth.uid(), 'super_admin'::user_role) OR 
     has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role) OR 
     has_role(auth.uid(), 'sales_agent'::user_role))
)
WITH CHECK (
    (company_id = get_effective_company_id()) AND 
    (has_role(auth.uid(), 'super_admin'::user_role) OR 
     has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role) OR 
     has_role(auth.uid(), 'sales_agent'::user_role))
);