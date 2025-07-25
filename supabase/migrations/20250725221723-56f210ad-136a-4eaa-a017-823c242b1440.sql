-- إزالة المحفزات المكررة وإصلاح دالة إنشاء القيد اليومي للمرتبات

-- إزالة جميع المحفزات المكررة على جدول payroll
DROP TRIGGER IF EXISTS payroll_auto_journal_trigger ON public.payroll;
DROP TRIGGER IF EXISTS trigger_handle_payroll_changes ON public.payroll;
DROP TRIGGER IF EXISTS trigger_payroll_changes ON public.payroll;

-- التأكد من وجود دالة create_payroll_journal_entry مع المعاملات الصحيحة
CREATE OR REPLACE FUNCTION public.create_payroll_journal_entry(payroll_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    payroll_record record;
    new_journal_entry_id uuid;
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
    ) RETURNING id INTO new_journal_entry_id;
    
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
            new_journal_entry_id,
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
            new_journal_entry_id,
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
            new_journal_entry_id,
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
            new_journal_entry_id,
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
    SET journal_entry_id = new_journal_entry_id
    WHERE id = payroll_id_param;
    
    RETURN new_journal_entry_id;
END;
$function$;

-- إنشاء محفز واحد فقط لمعالجة تغييرات المرتبات
CREATE TRIGGER handle_payroll_changes_trigger
    BEFORE INSERT OR UPDATE ON public.payroll
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payroll_changes();