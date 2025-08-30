-- Fix the bank transaction trigger and function
-- First, drop the existing trigger
DROP TRIGGER IF EXISTS handle_bank_transaction_changes ON public.bank_transactions;

-- Create an updated function that works with the NEW record directly
CREATE OR REPLACE FUNCTION public.create_bank_transaction_journal_entry_from_record(
    transaction_record public.bank_transactions
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    journal_entry_id uuid;
    bank_account_id uuid;
    cash_account_id uuid;
    transfer_account_id uuid;
BEGIN
    -- Find the bank's associated account
    SELECT account_id INTO bank_account_id
    FROM public.chart_of_accounts
    WHERE company_id = transaction_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%bank%' OR account_name ILIKE '%مصرف%')
    AND is_active = true
    LIMIT 1;
    
    -- Find cash account for cash transactions
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = transaction_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%نقد%')
    AND is_active = true
    LIMIT 1;
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit,
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        transaction_record.company_id,
        'BT-' || transaction_record.transaction_number,
        transaction_record.transaction_date,
        'Bank Transaction: ' || transaction_record.description,
        'bank_transaction',
        transaction_record.id,
        transaction_record.amount,
        transaction_record.amount,
        'posted',
        transaction_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines based on transaction type
    IF transaction_record.transaction_type = 'deposit' THEN
        -- Debit: Bank Account, Credit: Cash/Other
        IF bank_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                bank_account_id,
                1,
                'Bank deposit - ' || transaction_record.description,
                transaction_record.amount,
                0
            );
        END IF;
        
        IF cash_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                cash_account_id,
                2,
                'Cash received - ' || transaction_record.description,
                0,
                transaction_record.amount
            );
        END IF;
        
    ELSIF transaction_record.transaction_type = 'withdrawal' THEN
        -- Debit: Cash/Other, Credit: Bank Account
        IF cash_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                cash_account_id,
                1,
                'Cash withdrawal - ' || transaction_record.description,
                transaction_record.amount,
                0
            );
        END IF;
        
        IF bank_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                bank_account_id,
                2,
                'Bank withdrawal - ' || transaction_record.description,
                0,
                transaction_record.amount
            );
        END IF;
        
    ELSIF transaction_record.transaction_type = 'transfer' AND transaction_record.counterpart_bank_id IS NOT NULL THEN
        -- Handle bank transfer
        SELECT account_id INTO transfer_account_id
        FROM public.chart_of_accounts
        WHERE company_id = transaction_record.company_id
        AND account_type = 'assets'
        AND id != bank_account_id
        AND is_active = true
        LIMIT 1;
        
        IF bank_account_id IS NOT NULL AND transfer_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                transfer_account_id,
                1,
                'Transfer to - ' || transaction_record.description,
                transaction_record.amount,
                0
            ),
            (
                gen_random_uuid(),
                journal_entry_id,
                bank_account_id,
                2,
                'Transfer from - ' || transaction_record.description,
                0,
                transaction_record.amount
            );
        END IF;
    END IF;
    
    RETURN journal_entry_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to create journal entry for bank transaction %: %', transaction_record.id, SQLERRM;
        RETURN NULL;
END;
$function$;

-- Create updated trigger function that uses the new approach
CREATE OR REPLACE FUNCTION public.handle_bank_transaction_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    journal_id uuid;
BEGIN
    -- Only process for INSERT operations and when journal_entry_id is not already set
    IF TG_OP = 'INSERT' AND NEW.journal_entry_id IS NULL THEN
        -- Create journal entry using the NEW record
        journal_id := public.create_bank_transaction_journal_entry_from_record(NEW);
        
        -- Update the transaction with the journal entry ID if successful
        IF journal_id IS NOT NULL THEN
            UPDATE public.bank_transactions 
            SET journal_entry_id = journal_id
            WHERE id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create the trigger to run AFTER INSERT to avoid the "transaction not found" issue
CREATE TRIGGER handle_bank_transaction_changes
    AFTER INSERT ON public.bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_bank_transaction_changes();