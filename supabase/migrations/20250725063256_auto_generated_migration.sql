-- Create contracts table
CREATE TABLE public.contracts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    contract_number VARCHAR NOT NULL,
    contract_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    contract_amount NUMERIC NOT NULL DEFAULT 0,
    monthly_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    contract_type TEXT NOT NULL DEFAULT 'rental',
    vehicle_id UUID,
    description TEXT,
    terms TEXT,
    journal_entry_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Create policies for contracts
CREATE POLICY "Staff can manage contracts in their company" 
ON public.contracts 
FOR ALL 
USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role) OR 
     has_role(auth.uid(), 'sales_agent'::user_role))
);

CREATE POLICY "Users can view contracts in their company" 
ON public.contracts 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Create penalties table
CREATE TABLE public.penalties (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    contract_id UUID,
    penalty_number VARCHAR NOT NULL,
    penalty_date DATE NOT NULL,
    penalty_type TEXT NOT NULL DEFAULT 'late_payment',
    amount NUMERIC NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    reason_ar TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    paid_amount NUMERIC DEFAULT 0,
    balance_due NUMERIC DEFAULT 0,
    due_date DATE,
    journal_entry_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

-- Create policies for penalties
CREATE POLICY "Staff can manage penalties in their company" 
ON public.penalties 
FOR ALL 
USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role) OR 
     has_role(auth.uid(), 'sales_agent'::user_role))
);

CREATE POLICY "Users can view penalties in their company" 
ON public.penalties 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Create payroll table
CREATE TABLE public.payroll (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    payroll_number VARCHAR NOT NULL,
    payroll_date DATE NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    basic_salary NUMERIC NOT NULL DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    overtime_amount NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    net_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    payment_method TEXT DEFAULT 'bank_transfer',
    bank_account TEXT,
    notes TEXT,
    journal_entry_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- Create policies for payroll
CREATE POLICY "Admins can manage payroll in their company" 
ON public.payroll 
FOR ALL 
USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role))
);

CREATE POLICY "Users can view payroll in their company" 
ON public.payroll 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Create function to automatically create journal entry for contract
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            accrued_revenue_account_id,
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
$$;

-- Create function to automatically create journal entry for penalty
CREATE OR REPLACE FUNCTION public.create_penalty_journal_entry(penalty_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    penalty_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    other_income_account_id uuid;
BEGIN
    -- Get penalty details
    SELECT * INTO penalty_record
    FROM public.penalties
    WHERE id = penalty_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Penalty not found';
    END IF;
    
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
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            other_income_account_id,
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
$$;

-- Create function to automatically create journal entry for payroll
CREATE OR REPLACE FUNCTION public.create_payroll_journal_entry(payroll_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    payroll_record record;
    journal_entry_id uuid;
    salary_expense_account_id uuid;
    tax_payable_account_id uuid;
    cash_account_id uuid;
    employee_payable_account_id uuid;
BEGIN
    -- Get payroll details
    SELECT * INTO payroll_record
    FROM public.payroll
    WHERE id = payroll_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll not found';
    END IF;
    
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
    
    -- Create journal entry lines
    -- Debit: Salary Expense
    IF salary_expense_account_id IS NOT NULL THEN
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
            salary_expense_account_id,
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
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            tax_payable_account_id,
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
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            cash_account_id,
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
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            employee_payable_account_id,
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
$$;

-- Create trigger handlers
CREATE OR REPLACE FUNCTION public.handle_contract_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    -- Create journal entry when contract status changes to 'active'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'active' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_contract_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status = 'active' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_contract_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_penalty_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    -- Create journal entry when penalty status changes to 'confirmed'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'confirmed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_penalty_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status = 'confirmed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_penalty_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_payroll_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    -- Create journal entry when payroll status changes to 'paid'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'paid' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_payroll_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status = 'paid' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_payroll_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS contract_auto_journal_trigger ON public.contracts;
CREATE TRIGGER contract_auto_journal_trigger
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_contract_changes();

DROP TRIGGER IF EXISTS penalty_auto_journal_trigger ON public.penalties;
CREATE TRIGGER penalty_auto_journal_trigger
    BEFORE INSERT OR UPDATE ON public.penalties
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_penalty_changes();

DROP TRIGGER IF EXISTS payroll_auto_journal_trigger ON public.payroll;
CREATE TRIGGER payroll_auto_journal_trigger
    BEFORE INSERT OR UPDATE ON public.payroll
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payroll_changes();

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_penalties_updated_at
    BEFORE UPDATE ON public.penalties
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_updated_at
    BEFORE UPDATE ON public.payroll
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();