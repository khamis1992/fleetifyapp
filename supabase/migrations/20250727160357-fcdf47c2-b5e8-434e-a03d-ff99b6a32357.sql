-- إنشاء دوال التكامل المالي المتقدم

-- 1. دالة توليد رقم القيد اليومي
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
    -- حساب عدد القيود للشركة
    SELECT COUNT(*) INTO entry_count
    FROM public.journal_entries
    WHERE company_id = company_id_param;
    
    -- توليد رقم القيد
    entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((entry_count + 1)::TEXT, 6, '0');
    
    RETURN entry_number;
END;
$function$

-- 2. دالة إنشاء قيد الفاتورة
CREATE OR REPLACE FUNCTION public.create_invoice_journal_entry(invoice_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    invoice_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    revenue_account_id uuid;
    sales_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل الفاتورة
    SELECT * INTO invoice_record
    FROM public.invoices
    WHERE id = invoice_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- الحصول على مركز تكلفة المبيعات
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = invoice_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- العثور على الحسابات المطلوبة
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = invoice_record.company_id
    AND account_type = 'assets'
    AND account_name ILIKE '%receivable%'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = invoice_record.company_id
    AND account_type = 'revenue'
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء القيد اليومي
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
        'Invoice #' || invoice_record.invoice_number,
        'invoice',
        invoice_record.id,
        invoice_record.total_amount,
        invoice_record.total_amount,
        'draft',
        invoice_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد
    -- مدين: حسابات العملاء
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
    
    -- دائن: الإيرادات
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
            'Sales Revenue - Invoice #' || invoice_record.invoice_number,
            0,
            invoice_record.total_amount
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$

-- 3. دالة إنشاء قيد العقد
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    revenue_account_id uuid;
    sales_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل العقد
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found';
    END IF;
    
    -- الحصول على مركز تكلفة المبيعات
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = contract_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- العثور على الحسابات المطلوبة
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'assets'
    AND account_name ILIKE '%receivable%'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'revenue'
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء القيد اليومي
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
    
    -- إنشاء بنود القيد
    -- مدين: حسابات العملاء
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
            'Accounts Receivable - Contract #' || contract_record.contract_number,
            contract_record.contract_amount,
            0
        );
    END IF;
    
    -- دائن: الإيرادات
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
            'Contract Revenue - Contract #' || contract_record.contract_number,
            0,
            contract_record.contract_amount
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$

-- 4. دالة إنشاء قيد المخالفة المرورية
CREATE OR REPLACE FUNCTION public.create_penalty_journal_entry(penalty_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    penalty_record record;
    journal_entry_id uuid;
    expense_account_id uuid;
    payable_account_id uuid;
    fleet_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل المخالفة
    SELECT * INTO penalty_record
    FROM public.traffic_violations
    WHERE id = penalty_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Traffic violation not found';
    END IF;
    
    -- الحصول على مركز تكلفة الأسطول
    SELECT id INTO fleet_cost_center_id
    FROM public.cost_centers
    WHERE company_id = penalty_record.company_id
    AND center_code = 'FLEET'
    AND is_active = true
    LIMIT 1;
    
    -- العثور على الحسابات المطلوبة
    SELECT id INTO expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = penalty_record.company_id
    AND account_type = 'expenses'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO payable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = penalty_record.company_id
    AND account_type = 'liabilities'
    AND account_name ILIKE '%payable%'
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء القيد اليومي
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
        penalty_record.violation_date,
        'Traffic Violation #' || penalty_record.violation_number,
        'traffic_violation',
        penalty_record.id,
        penalty_record.fine_amount,
        penalty_record.fine_amount,
        'draft',
        penalty_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد
    -- مدين: المصروفات
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
            fleet_cost_center_id,
            1,
            'Traffic Violation Expense - #' || penalty_record.violation_number,
            penalty_record.fine_amount,
            0
        );
    END IF;
    
    -- دائن: حسابات الدائنين
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
            fleet_cost_center_id,
            2,
            'Accounts Payable - Traffic Violation #' || penalty_record.violation_number,
            0,
            penalty_record.fine_amount
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$

