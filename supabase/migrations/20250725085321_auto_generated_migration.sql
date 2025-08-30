-- تحديث دالة إنشاء قيود العقود لربطها بمراكز التكلفة المناسبة
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
    selected_cost_center_id uuid;
    contract_duration_days integer;
BEGIN
    -- الحصول على تفاصيل العقد
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found';
    END IF;
    
    -- حساب مدة العقد بالأيام
    contract_duration_days := contract_record.end_date - contract_record.start_date + 1;
    
    -- تحديد مركز التكلفة بناءً على نوع العقد
    IF contract_duration_days <= 7 THEN
        -- عقد يومي أو أسبوعي - استخدم مركز تكلفة الإيجار اليومي
        SELECT id INTO selected_cost_center_id
        FROM public.cost_centers
        WHERE company_id = contract_record.company_id
        AND center_code = 'DAILY_RENTAL'
        AND is_active = true
        LIMIT 1;
    ELSIF contract_duration_days >= 28 THEN
        -- عقد شهري أو أطول - استخدم مركز تكلفة الإيجار الشهري
        SELECT id INTO selected_cost_center_id
        FROM public.cost_centers
        WHERE company_id = contract_record.company_id
        AND center_code = 'MONTHLY_RENTAL'
        AND is_active = true
        LIMIT 1;
    ELSE
        -- عقد متوسط المدة - استخدم مركز المبيعات
        SELECT id INTO selected_cost_center_id
        FROM public.cost_centers
        WHERE company_id = contract_record.company_id
        AND center_code = 'SALES'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- في حالة عدم العثور على مركز تكلفة محدد، استخدم المبيعات
    IF selected_cost_center_id IS NULL THEN
        SELECT id INTO selected_cost_center_id
        FROM public.cost_centers
        WHERE company_id = contract_record.company_id
        AND center_code = 'SALES'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- العثور على الحسابات المطلوبة
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
        'Contract #' || contract_record.contract_number || ' (' || contract_duration_days || ' days)',
        'contract',
        contract_record.id,
        contract_record.contract_amount,
        contract_record.contract_amount,
        'draft',
        contract_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد مع مركز التكلفة المحدد
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
            selected_cost_center_id,
            1,
            'Accounts Receivable - Contract #' || contract_record.contract_number,
            contract_record.contract_amount,
            0
        );
    END IF;
    
    -- دائن: الإيرادات المستحقة
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
            selected_cost_center_id,
            2,
            'Revenue - Contract #' || contract_record.contract_number,
            0,
            contract_record.contract_amount
        );
    END IF;
    
    -- تحديث العقد بمرجع القيد
    UPDATE public.contracts
    SET journal_entry_id = journal_entry_id
    WHERE id = contract_id_param;
    
    RETURN journal_entry_id;
END;
$function$;

