-- Update chart_of_accounts table to support hierarchical structure
ALTER TABLE public.chart_of_accounts 
ADD COLUMN IF NOT EXISTS account_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_header boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Update existing accounts to have proper account levels based on parent relationships
UPDATE public.chart_of_accounts 
SET account_level = 1 
WHERE parent_account_id IS NULL;

UPDATE public.chart_of_accounts 
SET account_level = 2 
WHERE parent_account_id IS NOT NULL 
AND parent_account_id IN (SELECT id FROM public.chart_of_accounts WHERE parent_account_id IS NULL);

-- Create function to auto-calculate account level
CREATE OR REPLACE FUNCTION public.calculate_account_level(account_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    level_count integer := 1;
    current_parent uuid;
BEGIN
    SELECT parent_account_id INTO current_parent 
    FROM public.chart_of_accounts 
    WHERE id = account_id;
    
    WHILE current_parent IS NOT NULL LOOP
        level_count := level_count + 1;
        SELECT parent_account_id INTO current_parent 
        FROM public.chart_of_accounts 
        WHERE id = current_parent;
        
        -- Prevent infinite loops
        IF level_count > 10 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN level_count;
END;
$function$;

-- Create trigger to automatically set account level
CREATE OR REPLACE FUNCTION public.update_account_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    NEW.account_level := calculate_account_level(NEW.id);
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER trigger_update_account_level
    BEFORE INSERT OR UPDATE ON public.chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_account_level();

-- Create table for default chart of accounts template
CREATE TABLE IF NOT EXISTS public.default_chart_of_accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    account_code character varying NOT NULL,
    account_name text NOT NULL,
    account_name_ar text,
    account_type text NOT NULL,
    account_subtype text,
    balance_type text NOT NULL,
    parent_account_code character varying,
    account_level integer DEFAULT 1,
    sort_order integer DEFAULT 0,
    is_header boolean DEFAULT false,
    is_system boolean DEFAULT true,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on default chart of accounts
ALTER TABLE public.default_chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy for default chart of accounts (read-only for all users)
CREATE POLICY "Anyone can view default accounts" 
ON public.default_chart_of_accounts 
FOR SELECT 
USING (true);

-- Create function to copy default accounts to a new company
CREATE OR REPLACE FUNCTION public.copy_default_accounts_to_company(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    default_account RECORD;
    parent_mapping jsonb := '{}';
    new_account_id uuid;
    parent_id uuid;
BEGIN
    -- First pass: Create all accounts and build parent mapping
    FOR default_account IN 
        SELECT * FROM public.default_chart_of_accounts 
        ORDER BY account_level, sort_order, account_code
    LOOP
        -- Generate new ID for the account
        new_account_id := gen_random_uuid();
        
        -- Find parent ID if exists
        parent_id := NULL;
        IF default_account.parent_account_code IS NOT NULL THEN
            parent_id := (parent_mapping->default_account.parent_account_code)::uuid;
        END IF;
        
        -- Insert the new account
        INSERT INTO public.chart_of_accounts (
            id,
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            account_subtype,
            balance_type,
            parent_account_id,
            account_level,
            is_header,
            is_system,
            description,
            current_balance,
            is_active
        ) VALUES (
            new_account_id,
            target_company_id,
            default_account.account_code,
            default_account.account_name,
            default_account.account_name_ar,
            default_account.account_type,
            default_account.account_subtype,
            default_account.balance_type,
            parent_id,
            default_account.account_level,
            default_account.is_header,
            default_account.is_system,
            default_account.description,
            0,
            true
        );
        
        -- Store mapping for children
        parent_mapping := parent_mapping || jsonb_build_object(default_account.account_code, new_account_id);
    END LOOP;
END;
$function$;

-- Create trigger to automatically copy default accounts when a new company is created
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Copy default chart of accounts to the new company
    PERFORM copy_default_accounts_to_company(NEW.id);
    RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_copy_default_accounts ON public.companies;
CREATE TRIGGER trigger_copy_default_accounts
    AFTER INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_company();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent_id ON public.chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_level ON public.chart_of_accounts(company_id, account_level);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_sort ON public.chart_of_accounts(company_id, sort_order, account_code);
CREATE INDEX IF NOT EXISTS idx_default_accounts_level ON public.default_chart_of_accounts(account_level, sort_order);

-- Update trigger for updated_at
CREATE OR REPLACE TRIGGER update_default_chart_of_accounts_updated_at
    BEFORE UPDATE ON public.default_chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();