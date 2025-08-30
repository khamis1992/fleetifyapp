-- Create function to generate journal entry numbers
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    current_year text;
    sequence_num integer;
    entry_number text;
BEGIN
    current_year := EXTRACT(year FROM CURRENT_DATE)::text;
    
    -- Get next sequence number for this company and year
    SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+$') AS integer)), 0) + 1
    INTO sequence_num
    FROM public.journal_entries
    WHERE company_id = company_id_param
    AND entry_number LIKE 'JE-' || current_year || '-%';
    
    entry_number := 'JE-' || current_year || '-' || LPAD(sequence_num::text, 4, '0');
    
    RETURN entry_number;
END;
$$;

-- Create function to automatically create journal entry for invoice
CREATE OR REPLACE FUNCTION public.create_invoice_journal_entry(invoice_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    invoice_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    revenue_account_id uuid;
    tax_payable_account_id uuid;
BEGIN
    -- Get invoice details
    SELECT * INTO invoice_record
    FROM public.invoices
    WHERE id = invoice_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Only create journal entry for sales invoices
    IF invoice_record.invoice_type != 'sales' THEN
        RETURN NULL;
    END IF;
    
    -- Find required accounts
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = invoice_record.company_id
    AND account_type = 'assets'
    AND account_subtype = 'current_assets'
    AND account_name ILIKE '%receivable%'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = invoice_record.company_id
    AND account_type = 'revenue'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO tax_payable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = invoice_record.company_id
    AND account_type = 'liabilities'
    AND account_name ILIKE '%tax%'
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
        invoice_record.company_id,
        generate_journal_entry_number(invoice_record.company_id),
        invoice_record.invoice_date,
        'Sales Invoice #' || invoice_record.invoice_number,
        'invoice',
        invoice_record.id,
        invoice_record.total_amount,
        invoice_record.total_amount,
        'draft',
        invoice_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Accounts Receivable
    IF receivable_account_id IS NOT NULL THEN
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
            receivable_account_id,
            1,
            'Accounts Receivable - Invoice #' || invoice_record.invoice_number,
            invoice_record.total_amount,
            0
        );
    END IF;
    
    -- Credit: Revenue
    IF revenue_account_id IS NOT NULL THEN
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
            revenue_account_id,
            2,
            'Revenue - Invoice #' || invoice_record.invoice_number,
            0,
            invoice_record.subtotal
        );
    END IF;
    
    -- Credit: Tax Payable (if applicable)
    IF tax_payable_account_id IS NOT NULL AND invoice_record.tax_amount > 0 THEN
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
            tax_payable_account_id,
            3,
            'Tax Payable - Invoice #' || invoice_record.invoice_number,
            0,
            invoice_record.tax_amount
        );
    END IF;
    
    -- Update invoice with journal entry reference
    UPDATE public.invoices
    SET journal_entry_id = journal_entry_id
    WHERE id = invoice_id_param;
    
    RETURN journal_entry_id;
END;
$$;

-- Create function to automatically create journal entry for payment
CREATE OR REPLACE FUNCTION public.create_payment_journal_entry(payment_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    payment_record record;
    journal_entry_id uuid;
    cash_account_id uuid;
    receivable_account_id uuid;
    payable_account_id uuid;
BEGIN
    -- Get payment details
    SELECT * INTO payment_record
    FROM public.payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- Find required accounts
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'assets'
    AND account_name ILIKE '%receivable%'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO payable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'liabilities'
    AND account_name ILIKE '%payable%'
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
        payment_record.company_id,
        generate_journal_entry_number(payment_record.company_id),
        payment_record.payment_date,
        'Payment #' || payment_record.payment_number || ' - ' || payment_record.payment_type,
        'payment',
        payment_record.id,
        payment_record.amount,
        payment_record.amount,
        'draft',
        payment_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines based on payment type
    IF payment_record.payment_type = 'receipt' THEN
        -- Customer payment received
        -- Debit: Cash/Bank
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
                'Cash received - Payment #' || payment_record.payment_number,
                payment_record.amount,
                0
            );
        END IF;
        
        -- Credit: Accounts Receivable
        IF receivable_account_id IS NOT NULL THEN
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
                receivable_account_id,
                2,
                'Accounts Receivable - Payment #' || payment_record.payment_number,
                0,
                payment_record.amount
            );
        END IF;
        
    ELSIF payment_record.payment_type = 'payment' THEN
        -- Vendor payment made
        -- Debit: Accounts Payable
        IF payable_account_id IS NOT NULL THEN
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
                payable_account_id,
                1,
                'Accounts Payable - Payment #' || payment_record.payment_number,
                payment_record.amount,
                0
            );
        END IF;
        
        -- Credit: Cash/Bank
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
                'Cash paid - Payment #' || payment_record.payment_number,
                0,
                payment_record.amount
            );
        END IF;
    END IF;
    
    -- Update payment with journal entry reference
    UPDATE public.payments
    SET journal_entry_id = journal_entry_id
    WHERE id = payment_id_param;
    
    RETURN journal_entry_id;
