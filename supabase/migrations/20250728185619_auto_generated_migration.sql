-- إصلاح التحذيرات الأمنية وإضافة الفهارس

-- 1. إضافة الفهارس المحسنة (بدون CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_contracts_company_status_date 
ON public.contracts (company_id, status, contract_date DESC);

CREATE INDEX IF NOT EXISTS idx_cost_centers_company_active 
ON public.cost_centers (company_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_customers_company_active 
ON public.customers (company_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_vehicles_company_status 
ON public.vehicles (company_id, status);

CREATE INDEX IF NOT EXISTS idx_employees_company_active 
ON public.employees (company_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date_status 
ON public.journal_entries (company_id, entry_date DESC, status);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget_account 
ON public.budget_items (budget_id, account_id);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date 
ON public.attendance_records (employee_id, attendance_date DESC);

-- 2. إصلاح مشاكل search_path في الدوال الموجودة
CREATE OR REPLACE FUNCTION public.log_activity_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_id_val uuid;
    company_id_val uuid;
    action_name text;
    resource_name text;
    old_data jsonb;
    new_data jsonb;
BEGIN
    -- تحديد المستخدم الحالي
    user_id_val := auth.uid();
    
    -- تحديد معرف الشركة
    IF TG_TABLE_NAME = 'companies' THEN
        company_id_val := COALESCE(NEW.id, OLD.id);
    ELSE
        company_id_val := COALESCE(NEW.company_id, OLD.company_id);
    END IF;
    
    -- تحديد نوع العملية
    CASE TG_OP
        WHEN 'INSERT' THEN
            action_name := 'create';
            new_data := row_to_json(NEW)::jsonb;
        WHEN 'UPDATE' THEN
            action_name := 'update';
            old_data := row_to_json(OLD)::jsonb;
            new_data := row_to_json(NEW)::jsonb;
        WHEN 'DELETE' THEN
            action_name := 'delete';
            old_data := row_to_json(OLD)::jsonb;
        ELSE
            action_name := 'unknown';
    END CASE;
    
    -- تحديد اسم المورد
    resource_name := TG_TABLE_NAME;
    
    -- إدراج السجل
    INSERT INTO public.system_logs (
        company_id,
        user_id,
        level,
        category,
        action,
        resource_type,
        resource_id,
        message,
        metadata
    ) VALUES (
        company_id_val,
        user_id_val,
        'info',
        CASE TG_TABLE_NAME
            WHEN 'customers' THEN 'customers'
            WHEN 'contracts' THEN 'contracts'
            WHEN 'vehicles' THEN 'fleet'
            WHEN 'employees' THEN 'hr'
            WHEN 'invoices' THEN 'finance'
            WHEN 'payments' THEN 'finance'
            WHEN 'bank_transactions' THEN 'finance'
            WHEN 'journal_entries' THEN 'finance'
            ELSE 'system'
        END,
        action_name,
        resource_name,
        COALESCE(NEW.id, OLD.id),
        CASE TG_OP
            WHEN 'INSERT' THEN 'تم إنشاء ' || resource_name || ' جديد'
            WHEN 'UPDATE' THEN 'تم تحديث ' || resource_name
            WHEN 'DELETE' THEN 'تم حذف ' || resource_name
        END,
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'old_data', old_data,
            'new_data', new_data
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. مشغل أمان لتسجيل محاولات الوصول المشبوهة
CREATE OR REPLACE FUNCTION public.security_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_user_id uuid;
    current_company_id uuid;
    target_company_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    -- الحصول على شركة المستخدم الحالي
    SELECT company_id INTO current_company_id 
    FROM public.profiles 
    WHERE user_id = current_user_id 
    LIMIT 1;
    
    -- تحديد الشركة المستهدفة
    target_company_id := COALESCE(NEW.company_id, OLD.company_id);
    
    -- تسجيل محاولات الوصول لشركات أخرى (ما عدا المشرفين العامين)
    IF target_company_id IS NOT NULL 
       AND current_company_id IS NOT NULL 
       AND target_company_id != current_company_id 
       AND NOT has_role(current_user_id, 'super_admin'::user_role) THEN
        
        PERFORM log_suspicious_access(
            current_user_id, 
            TG_TABLE_NAME, 
            target_company_id, 
            TG_OP
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;