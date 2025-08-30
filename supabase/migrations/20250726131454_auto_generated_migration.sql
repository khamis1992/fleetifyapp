-- Fix the payroll journal entry function to use correct field names and improve logic
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
    tax_payable_account_id uuid;
    social_security_payable_account_id uuid;
    hr_cost_center_id uuid;
BEGIN
    -- Get payroll details
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
    
    -- If HR cost center not found, use ADMIN
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
    AND (account_name ILIKE '%salary%' OR account_name ILIKE '%payroll%' OR account_name ILIKE '%راتب%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%' OR account_name ILIKE '%نقدية%')
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
    AND (account_name ILIKE '%social%security%' OR account_name ILIKE '%تأمين%اجتماعي%')
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
        'Payroll Entry #' || payroll_record.payroll_number || ' - ' || payroll_record.pay_period_start || ' to ' || payroll_record.pay_period_end,
        'payroll',
        payroll_record.id,
        payroll_record.gross_pay,
        payroll_record.gross_pay,
        'draft',
        payroll_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Salary Expense (Gross Pay)
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
            payroll_record.gross_pay,
            0
        );
    END IF;
    
    -- Credit: Cash/Bank (Net Amount)
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
            'Cash Paid - Payroll #' || payroll_record.payroll_number,
            0,
            payroll_record.net_amount
        );
    END IF;
    
    -- Credit: Tax Payable (if any tax deductions)
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
            3,
            'Tax Withheld - Payroll #' || payroll_record.payroll_number,
            0,
            payroll_record.tax_amount
        );
    END IF;
    
    -- Credit: Social Security Payable (if any social security deductions)
    IF social_security_payable_account_id IS NOT NULL AND payroll_record.social_security_amount > 0 THEN
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
            social_security_payable_account_id,
            hr_cost_center_id,
            4,
            'Social Security Withheld - Payroll #' || payroll_record.payroll_number,
            0,
            payroll_record.social_security_amount
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- Ensure the generate_journal_entry_number function exists
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(company_id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    entry_count INTEGER;
    entry_number TEXT;
BEGIN
    -- Count existing journal entries for the company
    SELECT COUNT(*) INTO entry_count
    FROM public.journal_entries
    WHERE company_id = company_id_param;
    
    -- Generate entry number
    entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((entry_count + 1)::TEXT, 6, '0');
    
    RETURN entry_number;
END;
$function$;