-- 5. دالة إنشاء قيد الرواتب
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
    allowance_expense_account_id uuid;
    deduction_account_id uuid;
    cash_account_id uuid;
    hr_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل الراتب
    SELECT * INTO payroll_record
    FROM public.payroll
    WHERE id = payroll_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll not found';
    END IF;
    
    -- الحصول على مركز تكلفة الموارد البشرية
    SELECT id INTO hr_cost_center_id
    FROM public.cost_centers
    WHERE company_id = payroll_record.company_id
    AND center_code = 'HR'
    AND is_active = true
    LIMIT 1;
    
    -- العثور على الحسابات المطلوبة
    SELECT id INTO salary_expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'expenses'
    AND (account_name ILIKE '%salary%' OR account_name ILIKE '%wage%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payroll_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%')
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء القيد اليومي
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
        payroll_record.pay_date,
        'Payroll for ' || TO_CHAR(payroll_record.pay_period_start, 'MM/YYYY'),
        'payroll',
        payroll_record.id,
        payroll_record.net_salary,
        payroll_record.net_salary,
        'draft',
        payroll_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد
    -- مدين: مصروفات الرواتب
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
            'Salary Expense - ' || TO_CHAR(payroll_record.pay_period_start, 'MM/YYYY'),
            payroll_record.net_salary,
            0
        );
    END IF;
    
    -- دائن: النقدية
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
            'Cash Payment - Payroll ' || TO_CHAR(payroll_record.pay_period_start, 'MM/YYYY'),
            0,
            payroll_record.net_salary
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$

-- 6. دالة إنشاء قيد الصيانة
CREATE OR REPLACE FUNCTION public.create_maintenance_journal_entry(maintenance_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    maintenance_record record;
    journal_entry_id uuid;
    maintenance_expense_account_id uuid;
    cash_account_id uuid;
    fleet_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل الصيانة
    SELECT * INTO maintenance_record
    FROM public.vehicle_maintenance
    WHERE id = maintenance_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance record not found';
    END IF;
    
    -- الحصول على مركز تكلفة الأسطول
    SELECT id INTO fleet_cost_center_id
    FROM public.cost_centers
    WHERE company_id = maintenance_record.company_id
    AND center_code = 'FLEET'
    AND is_active = true
    LIMIT 1;
    
    -- العثور على الحسابات المطلوبة
    SELECT id INTO maintenance_expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = maintenance_record.company_id
    AND account_type = 'expenses'
    AND (account_name ILIKE '%maintenance%' OR account_name ILIKE '%repair%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = maintenance_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%')
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء القيد اليومي
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
        maintenance_record.company_id,
        generate_journal_entry_number(maintenance_record.company_id),
        maintenance_record.maintenance_date,
        'Vehicle Maintenance #' || maintenance_record.maintenance_number,
        'vehicle_maintenance',
        maintenance_record.id,
        COALESCE(maintenance_record.actual_cost, maintenance_record.estimated_cost),
        COALESCE(maintenance_record.actual_cost, maintenance_record.estimated_cost),
        'draft',
        maintenance_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد
    -- مدين: مصروفات الصيانة
    IF maintenance_expense_account_id IS NOT NULL THEN
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
            maintenance_expense_account_id,
            fleet_cost_center_id,
            1,
            'Vehicle Maintenance - #' || maintenance_record.maintenance_number,
            COALESCE(maintenance_record.actual_cost, maintenance_record.estimated_cost),
            0
        );
    END IF;
    
    -- دائن: النقدية
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
            fleet_cost_center_id,
            2,
            'Cash Payment - Maintenance #' || maintenance_record.maintenance_number,
            0,
            COALESCE(maintenance_record.actual_cost, maintenance_record.estimated_cost)
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$

