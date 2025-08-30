-- Update payroll journal entry function to use HR settings and improved cost center allocation
CREATE OR REPLACE FUNCTION public.create_payroll_journal_entry(payroll_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    payroll_record record;
    journal_entry_id uuid;
    salary_expense_account_id uuid;
    allowances_expense_account_id uuid;
    overtime_expense_account_id uuid;
    tax_payable_account_id uuid;
    social_security_payable_account_id uuid;
    cash_account_id uuid;
    payroll_cost_center_id uuid;
    hr_settings_record record;
    gross_amount numeric;
    social_security_amount numeric;
BEGIN
    -- Get payroll details with employee information
    SELECT p.*, e.first_name, e.last_name, e.department, e.position 
    INTO payroll_record
    FROM public.payroll p
    JOIN public.employees e ON p.employee_id = e.id
    WHERE p.id = payroll_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll record not found';
    END IF;
    
    -- Get HR settings to use social security rate
    SELECT * INTO hr_settings_record
    FROM public.hr_settings
    WHERE company_id = payroll_record.company_id
    LIMIT 1;
    
    -- Calculate amounts
    gross_amount := payroll_record.basic_salary + COALESCE(payroll_record.allowances, 0) + COALESCE(payroll_record.overtime_amount, 0);
    
    -- Calculate social security if HR settings exist
    social_security_amount := 0;
    IF hr_settings_record.social_security_rate IS NOT NULL THEN
        social_security_amount := gross_amount * (hr_settings_record.social_security_rate / 100);
    END IF;
    
    -- Get appropriate cost center based on employee department or use HR cost center
    SELECT id INTO payroll_cost_center_id
    FROM public.cost_centers
    WHERE company_id = payroll_record.company_id
    AND (
        (payroll_record.department IS NOT NULL AND center_name ILIKE '%' || payroll_record.department || '%') OR
        center_code = 'HR_PAYROLL' OR
        center_code = 'ADMIN'
    )
    AND is_active = true
    ORDER BY 
        CASE 
            WHEN payroll_record.department IS NOT NULL AND center_name ILIKE '%' || payroll_record.department || '%' THEN 1
            WHEN center_code = 'HR_PAYROLL' THEN 2
            WHEN center_code = 'ADMIN' THEN 3
            ELSE 4
        END
    LIMIT 1;
    
    -- Find required accounts
    SELECT id INTO salary_expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'expenses'
    AND (account_name ILIKE '%salary%' OR account_name ILIKE '%راتب%' OR account_name ILIKE '%أجور%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO allowances_expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'expenses'
    AND (account_name ILIKE '%allowance%' OR account_name ILIKE '%بدل%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO overtime_expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'expenses'
    AND (account_name ILIKE '%overtime%' OR account_name ILIKE '%إضافي%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO tax_payable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'liabilities'
    AND (account_name ILIKE '%tax%payable%' OR account_name ILIKE '%ضريبة%مستحقة%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO social_security_payable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'liabilities'
    AND (account_name ILIKE '%social%security%' OR account_name ILIKE '%تأمينات%اجتماعية%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%' OR account_name ILIKE '%نقدية%')
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
        payroll_record.pay_period_end,
        'Payroll Entry - ' || payroll_record.employee.first_name || ' ' || payroll_record.employee.last_name || ' (' || payroll_record.payroll_number || ')',
        'payroll',
        payroll_record.id,
        gross_amount + social_security_amount,
        gross_amount + social_security_amount,
        'draft',
        payroll_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Basic Salary Expense
    IF salary_expense_account_id IS NOT NULL AND payroll_record.basic_salary > 0 THEN
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number,
            line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), journal_entry_id, salary_expense_account_id, payroll_cost_center_id, 1,
            'Basic Salary - ' || payroll_record.employee.first_name || ' ' || payroll_record.employee.last_name,
            payroll_record.basic_salary, 0
        );
    END IF;
    
    -- Debit: Allowances Expense
    IF allowances_expense_account_id IS NOT NULL AND COALESCE(payroll_record.allowances, 0) > 0 THEN
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number,
            line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), journal_entry_id, allowances_expense_account_id, payroll_cost_center_id, 2,
            'Allowances - ' || payroll_record.employee.first_name || ' ' || payroll_record.employee.last_name,
            payroll_record.allowances, 0
        );
    END IF;
    
    -- Debit: Overtime Expense
    IF overtime_expense_account_id IS NOT NULL AND COALESCE(payroll_record.overtime_amount, 0) > 0 THEN
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number,
            line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), journal_entry_id, overtime_expense_account_id, payroll_cost_center_id, 3,
            'Overtime - ' || payroll_record.employee.first_name || ' ' || payroll_record.employee.last_name,
            payroll_record.overtime_amount, 0
        );
    END IF;
    
    -- Debit: Social Security Expense (employer portion)
    IF social_security_payable_account_id IS NOT NULL AND social_security_amount > 0 THEN
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number,
            line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), journal_entry_id, salary_expense_account_id, payroll_cost_center_id, 4,
            'Social Security (Employer) - ' || payroll_record.employee.first_name || ' ' || payroll_record.employee.last_name,
            social_security_amount, 0
        );
    END IF;
    
    -- Credit: Tax Payable
    IF tax_payable_account_id IS NOT NULL AND COALESCE(payroll_record.tax_amount, 0) > 0 THEN
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number,
            line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), journal_entry_id, tax_payable_account_id, payroll_cost_center_id, 10,
            'Tax Payable - ' || payroll_record.employee.first_name || ' ' || payroll_record.employee.last_name,
            0, payroll_record.tax_amount
        );
    END IF;
    
    -- Credit: Social Security Payable
    IF social_security_payable_account_id IS NOT NULL AND social_security_amount > 0 THEN
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number,
            line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), journal_entry_id, social_security_payable_account_id, payroll_cost_center_id, 11,
            'Social Security Payable - ' || payroll_record.employee.first_name || ' ' || payroll_record.employee.last_name,
            0, social_security_amount
        );
    END IF;
    
    -- Credit: Cash/Bank (Net Pay)
    IF cash_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number,
            line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), journal_entry_id, cash_account_id, payroll_cost_center_id, 12,
            'Net Pay - ' || payroll_record.employee.first_name || ' ' || payroll_record.employee.last_name,
            0, payroll_record.net_amount
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$$;