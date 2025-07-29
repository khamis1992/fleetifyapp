-- Create account level validation functions
CREATE OR REPLACE FUNCTION public.validate_account_level_for_entries(account_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_level integer;
BEGIN
    SELECT account_level INTO account_level
    FROM public.chart_of_accounts
    WHERE id = account_id_param
    AND is_active = true;
    
    -- Only allow entries on accounts at level 5 or 6
    RETURN account_level >= 5;
END;
$$;

-- Function to check if account is an aggregate (header) account
CREATE OR REPLACE FUNCTION public.is_aggregate_account(account_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_level integer;
    is_header boolean;
BEGIN
    SELECT account_level, is_header INTO account_level, is_header
    FROM public.chart_of_accounts
    WHERE id = account_id_param
    AND is_active = true;
    
    -- Aggregate accounts are header accounts or accounts at levels 1-4
    RETURN is_header = true OR account_level < 5;
END;
$$;

-- Function to get all entry-allowed accounts for a company
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
AS $$
BEGIN
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
    AND coa.account_level >= 5  -- Only levels 5 and 6
    AND coa.is_header = false   -- Not header accounts
    ORDER BY coa.account_code;
END;
$$;

-- Function to get reporting accounts (aggregate accounts)
CREATE OR REPLACE FUNCTION public.get_reporting_accounts(company_id_param uuid)
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
AS $$
BEGIN
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
    AND (coa.account_level < 5 OR coa.is_header = true)  -- Levels 1-4 or header accounts
    ORDER BY coa.account_code;
END;
$$;

-- Trigger function to validate journal entry lines
CREATE OR REPLACE FUNCTION public.validate_journal_entry_line_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Check if the account is allowed for entries
    IF NOT public.validate_account_level_for_entries(NEW.account_id) THEN
        RAISE EXCEPTION 'القيد غير مسموح على هذا الحساب. يُسمح بالقيود فقط على الحسابات الفرعية (المستوى 5 أو 6)'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for journal entry lines validation
DROP TRIGGER IF EXISTS validate_journal_entry_account_trigger ON public.journal_entry_lines;
CREATE TRIGGER validate_journal_entry_account_trigger
    BEFORE INSERT OR UPDATE ON public.journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_journal_entry_line_account();

-- Add validation constraint for invoice journal entries (if they use chart of accounts)
CREATE OR REPLACE FUNCTION public.validate_invoice_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Skip validation if no account_id (some invoices might not have direct account mapping)
    IF NEW.account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if the account is allowed for entries
    IF NOT public.validate_account_level_for_entries(NEW.account_id) THEN
        RAISE EXCEPTION 'القيد غير مسموح على هذا الحساب. يُسمح بالقيود فقط على الحسابات الفرعية (المستوى 5 أو 6)'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Add trigger for invoices if they have account_id column
-- Note: This will only apply if invoices table has account_id column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'account_id' 
        AND table_schema = 'public'
    ) THEN
        DROP TRIGGER IF EXISTS validate_invoice_account_trigger ON public.invoices;
        CREATE TRIGGER validate_invoice_account_trigger
            BEFORE INSERT OR UPDATE ON public.invoices
            FOR EACH ROW
            EXECUTE FUNCTION public.validate_invoice_account();
    END IF;
END;
$$;

-- Add similar validation for payments table
CREATE OR REPLACE FUNCTION public.validate_payment_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Skip validation if no account_id
    IF NEW.account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if the account is allowed for entries
    IF NOT public.validate_account_level_for_entries(NEW.account_id) THEN
        RAISE EXCEPTION 'القيد غير مسموح على هذا الحساب. يُسمح بالقيود فقط على الحسابات الفرعية (المستوى 5 أو 6)'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Add trigger for payments if they have account_id column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' 
        AND column_name = 'account_id' 
        AND table_schema = 'public'
    ) THEN
        DROP TRIGGER IF EXISTS validate_payment_account_trigger ON public.payments;
        CREATE TRIGGER validate_payment_account_trigger
            BEFORE INSERT OR UPDATE ON public.payments
            FOR EACH ROW
            EXECUTE FUNCTION public.validate_payment_account();
    END IF;
END;
$$;