-- تحديث دالة إنشاء قيود المرتبات لربطها بمركز تكلفة المرتبات والأجور
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
    payroll_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل المرتب
    SELECT * INTO payroll_record
    FROM public.payroll
    WHERE id = payroll_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payroll not found';
    END IF;
    
    -- الحصول على مركز تكلفة المرتبات والأجور
    SELECT id INTO payroll_cost_center_id
    FROM public.cost_centers
    WHERE company_id = payroll_record.company_id
    AND center_code = 'PAYROLL_WAGES'
    AND is_active = true
    LIMIT 1;
    
    -- في حالة عدم وجوده، استخدم مركز الموارد البشرية
    IF payroll_cost_center_id IS NULL THEN
        SELECT id INTO payroll_cost_center_id
        FROM public.cost_centers
        WHERE company_id = payroll_record.company_id
        AND center_code = 'HR'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- العثور على الحسابات المطلوبة
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
        payroll_record.payroll_date,
        'Payroll #' || payroll_record.payroll_number,
        'payroll',
        payroll_record.id,
        payroll_record.basic_salary + COALESCE(payroll_record.allowances, 0) + COALESCE(payroll_record.overtime_amount, 0),
        payroll_record.basic_salary + COALESCE(payroll_record.allowances, 0) + COALESCE(payroll_record.overtime_amount, 0),
        'draft',
        payroll_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد مع مركز تكلفة المرتبات
    -- مدين: مصروفات المرتبات
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
            payroll_cost_center_id,
            1,
            'Salary Expense - Payroll #' || payroll_record.payroll_number,
            payroll_record.basic_salary + COALESCE(payroll_record.allowances, 0) + COALESCE(payroll_record.overtime_amount, 0),
            0
        );
    END IF;
    
    -- دائن: الضرائب المستحقة (إن وجدت)
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
            payroll_cost_center_id,
            2,
            'Tax Payable - Payroll #' || payroll_record.payroll_number,
            0,
            payroll_record.tax_amount
        );
    END IF;
    
    -- دائن: النقدية/البنك للمبلغ الصافي
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
            payroll_cost_center_id,
            3,
            'Cash paid - Payroll #' || payroll_record.payroll_number,
            0,
            payroll_record.net_amount
        );
    END IF;
    
    -- دائن: مستحقات الموظفين للخصومات (إن وجدت)
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
            payroll_cost_center_id,
            4,
            'Employee Deductions - Payroll #' || payroll_record.payroll_number,
            0,
            payroll_record.deductions
        );
    END IF;
    
    -- تحديث المرتب بمرجع القيد
    UPDATE public.payroll
    SET journal_entry_id = journal_entry_id
    WHERE id = payroll_id_param;
    
    RETURN journal_entry_id;
END;
$function$;

-- تحديث دالة إنشاء قيود الغرامات لربطها بمركز تكلفة الغرامات والمخالفات
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
    penalty_income_account_id uuid;
    penalties_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل الغرامة
    SELECT * INTO penalty_record
    FROM public.penalties
    WHERE id = penalty_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Penalty not found';
    END IF;
    
    -- الحصول على مركز تكلفة الغرامات والمخالفات
    SELECT id INTO penalties_cost_center_id
    FROM public.cost_centers
    WHERE company_id = penalty_record.company_id
    AND center_code = 'PENALTIES_FINES'
    AND is_active = true
    LIMIT 1;
    
    -- في حالة عدم وجوده، استخدم مركز المبيعات
    IF penalties_cost_center_id IS NULL THEN
        SELECT id INTO penalties_cost_center_id
        FROM public.cost_centers
        WHERE company_id = penalty_record.company_id
        AND center_code = 'SALES'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- العثور على الحسابات المطلوبة
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = penalty_record.company_id
    AND account_type = 'assets'
    AND account_name ILIKE '%receivable%'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO penalty_income_account_id
    FROM public.chart_of_accounts
    WHERE company_id = penalty_record.company_id
    AND account_type = 'revenue'
    AND (account_name ILIKE '%other%income%' OR account_name ILIKE '%إيرادات%أخرى%' OR account_name ILIKE '%غرامات%')
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
        penalty_record.penalty_date,
        'Penalty #' || penalty_record.penalty_number || ' - ' || penalty_record.reason,
        'penalty',
        penalty_record.id,
        penalty_record.amount,
        penalty_record.amount,
        'draft',
        penalty_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد مع مركز تكلفة الغرامات
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
            penalties_cost_center_id,
            1,
            'Accounts Receivable - Penalty #' || penalty_record.penalty_number,
            penalty_record.amount,
            0
        );
    END IF;
    
    -- دائن: إيرادات الغرامات
    IF penalty_income_account_id IS NOT NULL THEN
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
            penalty_income_account_id,
            penalties_cost_center_id,
            2,
            'Penalty Income - Penalty #' || penalty_record.penalty_number,
            0,
            penalty_record.amount
        );
    END IF;
    
    -- تحديث الغرامة بمرجع القيد
    UPDATE public.penalties
    SET journal_entry_id = journal_entry_id
    WHERE id = penalty_id_param;
    
    RETURN journal_entry_id;
