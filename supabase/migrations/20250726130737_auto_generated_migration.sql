-- Fix the create_payroll_journal_entry function to correctly reference employee names
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
    cash_account_id uuid;
    hr_cost_center_id uuid;
BEGIN
    -- Get payroll details with employee information
    SELECT 
        p.*,
        e.first_name,
        e.last_name,
        e.first_name_ar,
        e.last_name_ar
    INTO payroll_record
    FROM public.payroll p
    JOIN public.employees e ON p.employee_id = e.id
    WHERE p.id = payroll_id_param;
    
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
    
    -- If HR cost center not found, use ADMIN
    IF hr_cost_center_id IS NULL THEN
        SELECT id INTO hr_cost_center_id
        FROM public.cost_centers
        WHERE company_id = payroll_record.company_id
        AND center_code = 'ADMIN'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Find salary expense account
    SELECT id INTO salary_expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'expenses'
    AND (account_name ILIKE '%salary%' OR account_name ILIKE '%payroll%' OR account_name ILIKE '%راتب%')
    AND is_active = true
    LIMIT 1;
    
    -- If no specific salary account, use general expenses
    IF salary_expense_account_id IS NULL THEN
        SELECT id INTO salary_expense_account_id
        FROM public.chart_of_accounts
        WHERE company_id = payroll_record.company_id
        AND account_type = 'expenses'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Find cash/bank account
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%')
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
        'Payroll #' || payroll_record.payroll_number || ' - ' || payroll_record.first_name || ' ' || payroll_record.last_name,
        'payroll',
        payroll_record.id,
        payroll_record.net_pay,
        payroll_record.net_pay,
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
            'Salary Expense - ' || payroll_record.first_name || ' ' || payroll_record.last_name,
            payroll_record.net_pay,
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
            hr_cost_center_id,
            2,
            'Cash Payment - ' || payroll_record.first_name || ' ' || payroll_record.last_name,
            0,
            payroll_record.net_pay
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;