-- إضافة مراكز التكلفة المفقودة إلى الجدول الافتراضي
INSERT INTO public.default_cost_centers (center_code, center_name, center_name_ar, description, sort_order) VALUES
('HR', 'Human Resources', 'الموارد البشرية', 'Human resources and payroll management', 2),
('SALES', 'Sales & Marketing', 'المبيعات والتسويق', 'Sales activities and customer relations', 3),
('FINANCE', 'Finance & Treasury', 'المالية والخزينة', 'Financial operations and treasury management', 4),
('ASSET', 'Asset Management', 'إدارة الأصول', 'Fixed assets and depreciation management', 5)
ON CONFLICT (center_code) DO NOTHING;

-- تحديث دالة إنشاء قيود المدفوعات لتحديد مركز التكلفة ديناميكياً
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
    selected_cost_center_id uuid;
    contract_type_text text;
BEGIN
    -- الحصول على تفاصيل الدفع
    SELECT * INTO payment_record
    FROM public.payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- تحديد مركز التكلفة بناءً على نوع العقد إذا كان الدفع مرتبط بعقد
    IF payment_record.payment_type = 'receipt' THEN
        -- للمدفوعات الواردة، نحاول العثور على العقد المرتبط
        SELECT c.contract_type INTO contract_type_text
        FROM public.contracts c
        WHERE c.customer_id = payment_record.customer_id
        AND c.status = 'active'
        ORDER BY c.created_at DESC
        LIMIT 1;
        
        -- تحديد مركز التكلفة بناءً على نوع العقد
        IF contract_type_text = 'rental' THEN
            SELECT id INTO selected_cost_center_id
            FROM public.cost_centers
            WHERE company_id = payment_record.company_id
            AND center_code = 'SALES'
            AND is_active = true
            LIMIT 1;
        ELSE
            -- للعقود الأخرى، استخدم مركز المبيعات
            SELECT id INTO selected_cost_center_id
            FROM public.cost_centers
            WHERE company_id = payment_record.company_id
            AND center_code = 'SALES'
            AND is_active = true
            LIMIT 1;
        END IF;
    ELSE
        -- للمدفوعات الصادرة، استخدم مركز المالية
        SELECT id INTO selected_cost_center_id
        FROM public.cost_centers
        WHERE company_id = payment_record.company_id
        AND center_code = 'FINANCE'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- في حالة عدم العثور على مركز تكلفة محدد، استخدم الإداري
    IF selected_cost_center_id IS NULL THEN
        SELECT id INTO selected_cost_center_id
        FROM public.cost_centers
        WHERE company_id = payment_record.company_id
        AND center_code = 'ADMIN'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- العثور على الحسابات المطلوبة
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
        'Payment #' || payment_record.payment_number || ' - ' || payment_record.payment_type,
        'payment',
        payment_record.id,
        payment_record.amount,
        payment_record.amount,
        'draft',
        payment_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد بناءً على نوع الدفع
    IF payment_record.payment_type = 'receipt' THEN
        -- استلام دفع من العميل
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
                selected_cost_center_id,
                1,
                'Cash received - Payment #' || payment_record.payment_number,
                payment_record.amount,
                0
            );
        END IF;
        
        -- دائن: حسابات العملاء
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
                2,
                'Accounts Receivable - Payment #' || payment_record.payment_number,
                0,
                payment_record.amount
            );
        END IF;
        
    ELSIF payment_record.payment_type = 'payment' THEN
        -- دفع للمورد
        -- مدين: حسابات الموردين
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
                selected_cost_center_id,
                1,
                'Accounts Payable - Payment #' || payment_record.payment_number,
                payment_record.amount,
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
                selected_cost_center_id,
                2,
                'Cash paid - Payment #' || payment_record.payment_number,
                0,
                payment_record.amount
            );
        END IF;
    END IF;
    
    -- تحديث الدفع بمرجع القيد
    UPDATE public.payments
    SET journal_entry_id = journal_entry_id
    WHERE id = payment_id_param;
    
    RETURN journal_entry_id;
END;
$function$;

