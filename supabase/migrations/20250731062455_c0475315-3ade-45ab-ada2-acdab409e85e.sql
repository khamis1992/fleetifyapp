-- Phase 1: Fix Database Data and Add Constraints (Fixed)

-- First, let's check and fix any users without proper company associations
DO $$
DECLARE
    default_company_id uuid;
    orphaned_users_count integer;
BEGIN
    -- Check if there are users without company_id
    SELECT COUNT(*) INTO orphaned_users_count 
    FROM public.profiles 
    WHERE company_id IS NULL;
    
    IF orphaned_users_count > 0 THEN
        -- Create a default company if it doesn't exist
        INSERT INTO public.companies (id, name, name_ar, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'Default Company',
            'الشركة الافتراضية',
            now(),
            now()
        )
        ON CONFLICT (name) DO NOTHING;
        
        -- Get the default company ID
        SELECT id INTO default_company_id 
        FROM public.companies 
        WHERE name = 'Default Company' 
        LIMIT 1;
        
        -- Update orphaned users
        UPDATE public.profiles 
        SET company_id = default_company_id
        WHERE company_id IS NULL;
        
        -- Ensure orphaned users have at least employee role (without conflict clause for now)
        INSERT INTO public.user_roles (user_id, role)
        SELECT p.user_id, 'employee'::user_role
        FROM public.profiles p
        WHERE p.company_id = default_company_id
        AND NOT EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = p.user_id
        );
    END IF;
END $$;

-- Phase 3: Enhance get_entry_allowed_accounts function
CREATE OR REPLACE FUNCTION public.get_entry_allowed_accounts(company_id_param uuid)
RETURNS TABLE(
    id uuid, 
    account_code character varying, 
    account_name text, 
    account_name_ar text, 
    account_type text, 
    account_level integer, 
    balance_type text, 
    parent_account_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Validate input parameters
    IF company_id_param IS NULL THEN
        RAISE EXCEPTION 'Company ID parameter cannot be null'
            USING HINT = 'Ensure user is properly associated with a company';
    END IF;
    
    -- Verify company exists
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = company_id_param) THEN
        RAISE EXCEPTION 'Company with ID % does not exist', company_id_param
            USING HINT = 'Verify company_id is valid';
    END IF;
    
    -- Log the function call for debugging
    RAISE LOG 'get_entry_allowed_accounts called for company_id: %', company_id_param;
    
    -- Return accounts with enhanced filtering and validation
    RETURN QUERY
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        coa.account_type,
        coa.account_level,
        coa.balance_type,
        parent_coa.account_name as parent_account_name
    FROM public.chart_of_accounts coa
    LEFT JOIN public.chart_of_accounts parent_coa ON coa.parent_account_id = parent_coa.id
    WHERE coa.company_id = company_id_param
    AND coa.is_active = true
    AND coa.account_level >= 3  -- Allow levels 3 and above
    AND coa.is_header = false   -- Only non-header accounts
    AND coa.account_code IS NOT NULL -- Ensure valid account code
    AND LENGTH(TRIM(coa.account_name)) > 0 -- Ensure valid account name
    ORDER BY coa.account_code;
    
    -- Log successful completion
    RAISE LOG 'get_entry_allowed_accounts completed successfully for company_id: %', company_id_param;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE LOG 'Error in get_entry_allowed_accounts for company_id %: %', company_id_param, SQLERRM;
        -- Re-raise the exception
        RAISE;
END;
$function$;

-- Create a helper function to get user company with validation
CREATE OR REPLACE FUNCTION public.get_user_company_validated(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_company_id uuid;
BEGIN
    -- Get user's company ID
    SELECT company_id INTO user_company_id
    FROM public.profiles
    WHERE user_id = _user_id;
    
    -- Validate result
    IF user_company_id IS NULL THEN
        RAISE EXCEPTION 'User % is not associated with any company', _user_id
            USING HINT = 'Contact administrator to assign user to a company';
    END IF;
    
    -- Verify company exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.companies 
        WHERE id = user_company_id 
        AND subscription_status = 'active'
    ) THEN
        RAISE EXCEPTION 'User company % is not found or inactive', user_company_id
            USING HINT = 'Contact administrator to verify company status';
    END IF;
    
    RETURN user_company_id;
END;
$function$;