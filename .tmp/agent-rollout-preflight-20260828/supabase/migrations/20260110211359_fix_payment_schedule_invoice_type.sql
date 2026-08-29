
-- Fix invoice_type to use 'sales' instead of 'rental'
CREATE OR REPLACE FUNCTION create_payment_schedule_invoices(
    p_contract_id UUID,
    p_installment_plan TEXT DEFAULT 'monthly',
    p_number_of_installments INTEGER DEFAULT NULL,
    p_first_payment_date DATE DEFAULT NULL
)
RETURNS TABLE(
    schedule_id UUID,
    invoice_id UUID,
    installment_num INTEGER,
    due_date DATE,
    amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    contract_record RECORD;
    installment_amount NUMERIC;
    installment_count INTEGER;
    next_due_date DATE;
    i INTEGER;
    current_schedule_id UUID;
    current_invoice_id UUID;
    new_invoice_number TEXT;
    next_invoice_seq INTEGER;
BEGIN
    -- Get contract details
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = p_contract_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found with ID: %', p_contract_id;
    END IF;
    
    -- Calculate number of months between start and end date
    installment_count := COALESCE(
        p_number_of_installments,
        GREATEST(1, 
            (EXTRACT(YEAR FROM contract_record.end_date) - EXTRACT(YEAR FROM contract_record.start_date)) * 12 +
            (EXTRACT(MONTH FROM contract_record.end_date) - EXTRACT(MONTH FROM contract_record.start_date)) + 1
        )::INTEGER
    );
    
    -- Use monthly_amount for monthly plans
    CASE p_installment_plan
        WHEN 'monthly' THEN
            IF contract_record.monthly_amount IS NOT NULL AND contract_record.monthly_amount > 0 THEN
                installment_amount := contract_record.monthly_amount;
            ELSE
                installment_amount := COALESCE(contract_record.contract_amount, 0) / GREATEST(1, installment_count);
            END IF;
        WHEN 'quarterly' THEN
            installment_count := COALESCE(p_number_of_installments, GREATEST(1, CEIL(installment_count::NUMERIC / 3)));
            IF contract_record.monthly_amount IS NOT NULL AND contract_record.monthly_amount > 0 THEN
                installment_amount := contract_record.monthly_amount * 3;
            ELSE
                installment_amount := COALESCE(contract_record.contract_amount, 0) / GREATEST(1, installment_count);
            END IF;
        WHEN 'semi_annual' THEN
            installment_count := COALESCE(p_number_of_installments, GREATEST(1, CEIL(installment_count::NUMERIC / 6)));
            IF contract_record.monthly_amount IS NOT NULL AND contract_record.monthly_amount > 0 THEN
                installment_amount := contract_record.monthly_amount * 6;
            ELSE
                installment_amount := COALESCE(contract_record.contract_amount, 0) / GREATEST(1, installment_count);
            END IF;
        WHEN 'annual' THEN
            installment_count := COALESCE(p_number_of_installments, GREATEST(1, CEIL(installment_count::NUMERIC / 12)));
            IF contract_record.monthly_amount IS NOT NULL AND contract_record.monthly_amount > 0 THEN
                installment_amount := contract_record.monthly_amount * 12;
            ELSE
                installment_amount := COALESCE(contract_record.contract_amount, 0) / GREATEST(1, installment_count);
            END IF;
        ELSE
            IF contract_record.monthly_amount IS NOT NULL AND contract_record.monthly_amount > 0 THEN
                installment_amount := contract_record.monthly_amount;
            ELSE
                installment_amount := COALESCE(contract_record.contract_amount, 0) / GREATEST(1, installment_count);
            END IF;
    END CASE;
    
    IF installment_count <= 0 THEN
        RAISE EXCEPTION 'Invalid installment count: %', installment_count;
    END IF;
    
    -- Set the first payment date
    IF p_first_payment_date IS NOT NULL THEN
        next_due_date := p_first_payment_date;
    ELSE
        next_due_date := contract_record.start_date;
    END IF;
    
    -- Get the next invoice sequence number
    SELECT COALESCE(MAX(
        CASE 
            WHEN inv.invoice_number ~ '^PS-[0-9]{4}-[0-9]+$' 
            THEN SUBSTRING(inv.invoice_number FROM 9)::INTEGER 
            ELSE 0 
        END
    ), 0) + 1 INTO next_invoice_seq
    FROM public.invoices inv
    WHERE inv.company_id = contract_record.company_id 
    AND inv.invoice_number LIKE 'PS-%';
    
    -- Create installments and their invoices
    FOR i IN 1..installment_count LOOP
        -- Generate unique invoice number
        new_invoice_number := 'PS-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_invoice_seq::TEXT, 6, '0');
        next_invoice_seq := next_invoice_seq + 1;
        
        -- Create the invoice (using 'sales' as invoice_type which is valid)
        INSERT INTO public.invoices (
            id, company_id, customer_id, invoice_number, invoice_date, due_date,
            subtotal, tax_amount, total_amount, status, invoice_type, payment_status,
            notes, created_by, contract_id
        ) VALUES (
            gen_random_uuid(),
            contract_record.company_id,
            contract_record.customer_id,
            new_invoice_number,
            CURRENT_DATE,
            next_due_date,
            installment_amount,
            0,
            installment_amount,
            'draft',
            'sales',  -- Changed from 'rental' to 'sales' to match check constraint
            'unpaid',
            'قسط ' || i || ' من ' || installment_count || ' - عقد رقم ' || contract_record.contract_number,
            contract_record.created_by,
            contract_record.id
        ) RETURNING id INTO current_invoice_id;
        
        -- Create the payment schedule entry
        INSERT INTO public.contract_payment_schedules (
            id, company_id, contract_id, installment_number, due_date, amount,
            description, created_by, invoice_id, status
        ) VALUES (
            gen_random_uuid(),
            contract_record.company_id,
            p_contract_id,
            i,
            next_due_date,
            installment_amount,
            'قسط ' || i || ' من ' || installment_count || ' - عقد رقم ' || contract_record.contract_number,
            contract_record.created_by,
            current_invoice_id,
            CASE WHEN next_due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END
        ) RETURNING id INTO current_schedule_id;
        
        -- Return the created records
        RETURN QUERY SELECT current_schedule_id, current_invoice_id, i, next_due_date, installment_amount;
        
        -- Calculate next due date
        CASE p_installment_plan
            WHEN 'monthly' THEN next_due_date := next_due_date + INTERVAL '1 month';
            WHEN 'quarterly' THEN next_due_date := next_due_date + INTERVAL '3 months';
            WHEN 'semi_annual' THEN next_due_date := next_due_date + INTERVAL '6 months';
            WHEN 'annual' THEN next_due_date := next_due_date + INTERVAL '1 year';
            ELSE next_due_date := next_due_date + INTERVAL '1 month';
        END CASE;
    END LOOP;
    
    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating payment schedules: %', SQLERRM;
END;
$$;
;
