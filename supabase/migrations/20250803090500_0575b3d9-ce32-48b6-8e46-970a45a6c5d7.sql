-- Fix the create_payment_schedule_invoices function
CREATE OR REPLACE FUNCTION public.create_payment_schedule_invoices(p_contract_id uuid, p_installment_plan text DEFAULT 'monthly'::text, p_number_of_installments integer DEFAULT NULL::integer)
 RETURNS TABLE(schedule_id uuid, invoice_id uuid, installment_number integer, due_date date, amount numeric)
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
    current_invoice_id UUID;
    invoice_number TEXT;
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
    
    -- Determine installment count and amount based on plan
    CASE p_installment_plan
        WHEN 'monthly' THEN
            installment_count := COALESCE(p_number_of_installments, 
                GREATEST(1, EXTRACT(MONTH FROM AGE(contract_record.end_date, contract_record.start_date))::INTEGER + 1));
            installment_amount := contract_record.contract_amount / installment_count;
        WHEN 'quarterly' THEN
            installment_count := COALESCE(p_number_of_installments, 
                GREATEST(1, CEIL(EXTRACT(MONTH FROM AGE(contract_record.end_date, contract_record.start_date))::NUMERIC / 3)));
            installment_amount := contract_record.contract_amount / installment_count;
        WHEN 'semi_annual' THEN
            installment_count := COALESCE(p_number_of_installments, 
                GREATEST(1, CEIL(EXTRACT(MONTH FROM AGE(contract_record.end_date, contract_record.start_date))::NUMERIC / 6)));
            installment_amount := contract_record.contract_amount / installment_count;
        WHEN 'annual' THEN
            installment_count := COALESCE(p_number_of_installments, 
                GREATEST(1, CEIL(EXTRACT(YEAR FROM AGE(contract_record.end_date, contract_record.start_date))::NUMERIC)));
            installment_amount := contract_record.contract_amount / installment_count;
        ELSE
            installment_count := COALESCE(p_number_of_installments, 1);
            installment_amount := contract_record.contract_amount;
    END CASE;
    
    -- Validate installment count
    IF installment_count <= 0 THEN
        RAISE EXCEPTION 'Invalid installment count: %', installment_count;
    END IF;
    
    -- Create installments and their invoices
    next_due_date := contract_record.start_date;
    
    FOR i IN 1..installment_count LOOP
        -- Generate unique invoice number
        invoice_number := 'PS-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((
            SELECT COUNT(*) + 1 
            FROM public.invoices 
            WHERE company_id = contract_record.company_id 
            AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::TEXT, 6, '0');
        
        -- Create the invoice first with all required fields
        INSERT INTO public.invoices (
            id,
            company_id,
            customer_id,
            invoice_number,
            invoice_date,
            due_date,
            subtotal,
            tax_amount,
            total_amount,
            status,
            invoice_type,
            payment_status,
            notes,
            created_by,
            contract_id
        ) VALUES (
            gen_random_uuid(),
            contract_record.company_id,
            contract_record.customer_id,
            invoice_number,
            CURRENT_DATE,
            next_due_date,
            installment_amount,
            0,
            installment_amount,
            'draft',
            'sales',
            'unpaid',
            'Payment schedule invoice - Installment ' || i || ' of ' || installment_count || ' for contract #' || contract_record.contract_number,
            contract_record.created_by,
            contract_record.id
        ) RETURNING id INTO current_invoice_id;
        
        -- Add invoice item with correct column names
        INSERT INTO public.invoice_items (
            id,
            invoice_id,
            line_number,
            item_description,
            quantity,
            unit_price,
            line_total
        ) VALUES (
            gen_random_uuid(),
            current_invoice_id,
            1,
            'Contract Service - Installment ' || i || ' (' || p_installment_plan || ') - ' || contract_record.contract_number,
            1,
            installment_amount,
            installment_amount
        );
        
        -- Create the payment schedule entry with invoice reference
        INSERT INTO public.contract_payment_schedules (
            id,
            company_id,
            contract_id,
            installment_number,
            due_date,
            amount,
            description,
            created_by,
            invoice_id
        ) VALUES (
            gen_random_uuid(),
            contract_record.company_id,
            p_contract_id,
            i,
            next_due_date,
            installment_amount,
            'Installment ' || i || ' of ' || installment_count,
            contract_record.created_by,
            current_invoice_id
        ) RETURNING id INTO current_schedule_id;
        
        -- Return the created records
        RETURN QUERY SELECT 
            current_schedule_id,
            current_invoice_id,
            i,
            next_due_date,
            installment_amount;
        
        -- Calculate next due date based on plan
        CASE p_installment_plan
            WHEN 'monthly' THEN
                next_due_date := next_due_date + INTERVAL '1 month';
            WHEN 'quarterly' THEN
                next_due_date := next_due_date + INTERVAL '3 months';
            WHEN 'semi_annual' THEN
                next_due_date := next_due_date + INTERVAL '6 months';
            WHEN 'annual' THEN
                next_due_date := next_due_date + INTERVAL '1 year';
            ELSE
                next_due_date := next_due_date + INTERVAL '1 month';
        END CASE;
    END LOOP;
    
    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating payment schedules: %', SQLERRM;
END;
$function$;