END;
$function$;

-- تحديث دالة إنشاء قيود الإهلاك لربطها بمركز تكلفة الصيانة والعمليات
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
    maintenance_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل الأصل
    SELECT * INTO asset_record
    FROM public.fixed_assets
    WHERE id = asset_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fixed asset not found';
    END IF;
    
    -- الحصول على مركز تكلفة الصيانة والعمليات
    SELECT id INTO maintenance_cost_center_id
    FROM public.cost_centers
    WHERE company_id = asset_record.company_id
    AND center_code = 'MAINTENANCE_OPS'
    AND is_active = true
    LIMIT 1;
    
    -- في حالة عدم وجوده، استخدم مركز إدارة الأصول
    IF maintenance_cost_center_id IS NULL THEN
        SELECT id INTO maintenance_cost_center_id
        FROM public.cost_centers
        WHERE company_id = asset_record.company_id
        AND center_code = 'ASSET'
        AND is_active = true
        LIMIT 1;
    END IF;
    
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
    
    -- إنشاء بنود القيد مع مركز تكلفة الصيانة
    -- مدين: مصروف الإهلاك
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
            maintenance_cost_center_id,
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
            maintenance_cost_center_id,
            2,
            'Accumulated Depreciation - ' || asset_record.asset_name,
            0,
            depreciation_amount_param
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- تحديث دالة إنشاء قيود الحركات البنكية لربطها بمركز تكلفة المصاريف الإدارية
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
    admin_cost_center_id uuid;
BEGIN
    -- الحصول على تفاصيل الحركة البنكية
    SELECT * INTO transaction_record
    FROM public.bank_transactions
    WHERE id = transaction_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bank transaction not found';
    END IF;
    
    -- الحصول على مركز تكلفة المصاريف الإدارية
    SELECT id INTO admin_cost_center_id
    FROM public.cost_centers
    WHERE company_id = transaction_record.company_id
    AND center_code = 'ADMIN_EXPENSES'
    AND is_active = true
    LIMIT 1;
    
    -- في حالة عدم وجوده، استخدم مركز المالية
    IF admin_cost_center_id IS NULL THEN
        SELECT id INTO admin_cost_center_id
        FROM public.cost_centers
        WHERE company_id = transaction_record.company_id
        AND center_code = 'FINANCE'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- في حالة عدم وجوده، استخدم مركز الإدارة
    IF admin_cost_center_id IS NULL THEN
        SELECT id INTO admin_cost_center_id
        FROM public.cost_centers
        WHERE company_id = transaction_record.company_id
        AND center_code = 'ADMIN'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- العثور على الحسابات المطلوبة
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
        'Bank Transaction #' || transaction_record.transaction_number || ' - ' || transaction_record.description,
        'bank_transaction',
        transaction_record.id,
        transaction_record.amount,
        transaction_record.amount,
        'draft',
        transaction_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد بناءً على نوع الحركة
    IF transaction_record.transaction_type = 'deposit' THEN
        -- أموال واردة
        -- مدين: النقدية/البنك
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
                admin_cost_center_id,
                1,
                'Cash deposit - ' || transaction_record.description,
                transaction_record.amount,
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
                admin_cost_center_id,
                2,
                'Revenue - ' || transaction_record.description,
                0,
                transaction_record.amount
            );
        END IF;
        
    ELSIF transaction_record.transaction_type = 'withdrawal' THEN
        -- أموال صادرة
        -- مدين: المصاريف
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
                admin_cost_center_id,
                1,
                'Expense - ' || transaction_record.description,
                transaction_record.amount,
                0
            );
        END IF;
        
        -- دائن: النقدية/البنك
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
                admin_cost_center_id,
                2,
                'Cash withdrawal - ' || transaction_record.description,
                0,
                transaction_record.amount
            );
        END IF;
    END IF;
    
    -- تحديث الحركة بمرجع القيد
    UPDATE public.bank_transactions
    SET journal_entry_id = journal_entry_id
    WHERE id = transaction_id_param;
    
    RETURN journal_entry_id;
