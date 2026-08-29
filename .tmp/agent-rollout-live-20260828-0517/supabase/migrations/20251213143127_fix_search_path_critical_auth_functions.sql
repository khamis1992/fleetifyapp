-- Fix search_path for critical authentication and security functions
-- Adding SET search_path = '' prevents search_path injection attacks

-- 1. get_user_company_id (SECURITY DEFINER - CRITICAL)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    RETURN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT company_id FROM public.employees WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$function$;

-- 2. is_company_admin (SECURITY DEFINER - CRITICAL)
CREATE OR REPLACE FUNCTION public.is_company_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.profiles p ON ur.user_id = p.user_id
        WHERE ur.user_id = auth.uid()
        AND ur.company_id = p_company_id
        AND p.is_active = true
        AND ur.role IN ('company_admin', 'super_admin')
    );
$function$;

-- 3. is_super_admin() - no params (SECURITY DEFINER - CRITICAL)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT public.is_super_admin(auth.uid());
$function$;

-- 4. is_super_admin(p_user_id) - with params (STABLE)
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = 'super_admin'
  );
$function$;

-- 5. user_company_id (if different from get_user_company_id)
-- Note: This might be a duplicate or legacy function
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
    LIMIT 1;
$function$;

-- 6. get_revenue_account_for_invoice
CREATE OR REPLACE FUNCTION public.get_revenue_account_for_invoice()
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $function$ 
BEGIN 
    RETURN 'c26bb9bd-4c3d-455b-985b-55fe83898179'::uuid; 
END; 
$function$;

-- 7. format_qatar_phone
CREATE OR REPLACE FUNCTION public.format_qatar_phone(phone text)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  cleaned TEXT;
BEGIN
  -- إزالة جميع الأحرف غير الرقمية
  cleaned := regexp_replace(phone, '[^0-9]', '', 'g');
  
  -- إزالة 00 من البداية
  IF cleaned LIKE '00%' THEN
    cleaned := substr(cleaned, 3);
  END IF;
  
  -- إذا كان 8 أرقام، نضيف كود قطر 974
  IF length(cleaned) = 8 THEN
    cleaned := '974' || cleaned;
  END IF;
  
  -- إزالة 0 الزائدة قبل 974
  IF cleaned LIKE '0974%' THEN
    cleaned := substr(cleaned, 2);
  END IF;
  
  RETURN cleaned;
END;
$function$;

-- 8. normalize_phone
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
    IF phone_input IS NULL OR phone_input = '' THEN
        RETURN NULL;
    END IF;
    RETURN regexp_replace(phone_input, '[^0-9]', '', 'g');
END;
$function$;

-- 9. normalize_plate
CREATE OR REPLACE FUNCTION public.normalize_plate(plate_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
    IF plate_input IS NULL OR plate_input = '' THEN
        RETURN NULL;
    END IF;
    RETURN UPPER(TRIM(REGEXP_REPLACE(plate_input, '\s+', ' ', 'g')));
END;
$function$;;
