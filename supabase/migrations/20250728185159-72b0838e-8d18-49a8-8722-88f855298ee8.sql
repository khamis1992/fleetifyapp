-- تحسين الأداء والأمان - المرحلة الأولى: الفهارس والدوال المحسنة

-- 1. إضافة فهارس محسنة للاستعلامات الشائعة
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_company_status_date 
ON public.contracts (company_id, status, contract_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cost_centers_company_active 
ON public.cost_centers (company_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_company_active 
ON public.customers (company_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_company_status 
ON public.vehicles (company_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_company_active 
ON public.employees (company_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_entries_company_date_status 
ON public.journal_entries (company_id, entry_date DESC, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_budget_items_budget_account 
ON public.budget_items (budget_id, account_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_employee_date 
ON public.attendance_records (employee_id, attendance_date DESC);

-- 2. تحسين دالة get_user_company_secure لتجنب الاستعلامات المتكررة
CREATE OR REPLACE FUNCTION public.get_user_company_secure_cached(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT COALESCE(
        (SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1),
        '00000000-0000-0000-0000-000000000000'::uuid
    );
$$;

-- 3. دالة محسنة للتحقق من صلاحيات الشركة
CREATE OR REPLACE FUNCTION public.validate_company_access_secure(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_company_id uuid;
    is_super_admin boolean;
BEGIN
    -- الحصول على شركة المستخدم
    SELECT company_id INTO user_company_id 
    FROM public.profiles 
    WHERE user_id = _user_id 
    LIMIT 1;
    
    -- التحقق من صلاحيات المشرف العام
    SELECT has_role(_user_id, 'super_admin'::user_role) INTO is_super_admin;
    
    -- المشرف العام يمكنه الوصول لجميع الشركات
    IF is_super_admin THEN
        RETURN true;
    END IF;
    
    -- المستخدمون العاديون يمكنهم الوصول لشركتهم فقط
    RETURN user_company_id = _company_id;
END;
$$;

-- 4. دالة لتسجيل محاولات الوصول المشبوهة
CREATE OR REPLACE FUNCTION public.log_suspicious_access(_user_id uuid, _table_name text, _company_id uuid, _access_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        company_id,
        resource_type,
        action,
        severity,
        new_values
    ) VALUES (
        _user_id,
        _company_id,
        _table_name,
        _access_type,
        'warning',
        jsonb_build_object(
            'suspicious_access', true,
            'timestamp', now(),
            'table', _table_name,
            'attempted_company', _company_id
        )
    );
END;
$$;

-- 5. تحسين دالة has_role للأداء
CREATE OR REPLACE FUNCTION public.has_role_cached(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    );
$$;