END;
$function$;

-- تحديث دالة إنشاء قيود الفواتير لربطها بمراكز التكلفة المناسبة
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
    selected_cost_center_id uuid;
    related_contract_record record;
    contract_duration_days integer;
BEGIN
    -- الحصول على تفاصيل الفاتورة
    SELECT * INTO invoice_record
    FROM public.invoices
    WHERE id = invoice_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- فقط إنشاء قيد للفواتير المبيعات
    IF invoice_record.invoice_type != 'sales' THEN
        RETURN NULL;
    END IF;
    
    -- محاولة العثور على عقد مرتبط بالعميل لتحديد مركز التكلفة
    SELECT * INTO related_contract_record
    FROM public.contracts
    WHERE customer_id = invoice_record.customer_id
    AND company_id = invoice_record.company_id
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- تحديد مركز التكلفة بناءً على العقد المرتبط إن وجد
    IF FOUND THEN
        -- حساب مدة العقد لتحديد النوع
        contract_duration_days := related_contract_record.end_date - related_contract_record.start_date + 1;
        
        IF contract_duration_days <= 7 THEN
            -- عقد يومي
            SELECT id INTO selected_cost_center_id
            FROM public.cost_centers
            WHERE company_id = invoice_record.company_id
            AND center_code = 'DAILY_RENTAL'
            AND is_active = true
            LIMIT 1;
        ELSIF contract_duration_days >= 28 THEN
            -- عقد شهري
            SELECT id INTO selected_cost_center_id
            FROM public.cost_centers
            WHERE company_id = invoice_record.company_id
            AND center_code = 'MONTHLY_RENTAL'
            AND is_active = true
            LIMIT 1;
        ELSE
            -- عقد متوسط المدة
            SELECT id INTO selected_cost_center_id
            FROM public.cost_centers
            WHERE company_id = invoice_record.company_id
            AND center_code = 'SALES'
            AND is_active = true
            LIMIT 1;
        END IF;
    ELSE
        -- لا يوجد عقد مرتبط، استخدم مركز المبيعات والتسويق
        SELECT id INTO selected_cost_center_id
        FROM public.cost_centers
        WHERE company_id = invoice_record.company_id
        AND center_code = 'SALES'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- في حالة عدم العثور على مركز تكلفة، استخدم المبيعات كافتراضي
    IF selected_cost_center_id IS NULL THEN
        SELECT id INTO selected_cost_center_id
        FROM public.cost_centers
        WHERE company_id = invoice_record.company_id
        AND center_code = 'SALES'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- العثور على الحسابات المطلوبة
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
        'Sales Invoice #' || invoice_record.invoice_number,
        'invoice',
        invoice_record.id,
        invoice_record.total_amount,
        invoice_record.total_amount,
        'draft',
        invoice_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد مع مركز التكلفة المحدد
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
            selected_cost_center_id,
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
            selected_cost_center_id,
            2,
            'Revenue - Invoice #' || invoice_record.invoice_number,
            0,
            invoice_record.subtotal
        );
    END IF;
    
    -- دائن: الضرائب المستحقة (إن وجدت)
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
            selected_cost_center_id,
            3,
            'Tax Payable - Invoice #' || invoice_record.invoice_number,
            0,
            invoice_record.tax_amount
        );
    END IF;
    
    -- تحديث الفاتورة بمرجع القيد
    UPDATE public.invoices
    SET journal_entry_id = journal_entry_id
    WHERE id = invoice_id_param;
    
    RETURN journal_entry_id;
END;
$function$;