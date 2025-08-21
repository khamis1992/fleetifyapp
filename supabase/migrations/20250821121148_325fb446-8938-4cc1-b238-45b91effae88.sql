-- Create function to clean up incomplete car rental template application
-- This allows users to re-apply the complete template after the partial application

CREATE OR REPLACE FUNCTION public.reset_company_chart_for_complete_template(
  target_company_id uuid,
  template_name text DEFAULT 'car_rental'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  start_time TIMESTAMP := now();
  deleted_count INTEGER := 0;
  accounts_before INTEGER := 0;
  accounts_after INTEGER := 0;
  success_details JSON[] := '{}';
BEGIN
  -- التحقق من وجود الشركة
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = target_company_id) THEN
    RAISE EXCEPTION 'الشركة غير موجودة';
  END IF;

  -- عد الحسابات قبل الحذف
  SELECT COUNT(*) INTO accounts_before
  FROM chart_of_accounts
  WHERE company_id = target_company_id AND is_active = true;

  -- حذف جميع الحسابات النظامية للقالب السابق
  -- هذا يحذف فقط الحسابات التي تم إنشاؤها من القوالب وليس الحسابات المخصصة
  DELETE FROM chart_of_accounts 
  WHERE company_id = target_company_id 
  AND is_system = false  -- فقط الحسابات التي تم إنشاؤها من القوالب
  AND (
    -- حسابات قالب تأجير السيارات
    account_code LIKE '115%' OR  -- أسطول المركبات
    account_code LIKE '116%' OR  -- أصول المخزون
    account_code LIKE '113%' OR  -- المدفوعات مقدماً
    account_code LIKE '114%' OR  -- مدينون آخرون
    account_code LIKE '112%' OR  -- تفاصيل العملاء
    account_code LIKE '213%' OR  -- ودائع العملاء
    account_code LIKE '214%' OR  -- مستحقات الصيانة
    account_code LIKE '215%' OR  -- التأمين والقانونية
    account_code LIKE '216%' OR  -- الضرائب والرسوم
    account_code LIKE '217%' OR  -- تفاصيل الموردين
    account_code LIKE '411%' OR  -- إيرادات التأجير
    account_code LIKE '412%' OR  -- إيرادات أخرى
    account_code LIKE '511%' OR  -- مصاريف المركبات
    account_code LIKE '512%' OR  -- مصاريف التشغيل
    account_code LIKE '522%' OR  -- مصاريف الموظفين
    account_code LIKE '523%' OR  -- مصاريف التسويق
    account_code LIKE '524%'     -- مصاريف إدارية
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- عد الحسابات بعد الحذف
  SELECT COUNT(*) INTO accounts_after
  FROM chart_of_accounts
  WHERE company_id = target_company_id AND is_active = true;

  -- تسجيل العملية
  INSERT INTO account_deletion_log (
    company_id,
    deleted_account_id,
    deleted_account_code,
    deleted_account_name,
    deletion_type,
    deletion_reason,
    deleted_by
  ) VALUES (
    target_company_id,
    NULL,
    'TEMPLATE_RESET',
    'إعادة تعيين قالب ' || template_name,
    'bulk_cleanup',
    'تنظيف القالب السابق للسماح بتطبيق القالب الكامل',
    auth.uid()
  );

  success_details := success_details || json_build_object(
    'operation', 'template_cleanup',
    'template_name', template_name,
    'accounts_deleted', deleted_count,
    'accounts_before', accounts_before,
    'accounts_after', accounts_after
  );

  RETURN json_build_object(
    'success', true,
    'message', format('تم تنظيف %s حساب من القالب السابق. يمكنك الآن تطبيق القالب الكامل.', deleted_count),
    'deleted_count', deleted_count,
    'accounts_before', accounts_before,
    'accounts_after', accounts_after,
    'details', success_details,
    'operation_duration', EXTRACT(EPOCH FROM (now() - start_time))::text || ' seconds'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'فشل في تنظيف القالب السابق',
      'deleted_count', deleted_count,
      'accounts_before', accounts_before,
      'accounts_after', accounts_after,
      'operation_duration', EXTRACT(EPOCH FROM (now() - start_time))::text || ' seconds'
    );
END;
$function$;