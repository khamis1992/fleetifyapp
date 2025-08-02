-- Fix security issues from the linter warnings

-- 1. Fix functions with mutable search_path by setting search_path explicitly
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role_name user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = $1 AND ur.role = $2
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_company(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    company_id uuid;
BEGIN
    SELECT profiles.company_id INTO company_id
    FROM public.profiles
    WHERE profiles.user_id = $1;
    
    RETURN company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_secure(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    company_id uuid;
BEGIN
    SELECT profiles.company_id INTO company_id
    FROM public.profiles
    WHERE profiles.user_id = $1;
    
    RETURN company_id;
END;
$$;

-- 2. Update any remaining functions to have proper search_path
CREATE OR REPLACE FUNCTION public.generate_contract_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    contract_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- Get current year
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Count existing contracts for this company in current year
    SELECT COUNT(*) + 1 INTO contract_count
    FROM public.contracts 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Return formatted contract number
    RETURN 'CNT-' || year_suffix || '-' || LPAD(contract_count::TEXT, 4, '0');
END;
$$;

-- 3. Log the security fix
INSERT INTO public.audit_logs (
    action,
    resource_type,
    severity,
    old_values,
    new_values
) VALUES (
    'fix_security_definer_functions',
    'database_functions',
    'info',
    '{"issue": "mutable search_path in security definer functions"}'::jsonb,
    '{"resolution": "set explicit search_path to public for all security definer functions"}'::jsonb
);

SELECT 'Security fixes applied successfully' as status;