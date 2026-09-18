-- Migration: Backfill Lawsuits from Verified Customers
-- Date: 2026-01-31
-- Description: إنشاء قضايا بأثر رجعي للعملاء الذين تم التحقق منهم سابقاً

-- ==========================================
-- Script لإنشاء قضايا للتحققات السابقة
-- ==========================================

DO $$
DECLARE
  v_task RECORD;
  v_contract RECORD;
  v_customer RECORD;
  v_vehicle RECORD;
  v_overdue_amount DECIMAL;
  v_late_penalty DECIMAL;
  v_months_unpaid INTEGER;
  v_days_overdue INTEGER;
  v_invoices_count INTEGER;
  v_total_invoices_amount DECIMAL;
  v_violations_count INTEGER;
  v_violations_amount DECIMAL;
  v_claim_amount DECIMAL;
  v_case_title TEXT;
  v_facts TEXT;
  v_requests TEXT;
  v_created_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 [BACKFILL] بدء إنشاء القضايا بأثر رجعي...';
  
  -- المرور على جميع التحققات المكتملة
  FOR v_task IN 
    SELECT DISTINCT ON (customer_id, contract_id)
      id,
      company_id,
      customer_id,
      contract_id,
      verified_by,
      verified_at,
      verifier_name
    FROM customer_verification_tasks
    WHERE status = 'verified'
    AND verified_at IS NOT NULL
    ORDER BY customer_id, contract_id, verified_at DESC
  LOOP
    
    -- التحقق من عدم وجود قضية مسبقاً
    IF EXISTS (
      SELECT 1 FROM lawsuit_templates 
      WHERE contract_id = v_task.contract_id
      AND customer_id = v_task.customer_id
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    -- جلب بيانات العقد
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = v_task.contract_id;
    
    IF NOT FOUND THEN
      RAISE NOTICE '⚠️ [BACKFILL] عقد غير موجود: %', v_task.contract_id;
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    -- جلب بيانات العميل
    SELECT * INTO v_customer
    FROM customers
    WHERE id = v_task.customer_id;
    
    IF NOT FOUND THEN
      RAISE NOTICE '⚠️ [BACKFILL] عميل غير موجود: %', v_task.customer_id;
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    -- التحقق من البيانات الأساسية
    IF v_customer.national_id IS NULL OR TRIM(v_customer.national_id) = '' THEN
      RAISE NOTICE '⚠️ [BACKFILL] رقم الهوية مفقود للعميل: %', v_customer.first_name_ar;
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    IF v_customer.phone IS NULL OR TRIM(v_customer.phone) = '' THEN
      RAISE NOTICE '⚠️ [BACKFILL] رقم الهاتف مفقود للعميل: %', v_customer.first_name_ar;
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    -- جلب المركبة
    v_vehicle := NULL;
    IF v_contract.vehicle_id IS NOT NULL THEN
      SELECT * INTO v_vehicle
      FROM vehicles
      WHERE id = v_contract.vehicle_id;
    END IF;
    
    -- حساب المبالغ المتأخرة
    SELECT 
      COUNT(*),
      SUM(total_amount - COALESCE(paid_amount, 0))
    INTO v_invoices_count, v_overdue_amount
    FROM invoices
    WHERE contract_id = v_task.contract_id
    AND (total_amount - COALESCE(paid_amount, 0)) > 0
    AND status != 'cancelled';
    
    v_invoices_count := COALESCE(v_invoices_count, 0);
    v_overdue_amount := COALESCE(v_overdue_amount, 0);
    v_total_invoices_amount := v_overdue_amount;
    
    -- حساب المخالفات (تجاهل إذا لم يكن العمود موجوداً)
    BEGIN
      SELECT 
        COUNT(*),
        SUM(COALESCE(fine_amount, 0))
      INTO v_violations_count, v_violations_amount
      FROM traffic_violations
      WHERE contract_id = v_task.contract_id;
    EXCEPTION
      WHEN undefined_column THEN
        v_violations_count := 0;
        v_violations_amount := 0;
    END;
    
    v_violations_count := COALESCE(v_violations_count, 0);
    v_violations_amount := COALESCE(v_violations_amount, 0);
    
    -- حساب الأشهر والأيام
    v_months_unpaid := v_invoices_count;
    v_days_overdue := GREATEST(0, EXTRACT(DAY FROM (v_task.verified_at - v_contract.start_date))::INTEGER);
    
    -- حساب الغرامات
    v_late_penalty := LEAST(v_days_overdue * 120, 3000);
    
    -- إجمالي المطالبة
    v_claim_amount := v_overdue_amount + v_late_penalty + v_violations_amount;
    
    -- تخطي إذا لم يكن هناك مبلغ
    IF v_claim_amount <= 0 THEN
      RAISE NOTICE 'ℹ️ [BACKFILL] لا يوجد مبلغ للمطالبة للعميل: %', v_customer.first_name_ar;
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    -- تجهيز النصوص
    v_case_title := 'مطالبة مالية - ' || COALESCE(
      v_customer.company_name_ar,
      TRIM(COALESCE(v_customer.first_name_ar, '') || ' ' || COALESCE(v_customer.last_name_ar, '')),
      'عميل'
    );
    
    v_facts := format(
      'تأخر المدعى عليه في سداد المبالغ المستحقة عن عقد الإيجار رقم %s بتاريخ %s. المبلغ المستحق: %s ر.ق (إيجار: %s ر.ق + غرامات: %s ر.ق + مخالفات: %s ر.ق). عدد الفواتير المتأخرة: %s. عدد الأيام المتأخرة: %s يوم. تم التحقق من البيانات بواسطة: %s بتاريخ %s.',
      v_contract.contract_number,
      TO_CHAR(v_contract.start_date, 'DD/MM/YYYY'),
      v_claim_amount,
      v_overdue_amount,
      v_late_penalty,
      v_violations_amount,
      v_invoices_count,
      v_days_overdue,
      COALESCE(v_task.verifier_name, 'موظف'),
      TO_CHAR(v_task.verified_at, 'DD/MM/YYYY')
    );
    
    v_requests := format(
      'نلتمس من عدالة المحكمة الموقرة الحكم بإلزام المدعى عليه بأداء مبلغ %s ريال قطري والفوائد القانونية من تاريخ المطالبة وحتى السداد التام، مع إلزامه بالرسوم والمصاريف وأتعاب المحاماة.',
      v_claim_amount
    );
    
    -- إنشاء القضية
    BEGIN
      INSERT INTO lawsuit_templates (
        company_id,
        customer_id,
        contract_id,
        case_title,
        facts,
        requests,
        claim_amount,
        claim_amount_words,
        defendant_first_name,
        defendant_middle_name,
        defendant_last_name,
        defendant_nationality,
        defendant_id_number,
        defendant_address,
        defendant_phone,
        defendant_email,
        months_unpaid,
        overdue_amount,
        late_penalty,
        days_overdue,
        invoices_count,
        total_invoices_amount,
        total_penalties,
        violations_count,
        violations_amount,
        auto_created,
        verification_task_id
      ) VALUES (
        v_task.company_id,
        v_task.customer_id,
        v_task.contract_id,
        v_case_title,
        v_facts,
        v_requests,
        v_claim_amount,
        '', -- يمكن ملؤه لاحقاً
        v_customer.first_name_ar,
        v_customer.middle_name_ar,
        v_customer.last_name_ar,
        v_customer.nationality,
        v_customer.national_id,
        v_customer.address,
        v_customer.phone,
        v_customer.email,
        v_months_unpaid,
        v_overdue_amount,
        v_late_penalty,
        v_days_overdue,
        v_invoices_count,
        v_total_invoices_amount,
        v_late_penalty,
        v_violations_count,
        v_violations_amount,
        TRUE, -- auto_created
        v_task.id -- verification_task_id
      );
      
      v_created_count := v_created_count + 1;
      RAISE NOTICE '✅ [BACKFILL] تم إنشاء قضية: % (% ر.ق)', v_case_title, v_claim_amount;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ [BACKFILL] خطأ في إنشاء قضية للعميل %: %', v_customer.first_name_ar, SQLERRM;
        v_skipped_count := v_skipped_count + 1;
    END;
    
  END LOOP;
  
  -- ملخص النتائج
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '📊 [BACKFILL] ملخص العملية:';
  RAISE NOTICE '✅ تم إنشاء: % قضية', v_created_count;
  RAISE NOTICE '⏭️ تم تخطي: % عميل', v_skipped_count;
  RAISE NOTICE '📈 الإجمالي: % عميل', v_created_count + v_skipped_count;
  RAISE NOTICE '═══════════════════════════════════════';
  
  -- إنشاء سجل في جدول المراجعة إذا كان موجوداً
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_log') THEN
    INSERT INTO migration_log (migration_name, executed_at, description, details)
    VALUES (
      '20260131000002_backfill_lawsuits',
      NOW(),
      'إنشاء قضايا بأثر رجعي للعملاء المُدققين',
      jsonb_build_object(
        'created_count', v_created_count,
        'skipped_count', v_skipped_count,
        'total_processed', v_created_count + v_skipped_count
      )
    );
  END IF;
  
END $$;
-- ==========================================
-- التحقق من النتائج
-- ==========================================

-- عرض القضايا المنشأة
SELECT 
  case_title,
  defendant_first_name || ' ' || defendant_last_name as defendant,
  claim_amount,
  months_unpaid,
  overdue_amount,
  violations_count,
  auto_created,
  created_at
FROM lawsuit_templates
WHERE auto_created = TRUE
ORDER BY created_at DESC
LIMIT 25;
