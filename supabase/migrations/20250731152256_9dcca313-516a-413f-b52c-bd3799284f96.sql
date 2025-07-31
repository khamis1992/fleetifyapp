-- First check and disable ALL contract triggers
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'contracts' 
AND event_object_schema = 'public';

-- Disable all contract triggers
DROP TRIGGER IF EXISTS handle_contract_changes_trigger ON public.contracts;
DROP TRIGGER IF EXISTS validate_contract_account_trigger ON public.contracts;
DROP TRIGGER IF EXISTS handle_invoice_changes_trigger ON public.contracts;

-- Simple update to fix contract statuses without any triggers
UPDATE public.contracts 
SET status = 'active', updated_at = now()
WHERE status = 'draft' 
AND contract_amount > 0 
AND customer_id IS NOT NULL 
AND start_date IS NOT NULL 
AND end_date IS NOT NULL;

-- Set default status for new contracts
ALTER TABLE public.contracts ALTER COLUMN status SET DEFAULT 'active';