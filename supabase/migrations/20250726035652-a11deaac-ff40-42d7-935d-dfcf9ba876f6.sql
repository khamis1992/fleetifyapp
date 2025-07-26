-- Fix the generate_journal_entry_number function to match expected signature
DROP FUNCTION IF EXISTS public.generate_journal_entry_number(uuid);

CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Create the missing create_payroll_journal_entry function
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
    -- Get payroll details
    SELECT * INTO payroll_record
    FROM public.payroll_records
    WHERE id = payroll_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll record not found';
    END IF;
    
    -- Get HR cost center
    SELECT id INTO hr_cost_center_id
    FROM public.cost_centers
    WHERE company_id = (SELECT company_id FROM employees WHERE id = payroll_record.employee_id)
    AND center_code = 'HR'
    AND is_active = true
    LIMIT 1;
    
    -- If HR cost center not found, use admin
    IF hr_cost_center_id IS NULL THEN
        SELECT id INTO hr_cost_center_id
        FROM public.cost_centers
        WHERE company_id = (SELECT company_id FROM employees WHERE id = payroll_record.employee_id)
        AND center_code = 'ADMIN'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Find required accounts
    SELECT id INTO salary_expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = (SELECT company_id FROM employees WHERE id = payroll_record.employee_id)
    AND account_type = 'expenses'
    AND (account_name ILIKE '%salary%' OR account_name ILIKE '%wage%' OR account_name ILIKE '%payroll%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO payable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = (SELECT company_id FROM employees WHERE id = payroll_record.employee_id)
    AND account_type = 'liabilities'
    AND (account_name ILIKE '%payable%' OR account_name ILIKE '%accrued%')
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
        (SELECT company_id FROM employees WHERE id = payroll_record.employee_id),
        generate_journal_entry_number((SELECT company_id FROM employees WHERE id = payroll_record.employee_id)),
        payroll_record.payroll_date,
        'Payroll #' || payroll_record.payroll_number || ' - ' || (SELECT first_name || ' ' || last_name FROM employees WHERE id = payroll_record.employee_id),
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
    
    -- Update payroll record with journal entry reference
    UPDATE public.payroll_records
    SET journal_entry_id = journal_entry_id
    WHERE id = payroll_id_param;
    
    RETURN journal_entry_id;
END;
$function$;