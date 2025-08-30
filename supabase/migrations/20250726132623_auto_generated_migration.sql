-- Fix the create_payroll_journal_entry function to use correct field names
CREATE OR REPLACE FUNCTION public.create_payroll_journal_entry(payroll_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    payroll_record record;
    employee_record record;
    journal_entry_id uuid;
    salary_expense_account_id uuid;
    payable_account_id uuid;
    tax_payable_account_id uuid;
    social_security_payable_account_id uuid;
    hr_cost_center_id uuid;
    calculated_gross_pay numeric;
    calculated_social_security numeric;
BEGIN
    -- Get payroll details
    SELECT * INTO payroll_record
    FROM public.payroll
    WHERE id = payroll_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll record not found';
    END IF;
    
    -- Get employee details
    SELECT * INTO employee_record
    FROM public.employees
    WHERE id = payroll_record.employee_id;
    
    -- Calculate gross pay from basic salary, allowances, and overtime
    calculated_gross_pay := COALESCE(payroll_record.basic_salary, 0) + 
                           COALESCE(payroll_record.allowances, 0) + 
                           COALESCE(payroll_record.overtime_amount, 0);
    
    -- Calculate social security from deductions and tax
    calculated_social_security := COALESCE(payroll_record.deductions, 0) + 
                                 COALESCE(payroll_record.tax_amount, 0);
    
    -- Get HR cost center
    SELECT id INTO hr_cost_center_id
    FROM public.cost_centers
    WHERE company_id = payroll_record.company_id
    AND center_code = 'HR'
    AND is_active = true
    LIMIT 1;
    
    -- If no HR cost center, use ADMIN
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
    AND (account_name ILIKE '%salary%' OR account_name ILIKE '%wage%' OR account_name ILIKE '%راتب%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO payable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'liabilities'
    AND (account_name ILIKE '%payable%' OR account_name ILIKE '%مستحق%')
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
        public.generate_journal_entry_number(payroll_record.company_id),
        payroll_record.pay_date,
        'Payroll Entry #' || payroll_record.payroll_number || ' - ' || employee_record.first_name || ' ' || employee_record.last_name,
        'payroll',
        payroll_record.id,
        calculated_gross_pay,
        calculated_gross_pay,
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
            'Salary Expense - ' || employee_record.first_name || ' ' || employee_record.last_name,
            calculated_gross_pay,
            0
        );
    END IF;
    
    -- Credit: Net Pay to Payable
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
            'Net Pay Payable - ' || employee_record.first_name || ' ' || employee_record.last_name,
            0,
            COALESCE(payroll_record.net_amount, 0)
        );
    END IF;
    
    -- Credit: Tax Payable (if tax amount > 0)
    IF tax_payable_account_id IS NOT NULL AND COALESCE(payroll_record.tax_amount, 0) > 0 THEN
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
            'Tax Payable - ' || employee_record.first_name || ' ' || employee_record.last_name,
            0,
            COALESCE(payroll_record.tax_amount, 0)
        );
    END IF;
    
    -- Credit: Social Security Payable (if deductions > 0)
    IF social_security_payable_account_id IS NOT NULL AND COALESCE(payroll_record.deductions, 0) > 0 THEN
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
            'Social Security Payable - ' || employee_record.first_name || ' ' || employee_record.last_name,
            0,
            COALESCE(payroll_record.deductions, 0)
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- Create the generate_journal_entry_number function if it doesn't exist
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
    -- Count existing journal entries for the company in current year
    SELECT COUNT(*) INTO entry_count
    FROM public.journal_entries
    WHERE company_id = company_id_param
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Generate entry number
    entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((entry_count + 1)::TEXT, 6, '0');
    
    RETURN entry_number;
END;
$function$;