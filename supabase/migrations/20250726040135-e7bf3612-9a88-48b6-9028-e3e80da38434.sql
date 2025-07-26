-- Add missing cost centers to all companies that don't have them
INSERT INTO public.cost_centers (company_id, center_code, center_name, center_name_ar, description, is_active)
SELECT 
    c.id,
    'HR',
    'Human Resources',
    'الموارد البشرية',
    'HR department cost center',
    true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.cost_centers cc 
    WHERE cc.company_id = c.id AND cc.center_code = 'HR'
);

INSERT INTO public.cost_centers (company_id, center_code, center_name, center_name_ar, description, is_active)
SELECT 
    c.id,
    'ADMIN',
    'Administration',
    'الإدارة',
    'Administration cost center',
    true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.cost_centers cc 
    WHERE cc.company_id = c.id AND cc.center_code = 'ADMIN'
);

-- Add salary expense accounts to all companies that don't have them
INSERT INTO public.chart_of_accounts (
    company_id, 
    account_code, 
    account_name, 
    account_name_ar, 
    account_type, 
    account_subtype,
    balance_type,
    account_level,
    is_active
)
SELECT 
    c.id,
    '6010',
    'Salary Expense',
    'مصروف الرواتب',
    'expenses',
    'operating_expenses',
    'debit',
    2,
    true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts coa 
    WHERE coa.company_id = c.id AND coa.account_code = '6010'
);

-- Add accounts payable if missing
INSERT INTO public.chart_of_accounts (
    company_id, 
    account_code, 
    account_name, 
    account_name_ar, 
    account_type, 
    account_subtype,
    balance_type,
    account_level,
    is_active
)
SELECT 
    c.id,
    '2010',
    'Accounts Payable',
    'حسابات دائنة',
    'liabilities',
    'current_liabilities',
    'credit',
    2,
    true
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts coa 
    WHERE coa.company_id = c.id AND coa.account_code = '2010'
);

-- Fix the create_payroll_journal_entry function to use correct table name 'payroll'
CREATE OR REPLACE FUNCTION public.create_payroll_journal_entry(payroll_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    payroll_record record;
    journal_entry_id uuid;
    salary_expense_account_id uuid;
    payable_account_id uuid;
    hr_cost_center_id uuid;
BEGIN
    -- Get payroll details from correct table 'payroll' (not 'payroll_records')
    SELECT * INTO payroll_record
    FROM public.payroll
    WHERE id = payroll_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll record not found';
    END IF;
    
    -- Get HR cost center
    SELECT id INTO hr_cost_center_id
    FROM public.cost_centers
    WHERE company_id = payroll_record.company_id
    AND center_code = 'HR'
    AND is_active = true
    LIMIT 1;
    
    -- If HR cost center not found, use admin
    IF hr_cost_center_id IS NULL THEN
        SELECT id INTO hr_cost_center_id
        FROM public.cost_centers
        WHERE company_id = payroll_record.company_id
        AND center_code = 'ADMIN'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Find required accounts
    SELECT id INTO salary_expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'expenses'
    AND (account_name ILIKE '%salary%' OR account_name ILIKE '%wage%' OR account_name ILIKE '%payroll%' OR account_code = '6010')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO payable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'liabilities'
    AND (account_name ILIKE '%payable%' OR account_name ILIKE '%accrued%' OR account_code = '2010')
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
        'Payroll #' || payroll_record.payroll_number || ' - Employee ID: ' || payroll_record.employee_id,
        'payroll',
        payroll_record.id,
        payroll_record.net_amount,
        payroll_record.net_amount,
        'draft',
        payroll_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
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
            payroll_record.net_amount,
            0
        );
    END IF;
    
    -- Credit: Accounts Payable
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
            hr_cost_center_id,
            2,
            'Accounts Payable - Payroll #' || payroll_record.payroll_number,
            0,
            payroll_record.net_amount
        );
    END IF;
    
    -- Update payroll record with journal entry reference (correct table name)
    UPDATE public.payroll
    SET journal_entry_id = journal_entry_id
    WHERE id = payroll_id_param;
    
    RETURN journal_entry_id;
END;
$function$;