-- 7. دالة إنشاء قيد الإهلاك
CREATE OR REPLACE FUNCTION public.create_depreciation_journal_entry(asset_id_param uuid, depreciation_amount_param numeric, depreciation_date_param date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    asset_record record;
    journal_entry_id uuid;
    depreciation_expense_account_id uuid;
    accumulated_depreciation_account_id uuid;
    admin_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل الأصل
    SELECT * INTO asset_record
    FROM public.fixed_assets
    WHERE id = asset_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fixed asset not found';
    END IF;
    
    -- الحصول على مركز التكلفة الإداري
    SELECT id INTO admin_cost_center_id
    FROM public.cost_centers
    WHERE company_id = asset_record.company_id
    AND center_code = 'ADMIN'
    AND is_active = true
    LIMIT 1;
    
    -- العثور على الحسابات المطلوبة
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
    
    -- إنشاء القيد اليومي
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
        asset_record.company_id,
        generate_journal_entry_number(asset_record.company_id),
        depreciation_date_param,
        'Monthly Depreciation - ' || asset_record.asset_name,
        'depreciation',
        asset_record.id,
        depreciation_amount_param,
        depreciation_amount_param,
        'draft',
        auth.uid()
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد
    -- مدين: مصروفات الإهلاك
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
            admin_cost_center_id,
            1,
            'Depreciation Expense - ' || asset_record.asset_name,
            depreciation_amount_param,
            0
        );
    END IF;
    
    -- دائن: مجمع الإهلاك
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
            admin_cost_center_id,
            2,
            'Accumulated Depreciation - ' || asset_record.asset_name,
            0,
            depreciation_amount_param
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$

-- 8. دالة إنشاء قيد المعاملة البنكية
CREATE OR REPLACE FUNCTION public.create_bank_transaction_journal_entry(transaction_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    transaction_record record;
    journal_entry_id uuid;
    bank_account_id uuid;
    counterpart_account_id uuid;
    finance_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل المعاملة البنكية
    SELECT * INTO transaction_record
    FROM public.bank_transactions
    WHERE id = transaction_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bank transaction not found';
    END IF;
    
    -- الحصول على مركز تكلفة المالية
    SELECT id INTO finance_cost_center_id
    FROM public.cost_centers
    WHERE company_id = transaction_record.company_id
    AND center_code = 'FINANCE'
    AND is_active = true
    LIMIT 1;
    
    -- العثور على حساب البنك
    SELECT coa.id INTO bank_account_id
    FROM public.chart_of_accounts coa
    JOIN public.banks b ON b.account_number = coa.account_code
    WHERE coa.company_id = transaction_record.company_id
    AND b.id = transaction_record.bank_id
    AND coa.is_active = true
    LIMIT 1;
    
    -- تحديد الحساب المقابل حسب نوع المعاملة
    IF transaction_record.transaction_type = 'deposit' THEN
        SELECT id INTO counterpart_account_id
        FROM public.chart_of_accounts
        WHERE company_id = transaction_record.company_id
        AND account_type = 'revenue'
        AND is_active = true
        LIMIT 1;
    ELSE
        SELECT id INTO counterpart_account_id
        FROM public.chart_of_accounts
        WHERE company_id = transaction_record.company_id
        AND account_type = 'expenses'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- إنشاء القيد اليومي
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
        'Bank Transaction #' || transaction_record.transaction_number,
        'bank_transaction',
        transaction_record.id,
        transaction_record.amount,
        transaction_record.amount,
        'draft',
        transaction_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد
    IF transaction_record.transaction_type = 'deposit' THEN
        -- إيداع: مدين البنك، دائن الإيرادات
        IF bank_account_id IS NOT NULL THEN
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
                bank_account_id,
                finance_cost_center_id,
                1,
                'Bank Deposit - #' || transaction_record.transaction_number,
                transaction_record.amount,
                0
            );
        END IF;
        
        IF counterpart_account_id IS NOT NULL THEN
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
                counterpart_account_id,
                finance_cost_center_id,
                2,
                'Revenue - Bank Deposit #' || transaction_record.transaction_number,
                0,
                transaction_record.amount
            );
        END IF;
    ELSE
        -- سحب: مدين المصروفات، دائن البنك
        IF counterpart_account_id IS NOT NULL THEN
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
                counterpart_account_id,
                finance_cost_center_id,
                1,
                'Expense - Bank Withdrawal #' || transaction_record.transaction_number,
                transaction_record.amount,
                0
            );
        END IF;
        
        IF bank_account_id IS NOT NULL THEN
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
                bank_account_id,
                finance_cost_center_id,
                2,
                'Bank Withdrawal - #' || transaction_record.transaction_number,
                0,
                transaction_record.amount
            );
        END IF;
    END IF;
    
    RETURN journal_entry_id;
