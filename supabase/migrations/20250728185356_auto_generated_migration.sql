-- تحسين الأداء والأمان - المرحلة الأولى: الدوال المحسنة أولاً

-- 1. تحسين دالة get_user_company_secure لتجنب الاستعلامات المتكررة
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

-- 2. دالة محسنة للتحقق من صلاحيات الشركة
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

-- 3. دالة لتسجيل محاولات الوصول المشبوهة
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

-- 4. تحسين دالة has_role للأداء
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