-- Update create_contract_journal_entry to include cost center mapping
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(contract_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    contract_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    accrued_revenue_account_id uuid;
BEGIN
    -- Get contract details
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found';
    END IF;
    
    -- Find required accounts
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'assets'
    AND account_name ILIKE '%receivable%'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO accrued_revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'revenue'
    AND (account_name ILIKE '%accrued%' OR account_name ILIKE '%مستحق%')
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
        contract_record.company_id,
        generate_journal_entry_number(contract_record.company_id),
        contract_record.contract_date,
        'Contract #' || contract_record.contract_number,
        'contract',
        contract_record.id,
        contract_record.contract_amount,
        contract_record.contract_amount,
        'draft',
        contract_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines with cost center
    -- Debit: Accounts Receivable
    IF receivable_account_id IS NOT NULL THEN
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
            contract_record.cost_center_id,
            1,
            'Accounts Receivable - Contract #' || contract_record.contract_number,
            contract_record.contract_amount,
            0
        );
    END IF;
    
    -- Credit: Accrued Revenue
    IF accrued_revenue_account_id IS NOT NULL THEN
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
            accrued_revenue_account_id,
            contract_record.cost_center_id,
            2,
            'Accrued Revenue - Contract #' || contract_record.contract_number,
            0,
            contract_record.contract_amount
        );
    END IF;
    
    -- Update contract with journal entry reference
    UPDATE public.contracts
    SET journal_entry_id = journal_entry_id
    WHERE id = contract_id_param;
    
    RETURN journal_entry_id;
END;
$function$;

-- Update create_payment_journal_entry to include cost center mapping
CREATE OR REPLACE FUNCTION public.create_payment_journal_entry(payment_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    payment_record record;
    journal_entry_id uuid;
    cash_account_id uuid;
    receivable_account_id uuid;
    payable_account_id uuid;
    default_cost_center_id uuid;
BEGIN
    -- Get payment details
    SELECT * INTO payment_record
    FROM public.payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- Get default cost center for general payments
    SELECT id INTO default_cost_center_id
    FROM public.cost_centers
    WHERE company_id = payment_record.company_id
    AND center_code = 'ADMIN'
    AND is_active = true
    LIMIT 1;
    
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
                cost_center_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                cash_account_id,
                default_cost_center_id,
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
                cost_center_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                receivable_account_id,
                default_cost_center_id,
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
                cost_center_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                payable_account_id,
                default_cost_center_id,
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
                cost_center_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                cash_account_id,
                default_cost_center_id,
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
$function$;

-- Update create_payroll_journal_entry to include cost center mapping
CREATE OR REPLACE FUNCTION public.create_payroll_journal_entry(payroll_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    payroll_record record;
    journal_entry_id uuid;
    salary_expense_account_id uuid;
    tax_payable_account_id uuid;
    cash_account_id uuid;
    employee_payable_account_id uuid;
    hr_cost_center_id uuid;
BEGIN
    -- Get payroll details
    SELECT * INTO payroll_record
    FROM public.payroll
    WHERE id = payroll_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll not found';
    END IF;
    
    -- Get HR cost center for payroll
    SELECT id INTO hr_cost_center_id
    FROM public.cost_centers
    WHERE company_id = payroll_record.company_id
    AND center_code = 'HR'
    AND is_active = true
    LIMIT 1;
    
    -- Find required accounts
    SELECT id INTO salary_expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'expenses'
    AND (account_name ILIKE '%salary%' OR account_name ILIKE '%wage%' OR account_name ILIKE '%راتب%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO tax_payable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'liabilities'
    AND account_name ILIKE '%tax%'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO employee_payable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'liabilities'
    AND (account_name ILIKE '%employee%payable%' OR account_name ILIKE '%مستحق%موظف%')
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
        payroll_record.company_id,
        generate_journal_entry_number(payroll_record.company_id),
        payroll_record.payroll_date,
        'Payroll #' || payroll_record.payroll_number,
        'payroll',
        payroll_record.id,
        payroll_record.basic_salary + COALESCE(payroll_record.allowances, 0) + COALESCE(payroll_record.overtime_amount, 0),
        payroll_record.basic_salary + COALESCE(payroll_record.allowances, 0) + COALESCE(payroll_record.overtime_amount, 0),
        'draft',
        payroll_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines with HR cost center
    -- Debit: Salary Expense
    IF salary_expense_account_id IS NOT NULL THEN
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
            salary_expense_account_id,
            hr_cost_center_id,
            1,
            'Salary Expense - Payroll #' || payroll_record.payroll_number,
            payroll_record.basic_salary + COALESCE(payroll_record.allowances, 0) + COALESCE(payroll_record.overtime_amount, 0),
            0
        );
    END IF;
    
    -- Credit: Tax Payable (if applicable)
    IF tax_payable_account_id IS NOT NULL AND payroll_record.tax_amount > 0 THEN
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
            tax_payable_account_id,
            hr_cost_center_id,
            2,
            'Tax Payable - Payroll #' || payroll_record.payroll_number,
            0,
            payroll_record.tax_amount
        );
    END IF;
    
    -- Credit: Cash/Bank for net amount
    IF cash_account_id IS NOT NULL THEN
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
            hr_cost_center_id,
            3,
            'Cash paid - Payroll #' || payroll_record.payroll_number,
            0,
            payroll_record.net_amount
        );
    END IF;
    
    -- Credit: Employee Payable for deductions (if any)
    IF employee_payable_account_id IS NOT NULL AND payroll_record.deductions > 0 THEN
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
            employee_payable_account_id,
            hr_cost_center_id,
            4,
            'Employee Deductions - Payroll #' || payroll_record.payroll_number,
            0,
            payroll_record.deductions
        );
    END IF;
    
    -- Update payroll with journal entry reference
    UPDATE public.payroll
    SET journal_entry_id = journal_entry_id
    WHERE id = payroll_id_param;
    
    RETURN journal_entry_id;