END;
$function$

-- 9. دالة إنشاء قيد دفعة المخالفة المرورية
CREATE OR REPLACE FUNCTION public.create_traffic_payment_journal_entry(payment_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    payment_record record;
    journal_entry_id uuid;
    cash_account_id uuid;
    payable_account_id uuid;
    fleet_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل الدفعة
    SELECT * INTO payment_record
    FROM public.traffic_violation_payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Traffic violation payment not found';
    END IF;
    
    -- الحصول على مركز تكلفة الأسطول
    SELECT id INTO fleet_cost_center_id
    FROM public.cost_centers
    WHERE company_id = payment_record.company_id
    AND center_code = 'FLEET'
    AND is_active = true
    LIMIT 1;
    
    -- العثور على الحسابات المطلوبة
    SELECT id INTO payable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'liabilities'
    AND account_name ILIKE '%payable%'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%')
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء القيد اليومي
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
        'Traffic Violation Payment #' || payment_record.payment_number,
        'traffic_payment',
        payment_record.id,
        payment_record.amount_paid,
        payment_record.amount_paid,
        'draft',
        payment_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد
    -- مدين: حسابات الدائنين (لتقليل الالتزام)
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
            fleet_cost_center_id,
            1,
            'Accounts Payable - Payment #' || payment_record.payment_number,
            payment_record.amount_paid,
            0
        );
    END IF;
    
    -- دائن: النقدية
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
            fleet_cost_center_id,
            2,
            'Cash Payment - Traffic Violation #' || payment_record.payment_number,
            0,
            payment_record.amount_paid
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$

-- 10. إنشاء المحفزات (Triggers) للتكامل التلقائي

-- محفز للمدفوعات
CREATE OR REPLACE FUNCTION public.handle_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Create journal entry when payment status changes to 'completed'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_payment_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_payment_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$

-- محفز للصيانة
CREATE OR REPLACE FUNCTION public.handle_maintenance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Create journal entry when maintenance status changes to 'completed'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_maintenance_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_maintenance_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$

-- محفز لدفعات المخالفات المرورية
CREATE OR REPLACE FUNCTION public.handle_traffic_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Create journal entry when payment status changes to 'paid'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'paid' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_traffic_payment_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status = 'paid' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_traffic_payment_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$

-- تطبيق المحفزات على الجداول

-- محفز للمدفوعات
DROP TRIGGER IF EXISTS trigger_payment_journal_entry ON public.payments;
CREATE TRIGGER trigger_payment_journal_entry
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_changes();

-- محفز للصيانة
DROP TRIGGER IF EXISTS trigger_maintenance_journal_entry ON public.vehicle_maintenance;
CREATE TRIGGER trigger_maintenance_journal_entry
    BEFORE INSERT OR UPDATE ON public.vehicle_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_maintenance_changes();

-- محفز لدفعات المخالفات المرورية
DROP TRIGGER IF EXISTS trigger_traffic_payment_journal_entry ON public.traffic_violation_payments;
CREATE TRIGGER trigger_traffic_payment_journal_entry
    BEFORE INSERT OR UPDATE ON public.traffic_violation_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_traffic_payment_changes();