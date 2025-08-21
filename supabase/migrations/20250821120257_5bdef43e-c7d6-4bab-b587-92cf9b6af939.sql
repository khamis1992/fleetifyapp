-- إصلاح وظيفة نسخ الحسابات المحددة لتعمل مع parent_account_id
CREATE OR REPLACE FUNCTION public.copy_selected_accounts_to_company(target_company_id uuid, selected_account_codes text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  account_record RECORD;
  new_account_id UUID;
  parent_account_uuid UUID;
BEGIN
  -- التحقق من وجود الشركة
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = target_company_id) THEN
    RAISE EXCEPTION 'الشركة غير موجودة';
  END IF;

  -- نسخ الحسابات المحددة من القالب الافتراضي بترتيب المستويات
  FOR account_record IN 
    SELECT * FROM default_chart_of_accounts 
    WHERE account_code = ANY(selected_account_codes)
    ORDER BY account_level, account_code
  LOOP
    -- التحقق من عدم وجود الحساب مسبقاً
    IF NOT EXISTS (
      SELECT 1 FROM chart_of_accounts 
      WHERE company_id = target_company_id 
      AND account_code = account_record.account_code
    ) THEN
      
      -- البحث عن الحساب الأب إذا كان موجوداً
      parent_account_uuid := NULL;
      IF account_record.parent_account_code IS NOT NULL THEN
        SELECT id INTO parent_account_uuid
        FROM chart_of_accounts 
        WHERE company_id = target_company_id 
        AND account_code = account_record.parent_account_code;
      END IF;
      
      -- إدراج الحساب الجديد
      INSERT INTO chart_of_accounts (
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        account_subtype,
        balance_type,
        account_level,
        is_header,
        is_system,
        description,
        sort_order,
        parent_account_id
      ) VALUES (
        target_company_id,
        account_record.account_code,
        account_record.account_name,
        account_record.account_name_ar,
        account_record.account_type,
        account_record.account_subtype,
        account_record.balance_type,
        account_record.account_level,
        account_record.is_header,
        account_record.is_system,
        account_record.description,
        account_record.sort_order,
        parent_account_uuid
      );
    END IF;
  END LOOP;

END;
$function$