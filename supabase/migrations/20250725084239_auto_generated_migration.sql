-- إضافة مراكز التكلفة المفقودة إلى الجدول الافتراضي (بدون ON CONFLICT)
INSERT INTO public.default_cost_centers (center_code, center_name, center_name_ar, description, sort_order)
SELECT 'HR', 'Human Resources', 'الموارد البشرية', 'Human resources and payroll management', 2
WHERE NOT EXISTS (SELECT 1 FROM public.default_cost_centers WHERE center_code = 'HR');

INSERT INTO public.default_cost_centers (center_code, center_name, center_name_ar, description, sort_order)
SELECT 'SALES', 'Sales & Marketing', 'المبيعات والتسويق', 'Sales activities and customer relations', 3
WHERE NOT EXISTS (SELECT 1 FROM public.default_cost_centers WHERE center_code = 'SALES');

INSERT INTO public.default_cost_centers (center_code, center_name, center_name_ar, description, sort_order)
SELECT 'FINANCE', 'Finance & Treasury', 'المالية والخزينة', 'Financial operations and treasury management', 4
WHERE NOT EXISTS (SELECT 1 FROM public.default_cost_centers WHERE center_code = 'FINANCE');

INSERT INTO public.default_cost_centers (center_code, center_name, center_name_ar, description, sort_order)
SELECT 'ASSET', 'Asset Management', 'إدارة الأصول', 'Fixed assets and depreciation management', 5
WHERE NOT EXISTS (SELECT 1 FROM public.default_cost_centers WHERE center_code = 'ASSET');

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