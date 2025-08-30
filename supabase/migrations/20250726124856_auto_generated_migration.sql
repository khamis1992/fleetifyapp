-- Step 1: Clean up inactive accounts for the affected company
-- First, let's identify and remove inactive accounts that are blocking new account creation
DELETE FROM public.chart_of_accounts 
WHERE company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c' 
AND is_active = false;

-- Step 2: Drop the existing unique constraint
ALTER TABLE public.chart_of_accounts 
DROP CONSTRAINT IF EXISTS chart_of_accounts_company_id_account_code_key;

-- Step 3: Create a partial unique index that only applies to active accounts
-- This allows reuse of account codes when accounts are marked as inactive
CREATE UNIQUE INDEX chart_of_accounts_company_id_account_code_active_idx 
ON public.chart_of_accounts (company_id, account_code) 
WHERE is_active = true;

-- Step 4: Add a cleanup function for inactive accounts
CREATE OR REPLACE FUNCTION public.cleanup_inactive_accounts(target_company_id uuid, days_old integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    deleted_count integer := 0;
BEGIN
    -- Delete inactive accounts older than specified days that have no related journal entries
    DELETE FROM public.chart_of_accounts 
    WHERE company_id = target_company_id
    AND is_active = false
    AND updated_at < (now() - (days_old || ' days')::interval)
    AND NOT EXISTS (
        SELECT 1 FROM public.journal_entry_lines 
        WHERE account_id = chart_of_accounts.id
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$function$;

-- Step 5: Improve the account deletion process
CREATE OR REPLACE FUNCTION public.soft_delete_account(account_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    has_children boolean := false;
    has_transactions boolean := false;
BEGIN
    -- Check if account has child accounts
    SELECT EXISTS (
        SELECT 1 FROM public.chart_of_accounts 
        WHERE parent_account_id = account_id_param AND is_active = true
    ) INTO has_children;
    
    -- Check if account has transactions
    SELECT EXISTS (
        SELECT 1 FROM public.journal_entry_lines 
        WHERE account_id = account_id_param
    ) INTO has_transactions;
    
    -- If account has children or transactions, only mark as inactive
    IF has_children OR has_transactions THEN
        UPDATE public.chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE id = account_id_param;
        RETURN false; -- Indicates soft delete
    ELSE
        -- If no dependencies, safe to hard delete
        DELETE FROM public.chart_of_accounts 
        WHERE id = account_id_param;
        RETURN true; -- Indicates hard delete
    END IF;
END;
$function$;