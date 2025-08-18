-- إنشاء وظيفة لنسخ حسابات محددة إلى شركة
CREATE OR REPLACE FUNCTION copy_selected_accounts_to_company(
  target_company_id UUID,
  selected_account_codes TEXT[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record RECORD;
  new_account_id UUID;
BEGIN
  -- التحقق من وجود الشركة
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = target_company_id) THEN
    RAISE EXCEPTION 'الشركة غير موجودة';
  END IF;

  -- نسخ الحسابات المحددة من القالب الافتراضي
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
        sort_order
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
        account_record.sort_order
      );
    END IF;
  END LOOP;

  -- تحديث العلاقات بين الحسابات الأب والفرع
  UPDATE chart_of_accounts 
  SET parent_account_id = (
    SELECT ca_parent.id
    FROM chart_of_accounts ca_parent
    JOIN default_chart_of_accounts da_parent ON ca_parent.account_code = da_parent.account_code
    JOIN default_chart_of_accounts da_child ON da_child.parent_account_code = da_parent.account_code
    WHERE ca_parent.company_id = target_company_id
    AND da_child.account_code = chart_of_accounts.account_code
    AND chart_of_accounts.company_id = target_company_id
  )
  WHERE company_id = target_company_id
  AND account_code = ANY(selected_account_codes)
  AND EXISTS (
    SELECT 1 FROM default_chart_of_accounts da
    WHERE da.account_code = chart_of_accounts.account_code
    AND da.parent_account_code IS NOT NULL
    AND da.parent_account_code = ANY(selected_account_codes)
  );

END;
$$;