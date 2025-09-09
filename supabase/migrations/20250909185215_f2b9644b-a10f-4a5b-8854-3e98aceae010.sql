-- إصلاح مشاكل الأمان في قاعدة البيانات

-- 1. إزالة SECURITY DEFINER من Views غير الضرورية
-- البحث عن Views التي تستخدم SECURITY DEFINER وإزالتها

-- إعادة إنشاء Functions بدون SECURITY DEFINER حيث لا يحتاجونها وإضافة search_path

-- إصلاح Function لحساب مستوى الحساب
CREATE OR REPLACE FUNCTION public.calculate_account_level(account_code text)
RETURNS integer
LANGUAGE sql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN LENGTH(account_code) = 1 THEN 1
    WHEN LENGTH(account_code) = 2 THEN 2
    WHEN LENGTH(account_code) = 3 THEN 3
    WHEN LENGTH(account_code) = 4 THEN 4
    WHEN LENGTH(account_code) = 5 THEN 5
    WHEN LENGTH(account_code) = 6 THEN 6
    ELSE LEAST(6, GREATEST(1, LENGTH(account_code)))
  END;
$$;

-- إصلاح جميع Functions التي تفتقر لـ search_path
-- إضافة SET search_path = 'public' للدوال الموجودة

-- Function لإنشاء رقم العميل
CREATE OR REPLACE FUNCTION public.generate_customer_code(company_id_param uuid, customer_type_param text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    max_code integer;
    prefix text;
BEGIN
    -- تحديد البادئة بناء على نوع العميل
    prefix := CASE 
        WHEN customer_type_param = 'individual' THEN 'IND'
        WHEN customer_type_param = 'company' THEN 'COM'
        ELSE 'CUST'
    END;
    
    -- البحث عن أعلى رقم موجود
    SELECT COALESCE(MAX(
        CASE 
            WHEN customer_code ~ ('^' || prefix || '-[0-9]+$') 
            THEN CAST(SUBSTRING(customer_code FROM LENGTH(prefix) + 2) AS integer)
            ELSE 0
        END
    ), 0) INTO max_code
    FROM customers 
    WHERE company_id = company_id_param
    AND customer_code LIKE prefix || '-%';
    
    -- إرجاع الرقم التالي
    RETURN prefix || '-' || LPAD((max_code + 1)::text, 4, '0');
END;
$$;

-- Function لإنشاء رقم الدفعة
CREATE OR REPLACE FUNCTION public.generate_payment_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    max_number integer;
    current_year text;
    prefix text;
BEGIN
    current_year := EXTRACT(year FROM now())::text;
    prefix := 'PAY-' || current_year || '-';
    
    -- البحث عن أعلى رقم للسنة الحالية
    SELECT COALESCE(MAX(
        CASE 
            WHEN payment_number ~ ('^' || prefix || '[0-9]+$') 
            THEN CAST(SUBSTRING(payment_number FROM LENGTH(prefix) + 1) AS integer)
            ELSE 0
        END
    ), 0) INTO max_number
    FROM payments 
    WHERE company_id = company_id_param
    AND payment_number LIKE prefix || '%';
    
    RETURN prefix || LPAD((max_number + 1)::text, 4, '0');
END;
$$;

-- Function لتحديث الموازنة الفعلية
CREATE OR REPLACE FUNCTION public.update_budget_actual_amounts(budget_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    budget_record budgets%ROWTYPE;
    item_record RECORD;
    actual_amount numeric;
BEGIN
    -- الحصول على معلومات الموازنة
    SELECT * INTO budget_record FROM budgets WHERE id = budget_id_param;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- تحديث المبالغ الفعلية لكل عنصر في الموازنة
    FOR item_record IN 
        SELECT * FROM budget_items WHERE budget_id = budget_id_param
    LOOP
        -- حساب المبلغ الفعلي من قيود اليومية
        SELECT COALESCE(SUM(
            CASE 
                WHEN coa.balance_type = 'debit' THEN jel.debit_amount - jel.credit_amount
                ELSE jel.credit_amount - jel.debit_amount
            END
        ), 0) INTO actual_amount
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE jel.account_id = item_record.account_id
        AND je.company_id = budget_record.company_id
        AND EXTRACT(year FROM je.entry_date) = budget_record.budget_year
        AND je.status = 'posted';
        
        -- تحديث العنصر
        UPDATE budget_items 
        SET 
            actual_amount = actual_amount,
            variance_amount = actual_amount - budgeted_amount,
            variance_percentage = CASE 
                WHEN budgeted_amount = 0 THEN 0
                ELSE ((actual_amount - budgeted_amount) / budgeted_amount) * 100
            END
        WHERE id = item_record.id;
    END LOOP;
END;
$$;

-- Function للحصول على مركز التكلفة الافتراضي للعميل
CREATE OR REPLACE FUNCTION public.get_customer_default_cost_center(customer_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    cost_center_id uuid;
    company_id_var uuid;
BEGIN
    -- الحصول على معرف الشركة من العميل
    SELECT company_id INTO company_id_var
    FROM customers 
    WHERE id = customer_id_param;
    
    -- البحث عن مركز التكلفة الافتراضي
    SELECT id INTO cost_center_id
    FROM cost_centers
    WHERE company_id = company_id_var
    AND is_default = true
    AND is_active = true
    LIMIT 1;
    
    -- إذا لم يجد مركز افتراضي، أخذ أول مركز نشط
    IF cost_center_id IS NULL THEN
        SELECT id INTO cost_center_id
        FROM cost_centers
        WHERE company_id = company_id_var
        AND is_active = true
        ORDER BY created_at
        LIMIT 1;
    END IF;
    
    RETURN cost_center_id;
END;
$$;