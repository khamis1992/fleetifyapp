-- إصلاح التحذيرات الأمنية المتبقية - إضافة SET search_path للدوال المفقودة

-- إصلاح دالة has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    );
$function$;

-- إصلاح دالة get_user_company
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT COALESCE(
        (SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1),
        '00000000-0000-0000-0000-000000000000'::uuid
    );
$function$;