END;
$function$;

-- Update create_bank_transaction_journal_entry to include cost center mapping
CREATE OR REPLACE FUNCTION public.create_bank_transaction_journal_entry(transaction_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    transaction_record record;
    journal_entry_id uuid;
    cash_account_id uuid;
    expense_account_id uuid;
    revenue_account_id uuid;
    finance_cost_center_id uuid;
BEGIN
    -- Get transaction details
    SELECT * INTO transaction_record
    FROM public.bank_transactions
    WHERE id = transaction_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bank transaction not found';
    END IF;
    
    -- Get finance cost center for bank transactions
    SELECT id INTO finance_cost_center_id
    FROM public.cost_centers
    WHERE company_id = transaction_record.company_id
    AND center_code = 'FINANCE'
    AND is_active = true
    LIMIT 1;
    
    -- Find required accounts
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = transaction_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = transaction_record.company_id
    AND account_type = 'expenses'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = transaction_record.company_id
    AND account_type = 'revenue'
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
        generate_journal_entry_number(transaction_record.company_id),
        transaction_record.transaction_date,
        'Bank Transaction #' || transaction_record.transaction_number || ' - ' || transaction_record.description,
        'bank_transaction',
        transaction_record.id,
        transaction_record.amount,
        transaction_record.amount,
        'draft',
        transaction_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines based on transaction type
    IF transaction_record.transaction_type = 'deposit' THEN
        -- Money coming in
        -- Debit: Cash/Bank
        IF cash_account_id IS NOT NULL THEN
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
                finance_cost_center_id,
                1,
                'Cash deposit - ' || transaction_record.description,
                transaction_record.amount,
                0
            );
        END IF;
        
        -- Credit: Revenue
        IF revenue_account_id IS NOT NULL THEN
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
                revenue_account_id,
                finance_cost_center_id,
                2,
                'Revenue - ' || transaction_record.description,
                0,
                transaction_record.amount
            );
        END IF;
        
    ELSIF transaction_record.transaction_type = 'withdrawal' THEN
        -- Money going out
        -- Debit: Expense
        IF expense_account_id IS NOT NULL THEN
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
                expense_account_id,
                finance_cost_center_id,
                1,
                'Expense - ' || transaction_record.description,
                transaction_record.amount,
                0
            );
        END IF;
        
        -- Credit: Cash/Bank
        IF cash_account_id IS NOT NULL THEN
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
                finance_cost_center_id,
                2,
                'Cash withdrawal - ' || transaction_record.description,
                0,
                transaction_record.amount
            );
        END IF;
    END IF;
    
    -- Update transaction with journal entry reference
    UPDATE public.bank_transactions
    SET journal_entry_id = journal_entry_id
    WHERE id = transaction_id_param;
    
    RETURN journal_entry_id;