END;
$$;

-- Create function for depreciation journal entries
CREATE OR REPLACE FUNCTION public.create_depreciation_journal_entry(asset_id_param uuid, depreciation_amount_param numeric, depreciation_date_param date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    asset_record record;
    journal_entry_id uuid;
    depreciation_expense_account_id uuid;
    accumulated_depreciation_account_id uuid;
BEGIN
    -- Get asset details
    SELECT * INTO asset_record
    FROM public.fixed_assets
    WHERE id = asset_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fixed asset not found';
    END IF;
    
    -- Find required accounts
    SELECT id INTO depreciation_expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = asset_record.company_id
    AND account_type = 'expenses'
    AND account_name ILIKE '%depreciation%'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO accumulated_depreciation_account_id
    FROM public.chart_of_accounts
    WHERE company_id = asset_record.company_id
    AND account_type = 'assets'
    AND account_name ILIKE '%accumulated%depreciation%'
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
        status
    ) VALUES (
        gen_random_uuid(),
        asset_record.company_id,
        generate_journal_entry_number(asset_record.company_id),
        depreciation_date_param,
        'Depreciation - ' || asset_record.asset_name || ' (' || asset_record.asset_code || ')',
        'depreciation',
        asset_record.id,
        depreciation_amount_param,
        depreciation_amount_param,
        'draft'
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Depreciation Expense
    IF depreciation_expense_account_id IS NOT NULL THEN
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
            depreciation_expense_account_id,
            1,
            'Depreciation Expense - ' || asset_record.asset_name,
            depreciation_amount_param,
            0
        );
    END IF;
    
    -- Credit: Accumulated Depreciation
    IF accumulated_depreciation_account_id IS NOT NULL THEN
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
            accumulated_depreciation_account_id,
            2,
            'Accumulated Depreciation - ' || asset_record.asset_name,
            0,
            depreciation_amount_param
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$$;

-- Create triggers for automatic journal entries
CREATE OR REPLACE FUNCTION public.handle_invoice_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    -- Create journal entry when invoice status changes to 'sent' or 'paid'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('sent', 'paid') AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_invoice_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status IN ('sent', 'paid') AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_invoice_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_payment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    -- Create journal entry when payment status changes to 'completed'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_payment_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_payment_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS invoice_auto_journal_trigger ON public.invoices;
CREATE TRIGGER invoice_auto_journal_trigger
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_invoice_changes();

DROP TRIGGER IF EXISTS payment_auto_journal_trigger ON public.payments;
CREATE TRIGGER payment_auto_journal_trigger
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_changes();

-- Create function to process monthly depreciation for all assets
CREATE OR REPLACE FUNCTION public.process_monthly_depreciation(company_id_param uuid, depreciation_date_param date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    asset_record record;
    monthly_depreciation numeric;
    processed_count integer := 0;
    journal_entry_id uuid;
    depreciation_record_id uuid;
BEGIN
    -- Process all active assets for the company
    FOR asset_record IN 
        SELECT * FROM public.fixed_assets 
        WHERE company_id = company_id_param 
        AND is_active = true 
        AND disposal_date IS NULL
        AND useful_life_years > 0
    LOOP
        -- Calculate monthly depreciation (straight line method)
        monthly_depreciation := (asset_record.purchase_cost - COALESCE(asset_record.salvage_value, 0)) / (asset_record.useful_life_years * 12);
        
        -- Skip if depreciation amount is negligible
        IF monthly_depreciation < 0.01 THEN
            CONTINUE;
        END IF;
        
        -- Check if depreciation already processed for this period
        IF EXISTS (
            SELECT 1 FROM public.depreciation_records 
            WHERE fixed_asset_id = asset_record.id 
            AND depreciation_date = depreciation_date_param
        ) THEN
            CONTINUE;
        END IF;
        
        -- Create journal entry for depreciation
        journal_entry_id := create_depreciation_journal_entry(
            asset_record.id, 
            monthly_depreciation, 
            depreciation_date_param
        );
        
        -- Create depreciation record
        INSERT INTO public.depreciation_records (
            id,
            fixed_asset_id,
            depreciation_amount,
            depreciation_date,
            accumulated_depreciation,
            book_value,
            journal_entry_id,
            period_type,
            notes
        ) VALUES (
            gen_random_uuid(),
            asset_record.id,
            monthly_depreciation,
            depreciation_date_param,
            COALESCE(asset_record.accumulated_depreciation, 0) + monthly_depreciation,
            asset_record.purchase_cost - (COALESCE(asset_record.accumulated_depreciation, 0) + monthly_depreciation),
            journal_entry_id,
            'monthly',
            'Automatic monthly depreciation'
        );
        
        -- Update asset accumulated depreciation
        UPDATE public.fixed_assets
        SET accumulated_depreciation = COALESCE(accumulated_depreciation, 0) + monthly_depreciation,
            book_value = purchase_cost - (COALESCE(accumulated_depreciation, 0) + monthly_depreciation),
            updated_at = now()
        WHERE id = asset_record.id;
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$;