-- دالة لإلغاء العقود
CREATE OR REPLACE FUNCTION public.create_contract_cancellation_journal_entry(contract_id_param uuid, cancellation_date_param date, cancellation_reason text DEFAULT 'Contract cancelled')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
    
    -- إنشاء قيد عكسي لإلغاء العقد
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
        cancellation_date_param,
        'Contract Cancellation #' || contract_record.contract_number || ' - ' || cancellation_reason,
        'contract_cancellation',
        contract_record.id,
        contract_record.contract_amount,
        contract_record.contract_amount,
        'draft',
        contract_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد العكسي
    -- مدين: الإيرادات المستحقة (لإلغائها)
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
            1,
            'Revenue Reversal - Contract #' || contract_record.contract_number,
            contract_record.contract_amount,
            0
        );
    END IF;
    
    -- دائن: حسابات العملاء (لإلغائها)
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
            2,
            'Accounts Receivable Reversal - Contract #' || contract_record.contract_number,
            0,
            contract_record.contract_amount
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- دالة لخصومات الفواتير
CREATE OR REPLACE FUNCTION public.create_invoice_discount_journal_entry(invoice_id_param uuid, discount_amount_param numeric, discount_reason text DEFAULT 'Invoice discount')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    invoice_record record;
    journal_entry_id uuid;
    discount_account_id uuid;
    receivable_account_id uuid;
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
    
    -- العثور على حساب الخصومات
    SELECT id INTO discount_account_id
    FROM public.chart_of_accounts
    WHERE company_id = invoice_record.company_id
    AND account_type = 'expenses'
    AND (account_name ILIKE '%discount%' OR account_name ILIKE '%خصم%')
    AND is_active = true
    LIMIT 1;
    
    -- إذا لم يوجد حساب خصومات، استخدم حساب المصاريف العامة
    IF discount_account_id IS NULL THEN
        SELECT id INTO discount_account_id
        FROM public.chart_of_accounts
        WHERE company_id = invoice_record.company_id
        AND account_type = 'expenses'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = invoice_record.company_id
    AND account_type = 'assets'
    AND account_name ILIKE '%receivable%'
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء قيد الخصم
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
        CURRENT_DATE,
        'Invoice Discount #' || invoice_record.invoice_number || ' - ' || discount_reason,
        'invoice_discount',
        invoice_record.id,
        discount_amount_param,
        discount_amount_param,
        'draft',
        invoice_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود قيد الخصم
    -- مدين: مصروفات الخصومات
    IF discount_account_id IS NOT NULL THEN
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
            discount_account_id,
            sales_cost_center_id,
            1,
            'Sales Discount - Invoice #' || invoice_record.invoice_number,
            discount_amount_param,
            0
        );
    END IF;
    
    -- دائن: حسابات العملاء
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
            2,
            'Accounts Receivable Reduction - Invoice #' || invoice_record.invoice_number,
            0,
            discount_amount_param
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- دالة للإيرادات المؤجلة
CREATE OR REPLACE FUNCTION public.create_deferred_revenue_journal_entry(contract_id_param uuid, period_start_date date, period_end_date date, monthly_amount_param numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    contract_record record;
    journal_entry_id uuid;
    deferred_revenue_account_id uuid;
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
    
    -- العثور على حساب الإيرادات المؤجلة
    SELECT id INTO deferred_revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'liabilities'
    AND (account_name ILIKE '%deferred%revenue%' OR account_name ILIKE '%إيرادات%مؤجلة%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'revenue'
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء قيد الإيرادات المؤجلة
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
        period_start_date,
        'Deferred Revenue Recognition - Contract #' || contract_record.contract_number || ' (' || period_start_date || ' to ' || period_end_date || ')',
        'deferred_revenue',
        contract_record.id,
        monthly_amount_param,
        monthly_amount_param,
        'draft',
        contract_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود قيد الإيرادات المؤجلة
    -- مدين: الإيرادات المؤجلة (لتحويلها إلى إيرادات محققة)
    IF deferred_revenue_account_id IS NOT NULL THEN
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
            deferred_revenue_account_id,
            sales_cost_center_id,
            1,
            'Deferred Revenue Recognition - Contract #' || contract_record.contract_number,
            monthly_amount_param,
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
            'Revenue Recognition - Contract #' || contract_record.contract_number,
            0,
            monthly_amount_param
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;