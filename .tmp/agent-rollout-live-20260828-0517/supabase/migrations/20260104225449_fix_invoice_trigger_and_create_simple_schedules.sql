
-- Fix the search_path issue in create_invoice_journal_entry trigger function
CREATE OR REPLACE FUNCTION public.create_invoice_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    _entry_number TEXT;
    _journal_id UUID;
    _ar_account_id UUID;
    _revenue_account_id UUID;
    _tax_account_id UUID;
BEGIN
    -- Get account IDs
    SELECT id INTO _ar_account_id
    FROM public.chart_of_accounts 
    WHERE company_id = NEW.company_id 
    AND account_code = '1201' 
    AND is_active = true 
    LIMIT 1;
    
    SELECT id INTO _revenue_account_id
    FROM public.chart_of_accounts 
    WHERE company_id = NEW.company_id 
    AND account_code = '4101' 
    AND is_active = true 
    LIMIT 1;
    
    -- Skip if accounts not found
    IF _ar_account_id IS NULL OR _revenue_account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Generate entry number
    _entry_number := 'INV-' || TO_CHAR(NEW.invoice_date, 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
    
    -- Create journal entry
    INSERT INTO public.journal_entries (
        company_id,
        entry_number,
        entry_date,
        description,
        total_debit,
        total_credit,
        entry_type,
        status,
        source_document_type,
        source_document_id,
        created_by
    ) VALUES (
        NEW.company_id,
        _entry_number,
        NEW.invoice_date,
        'قيد فاتورة: ' || NEW.invoice_number,
        NEW.total_amount,
        NEW.total_amount,
        'automatic',
        'posted',
        'invoice',
        NEW.id,
        auth.uid()
    ) RETURNING id INTO _journal_id;
    
    -- Debit: AR
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        line_description,
        line_number
    ) VALUES (
        _journal_id,
        _ar_account_id,
        NEW.total_amount,
        0,
        'مستحقات على العملاء',
        1
    );
    
    -- Credit: Revenue
    INSERT INTO public.journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        line_description,
        line_number
    ) VALUES (
        _journal_id,
        _revenue_account_id,
        0,
        NEW.subtotal,
        'إيراد الخدمات',
        2
    );
    
    -- Credit: Tax (if applicable)
    IF NEW.tax_amount > 0 THEN
        SELECT id INTO _tax_account_id
        FROM public.chart_of_accounts 
        WHERE company_id = NEW.company_id 
        AND account_code = '2201' 
        AND is_active = true 
        LIMIT 1;
        
        IF _tax_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                journal_entry_id,
                account_id,
                debit_amount,
                credit_amount,
                line_description,
                line_number
            ) VALUES (
                _journal_id,
                _tax_account_id,
                0,
                NEW.tax_amount,
                'ضريبة محصلة',
                3
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create a simpler function that only creates payment schedules (no invoices)
-- This avoids triggering invoice-related triggers
CREATE OR REPLACE FUNCTION public.create_payment_schedules_only(p_contract_id uuid)
RETURNS TABLE(
    schedule_id uuid,
    installment_number integer,
    due_date date,
    amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record RECORD;
    installment_amount NUMERIC;
    installment_count INTEGER;
    next_due_date DATE;
    i INTEGER;
    current_schedule_id UUID;
BEGIN
    -- Get contract details
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = p_contract_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found with ID: %', p_contract_id;
    END IF;
    
    IF contract_record.contract_amount IS NULL OR contract_record.contract_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid contract amount: %', contract_record.contract_amount;
    END IF;
    
    -- Calculate monthly installments
    installment_count := GREATEST(1, 
        EXTRACT(MONTH FROM AGE(contract_record.end_date, contract_record.start_date))::INTEGER + 1
    );
    installment_amount := ROUND(contract_record.contract_amount / installment_count, 2);
    
    -- Create installments
    next_due_date := contract_record.start_date;
    
    FOR i IN 1..installment_count LOOP
        -- Create the payment schedule entry
        INSERT INTO public.contract_payment_schedules (
            id,
            company_id,
            contract_id,
            installment_number,
            due_date,
            amount,
            status,
            description,
            created_by
        ) VALUES (
            gen_random_uuid(),
            contract_record.company_id,
            p_contract_id,
            i,
            next_due_date,
            installment_amount,
            CASE 
                WHEN next_due_date < CURRENT_DATE THEN 'overdue'
                ELSE 'pending'
            END,
            'قسط ' || i || ' من ' || installment_count || ' - عقد رقم ' || contract_record.contract_number,
            contract_record.created_by
        ) RETURNING id INTO current_schedule_id;
        
        -- Return the created record
        schedule_id := current_schedule_id;
        installment_number := i;
        due_date := next_due_date;
        amount := installment_amount;
        RETURN NEXT;
        
        -- Next month
        next_due_date := next_due_date + INTERVAL '1 month';
    END LOOP;
    
    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating payment schedules: %', SQLERRM;
END;
$function$;

-- Update the generate_missing_payment_schedules function to use the simpler function
CREATE OR REPLACE FUNCTION public.generate_missing_payment_schedules()
RETURNS TABLE(
    contract_id uuid,
    contract_number text,
    schedules_created integer,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    rec RECORD;
    schedule_count INTEGER;
    v_error_message TEXT;
BEGIN
    -- Loop through all active contracts without payment schedules
    FOR rec IN 
        SELECT 
            c.id,
            c.contract_number,
            c.company_id,
            c.start_date,
            c.end_date,
            c.contract_amount
        FROM public.contracts c
        WHERE c.status IN ('active', 'pending')
          AND c.contract_amount > 0
          AND c.start_date IS NOT NULL
          AND c.end_date IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.contract_payment_schedules cps 
              WHERE cps.contract_id = c.id
          )
        ORDER BY c.created_at
    LOOP
        BEGIN
            -- Create payment schedules for this contract (simple version)
            SELECT COUNT(*) INTO schedule_count
            FROM public.create_payment_schedules_only(rec.id);
            
            contract_id := rec.id;
            contract_number := rec.contract_number;
            schedules_created := schedule_count;
            status := 'success';
            RETURN NEXT;
            
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            
            contract_id := rec.id;
            contract_number := rec.contract_number;
            schedules_created := 0;
            status := 'error: ' || v_error_message;
            RETURN NEXT;
        END;
    END LOOP;
    
    RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_payment_schedules_only(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_schedules_only(uuid) TO service_role;
;
