-- Fix the payment journal entry creation to avoid timing issues

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_payment_changes ON public.payments;

-- Update the create_payment_journal_entry function to accept payment record directly
CREATE OR REPLACE FUNCTION public.create_payment_journal_entry(payment_record RECORD)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    journal_entry_id uuid;
    cash_account_id uuid;
    receivable_account_id uuid;
    payable_account_id uuid;
    sales_cost_center_id uuid;
    entry_description text;
BEGIN
    -- Skip if payment is not completed
    IF payment_record.payment_status != 'completed' THEN
        RETURN NULL;
    END IF;
    
    -- Skip if journal entry already exists
    IF payment_record.journal_entry_id IS NOT NULL THEN
        RETURN payment_record.journal_entry_id;
    END IF;
    
    -- Get sales cost center
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = payment_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- Get cash account (bank or cash)
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%' OR account_name ILIKE '%نقد%' OR account_name ILIKE '%بنك%')
    AND is_active = true
    AND account_level >= 3
    AND is_header = false
    LIMIT 1;
    
    -- Get receivable/payable account based on payment type
    IF payment_record.payment_type = 'receipt' THEN
        SELECT id INTO receivable_account_id
        FROM public.chart_of_accounts
        WHERE company_id = payment_record.company_id
        AND account_type = 'assets'
        AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%' OR account_name ILIKE '%ذمم%')
        AND is_active = true
        AND account_level >= 3
        AND is_header = false
        LIMIT 1;
    ELSE
        SELECT id INTO payable_account_id
        FROM public.chart_of_accounts
        WHERE company_id = payment_record.company_id
        AND account_type = 'liabilities'
        AND (account_name ILIKE '%payable%' OR account_name ILIKE '%دائن%' OR account_name ILIKE '%مورد%')
        AND is_active = true
        AND account_level >= 3
        AND is_header = false
        LIMIT 1;
    END IF;
    
    -- Skip if required accounts not found
    IF cash_account_id IS NULL OR 
       (payment_record.payment_type = 'receipt' AND receivable_account_id IS NULL) OR
       (payment_record.payment_type = 'payment' AND payable_account_id IS NULL) THEN
        RAISE WARNING 'Required accounts not found for payment %', payment_record.id;
        RETURN NULL;
    END IF;
    
    -- Create journal entry description
    entry_description := CASE 
        WHEN payment_record.payment_type = 'receipt' THEN 'Cash Receipt #' 
        ELSE 'Cash Payment #' 
    END || payment_record.payment_number;
    
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
        payment_record.company_id,
        generate_journal_entry_number(payment_record.company_id),
        payment_record.payment_date,
        entry_description,
        'payment',
        payment_record.id,
        payment_record.amount,
        payment_record.amount,
        'posted',
        payment_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines for receipts
    IF payment_record.payment_type = 'receipt' THEN
        -- Debit: Cash/Bank
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            cash_account_id,
            sales_cost_center_id,
            1,
            'Cash received - ' || entry_description,
            payment_record.amount,
            0
        );
        
        -- Credit: Accounts Receivable
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            receivable_account_id,
            sales_cost_center_id,
            2,
            'Payment received - ' || entry_description,
            0,
            payment_record.amount
        );
    ELSE
        -- Create journal entry lines for payments
        -- Credit: Cash/Bank
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            cash_account_id,
            sales_cost_center_id,
            1,
            'Cash paid - ' || entry_description,
            0,
            payment_record.amount
        );
        
        -- Debit: Accounts Payable
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            payable_account_id,
            sales_cost_center_id,
            2,
            'Payment made - ' || entry_description,
            payment_record.amount,
            0
        );
    END IF;
    
    RETURN journal_entry_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create journal entry for payment %: %', payment_record.id, SQLERRM;
        RETURN NULL;
END;
$function$;

-- Create the improved trigger function
CREATE OR REPLACE FUNCTION public.handle_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    journal_id uuid;
BEGIN
    -- Only process for completed payments
    IF NEW.payment_status = 'completed' AND 
       (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.payment_status != 'completed')) THEN
        
        -- Create journal entry using the payment record directly
        BEGIN
            journal_id := public.create_payment_journal_entry(NEW);
            
            -- Update the payment with journal entry ID if created successfully
            IF journal_id IS NOT NULL THEN
                UPDATE public.payments 
                SET journal_entry_id = journal_id
                WHERE id = NEW.id;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the payment creation
                RAISE WARNING 'Failed to create journal entry for payment %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER handle_payment_changes
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_changes();

-- Create helper function to generate journal entry numbers if it doesn't exist
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    entry_count integer;
    year_suffix text;
BEGIN
    -- Get current year
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Count existing entries for this company in current year
    SELECT COUNT(*) + 1 INTO entry_count
    FROM public.journal_entries 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Return formatted entry number
    RETURN 'JE-' || year_suffix || '-' || LPAD(entry_count::TEXT, 4, '0');
END;
$function$;