END;
$function$;

-- Update create_depreciation_journal_entry to include cost center mapping
CREATE OR REPLACE FUNCTION public.create_depreciation_journal_entry(asset_id_param uuid, depreciation_amount_param numeric, depreciation_date_param date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    asset_record record;
    journal_entry_id uuid;
    depreciation_expense_account_id uuid;
    accumulated_depreciation_account_id uuid;
    asset_cost_center_id uuid;
BEGIN
    -- Get asset details
    SELECT * INTO asset_record
    FROM public.fixed_assets
    WHERE id = asset_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fixed asset not found';
    END IF;
    
    -- Get asset cost center for depreciation (use ASSET cost center)
    SELECT id INTO asset_cost_center_id
    FROM public.cost_centers
    WHERE company_id = asset_record.company_id
    AND center_code = 'ASSET'
    AND is_active = true
    LIMIT 1;
    
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
    
    -- Create journal entry lines with asset cost center
    -- Debit: Depreciation Expense
    IF depreciation_expense_account_id IS NOT NULL THEN
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
            depreciation_expense_account_id,
            asset_cost_center_id,
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
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            accumulated_depreciation_account_id,
            asset_cost_center_id,
            2,
            'Accumulated Depreciation - ' || asset_record.asset_name,
            0,
            depreciation_amount_param
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- Update create_penalty_journal_entry to include cost center mapping
CREATE OR REPLACE FUNCTION public.create_penalty_journal_entry(penalty_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    penalty_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    other_income_account_id uuid;
    sales_cost_center_id uuid;
BEGIN
    -- Get penalty details
    SELECT * INTO penalty_record
    FROM public.penalties
    WHERE id = penalty_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Penalty not found';
    END IF;
    
    -- Get sales cost center for penalties
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = penalty_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- Find required accounts
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = penalty_record.company_id
    AND account_type = 'assets'
    AND account_name ILIKE '%receivable%'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO other_income_account_id
    FROM public.chart_of_accounts
    WHERE company_id = penalty_record.company_id
    AND account_type = 'revenue'
    AND (account_name ILIKE '%other%income%' OR account_name ILIKE '%إيرادات%أخرى%' OR account_name ILIKE '%غرامات%')
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
        penalty_record.company_id,
        generate_journal_entry_number(penalty_record.company_id),
        penalty_record.penalty_date,
        'Penalty #' || penalty_record.penalty_number || ' - ' || penalty_record.reason,
        'penalty',
        penalty_record.id,
        penalty_record.amount,
        penalty_record.amount,
        'draft',
        penalty_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines with sales cost center
    -- Debit: Accounts Receivable
    IF receivable_account_id IS NOT NULL THEN
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
            1,
            'Accounts Receivable - Penalty #' || penalty_record.penalty_number,
            penalty_record.amount,
            0
        );
    END IF;
    
    -- Credit: Other Income
    IF other_income_account_id IS NOT NULL THEN
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
            other_income_account_id,
            sales_cost_center_id,
            2,
            'Other Income - Penalty #' || penalty_record.penalty_number,
            0,
            penalty_record.amount
        );
    END IF;
    
    -- Update penalty with journal entry reference
    UPDATE public.penalties
    SET journal_entry_id = journal_entry_id
    WHERE id = penalty_id_param;
    
    RETURN journal_entry_id;
END;
$function$;

-- Update create_invoice_journal_entry to include cost center mapping
CREATE OR REPLACE FUNCTION public.create_invoice_journal_entry(invoice_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    invoice_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    revenue_account_id uuid;
    tax_payable_account_id uuid;
    sales_cost_center_id uuid;
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
    
    -- Get sales cost center for invoices
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = invoice_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
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
    
    -- Create journal entry lines with sales cost center
    -- Debit: Accounts Receivable
    IF receivable_account_id IS NOT NULL THEN
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
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            revenue_account_id,
            sales_cost_center_id,
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
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            tax_payable_account_id,
            sales_cost_center_id,
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
$function$;