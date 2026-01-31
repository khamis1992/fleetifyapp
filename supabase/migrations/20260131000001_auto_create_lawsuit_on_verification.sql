-- Migration: Auto Create Lawsuit on Customer Verification
-- Date: 2026-01-31
-- Description: إنشاء قضية تلقائياً في lawsuit_templates عند التحقق من العميل

-- ==========================================
-- 1. إنشاء دالة لإنشاء القضية التلقائية
-- ==========================================

CREATE OR REPLACE FUNCTION auto_create_lawsuit_on_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_customer RECORD;
  v_vehicle RECORD;
  v_overdue_amount DECIMAL DEFAULT 0;
  v_late_penalty DECIMAL DEFAULT 0;
  v_months_unpaid INTEGER DEFAULT 0;
  v_days_overdue INTEGER DEFAULT 0;
  v_invoices_count INTEGER DEFAULT 0;
  v_total_invoices_amount DECIMAL DEFAULT 0;
  v_violations_count INTEGER DEFAULT 0;
  v_violations_amount DECIMAL DEFAULT 0;
  v_claim_amount DECIMAL DEFAULT 0;
  v_case_title TEXT;
  v_facts TEXT;
  v_requests TEXT;
BEGIN
  -- فقط عند التحقق (status = 'verified' والحالة السابقة ليست verified)
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    
    RAISE NOTICE '🔄 [AUTO_LAWSUIT] بدء إنشاء قضية تلقائية للمهمة: %', NEW.id;
    
    -- ==========================================
    -- 2. جلب بيانات العقد
    -- ==========================================
    
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = NEW.contract_id;
    
    IF NOT FOUND THEN
      RAISE WARNING '⚠️ [AUTO_LAWSUIT] لم يتم العثور على العقد: %', NEW.contract_id;
      RETURN NEW;
    END IF;
    
    -- ==========================================
    -- 3. جلب بيانات العميل
    -- ==========================================
    
    SELECT * INTO v_customer
    FROM customers
    WHERE id = NEW.customer_id;
    
    IF NOT FOUND THEN
      RAISE WARNING '⚠️ [AUTO_LAWSUIT] لم يتم العثور على العميل: %', NEW.customer_id;
      RETURN NEW;
    END IF;
    
    -- التحقق من اكتمال البيانات الأساسية
    IF v_customer.national_id IS NULL OR v_customer.phone IS NULL THEN
      RAISE WARNING '⚠️ [AUTO_LAWSUIT] بيانات العميل غير مكتملة (رقم الهوية أو الهاتف مفقود)';
      RETURN NEW;
    END IF;
    
    -- ==========================================
    -- 4. جلب بيانات المركبة (اختياري)
    -- ==========================================
    
    IF v_contract.vehicle_id IS NOT NULL THEN
      SELECT * INTO v_vehicle
      FROM vehicles
      WHERE id = v_contract.vehicle_id;
    END IF;
    
    -- ==========================================
    -- 5. حساب المبالغ المتأخرة من الفواتير
    -- ==========================================
    
    SELECT 
      COUNT(*) as invoices_count,
      SUM(total_amount - paid_amount) as overdue_amount
    INTO v_invoices_count, v_overdue_amount
    FROM invoices
    WHERE contract_id = NEW.contract_id
    AND (total_amount - COALESCE(paid_amount, 0)) > 0
    AND status != 'cancelled';
    
    -- تعيين قيم افتراضية إذا كانت NULL
    v_invoices_count := COALESCE(v_invoices_count, 0);
    v_overdue_amount := COALESCE(v_overdue_amount, 0);
    v_total_invoices_amount := v_overdue_amount;
    
    -- ==========================================
    -- 6. حساب المخالفات المرورية
    -- ==========================================
    
    SELECT 
      COUNT(*) as violations_count,
      SUM(COALESCE(fine_amount, 0)) as violations_amount
    INTO v_violations_count, v_violations_amount
    FROM traffic_violations
    WHERE contract_id = NEW.contract_id
    AND payment_status != 'paid';
    
    -- تعيين قيم افتراضية
    v_violations_count := COALESCE(v_violations_count, 0);
    v_violations_amount := COALESCE(v_violations_amount, 0);
    
    -- ==========================================
    -- 7. حساب الأشهر والأيام المتأخرة
    -- ==========================================
    
    v_months_unpaid := v_invoices_count;
    v_days_overdue := GREATEST(0, EXTRACT(DAY FROM (NOW() - v_contract.start_date))::INTEGER);
    
    -- ==========================================
    -- 8. حساب غرامات التأخير (120 ر.ق/يوم، حد أقصى 3000)
    -- ==========================================
    
    v_late_penalty := LEAST(v_days_overdue * 120, 3000);
    
    -- ==========================================
    -- 9. حساب إجمالي المطالبة
    -- ==========================================
    
    v_claim_amount := v_overdue_amount + v_late_penalty + v_violations_amount;
    
    -- تحقق من وجود مبلغ للمطالبة
    IF v_claim_amount <= 0 THEN
      RAISE NOTICE 'ℹ️ [AUTO_LAWSUIT] لا يوجد مبلغ للمطالبة - لن يتم إنشاء القضية';
      RETURN NEW;
    END IF;
    
    -- ==========================================
    -- 10. تجهيز نصوص القضية
    -- ==========================================
    
    -- عنوان القضية
    v_case_title := 'مطالبة مالية - ' || COALESCE(
      v_customer.company_name_ar,
      TRIM(COALESCE(v_customer.first_name_ar, '') || ' ' || COALESCE(v_customer.last_name_ar, '')),
      'عميل'
    );
    
    -- الوقائع
    v_facts := format(
      'تأخر المدعى عليه في سداد المبالغ المستحقة عن عقد الإيجار رقم %s بتاريخ %s. المبلغ المستحق: %s ر.ق (إيجار: %s ر.ق + غرامات: %s ر.ق + مخالفات: %s ر.ق). عدد الفواتير المتأخرة: %s. عدد المخالفات: %s.',
      v_contract.contract_number,
      TO_CHAR(v_contract.start_date, 'DD/MM/YYYY'),
      v_claim_amount,
      v_overdue_amount,
      v_late_penalty,
      v_violations_amount,
      v_invoices_count,
      v_violations_count
    );
    
    -- الطلبات
    v_requests := format(
      'نلتمس من عدالة المحكمة الموقرة الحكم بإلزام المدعى عليه بأداء مبلغ %s ريال قطري والفوائد القانونية من تاريخ المطالبة وحتى السداد التام، مع إلزامه بالرسوم والمصاريف وأتعاب المحاماة.',
      v_claim_amount
    );
    
    -- ==========================================
    -- 11. التحقق من عدم وجود قضية مسبقاً
    -- ==========================================
    
    IF EXISTS (
      SELECT 1 FROM lawsuit_templates 
      WHERE contract_id = NEW.contract_id
      AND customer_id = NEW.customer_id
    ) THEN
      RAISE NOTICE 'ℹ️ [AUTO_LAWSUIT] قضية موجودة مسبقاً للعقد: %', NEW.contract_id;
      RETURN NEW;
    END IF;
    
    -- ==========================================
    -- 12. إنشاء القضية في lawsuit_templates
    -- ==========================================
    
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
        -- من المذكرة الشارحة
        months_unpaid,
        overdue_amount,
        late_penalty,
        days_overdue,
        -- من كشف المطالبات المالية
        invoices_count,
        total_invoices_amount,
        total_penalties,
        -- من كشف المخالفات المرورية
        violations_count,
        violations_amount
      ) VALUES (
        NEW.company_id,
        NEW.customer_id,
        NEW.contract_id,
        v_case_title,
        v_facts,
        v_requests,
        v_claim_amount,
        '', -- سيتم ملؤه لاحقاً أو عبر دالة تحويل الأرقام لكلمات
        v_customer.first_name_ar,
        v_customer.middle_name_ar,
        v_customer.last_name_ar,
        v_customer.nationality,
        v_customer.national_id,
        v_customer.address,
        v_customer.phone,
        v_customer.email,
        -- من المذكرة الشارحة
        v_months_unpaid,
        v_overdue_amount,
        v_late_penalty,
        v_days_overdue,
        -- من كشف المطالبات
        v_invoices_count,
        v_total_invoices_amount,
        v_late_penalty, -- إجمالي الغرامات
        -- من كشف المخالفات
        v_violations_count,
        v_violations_amount
      );
      
      RAISE NOTICE '✅ [AUTO_LAWSUIT] تم إنشاء قضية تلقائياً: %', v_case_title;
      
      -- ==========================================
      -- 13. إنشاء إشعار للموظف المحقق (اختياري)
      -- ==========================================
      
      IF NEW.verified_by IS NOT NULL THEN
        INSERT INTO user_notifications (
          user_id,
          title,
          message,
          type,
          related_type,
          related_id,
          company_id
        )
        SELECT 
          p.user_id,
          'تم إنشاء قضية تلقائياً',
          format('تم إنشاء قضية قانونية تلقائياً للعميل %s بمبلغ %s ر.ق', 
                 v_case_title, 
                 v_claim_amount),
          'success',
          'lawsuit_created',
          NEW.id,
          NEW.company_id
        FROM profiles p
        WHERE p.id = NEW.verified_by;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ [AUTO_LAWSUIT] خطأ في إنشاء القضية: %', SQLERRM;
        -- لا نوقف عملية التحقق إذا فشل إنشاء القضية
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- ==========================================
-- 14. إنشاء Trigger
-- ==========================================

DROP TRIGGER IF EXISTS auto_create_lawsuit_trigger ON customer_verification_tasks;
CREATE TRIGGER auto_create_lawsuit_trigger
  AFTER UPDATE ON customer_verification_tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_lawsuit_on_verification();

-- ==========================================
-- 15. إضافة عمود لتتبع القضايا المنشأة تلقائياً (اختياري)
-- ==========================================

ALTER TABLE lawsuit_templates 
ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_task_id UUID REFERENCES customer_verification_tasks(id);

COMMENT ON COLUMN lawsuit_templates.auto_created IS 'تم إنشاء القضية تلقائياً عند التحقق من العميل';
COMMENT ON COLUMN lawsuit_templates.verification_task_id IS 'معرف مهمة التحقق المرتبطة';

-- ==========================================
-- 16. تحديث الدالة لتسجيل auto_created
-- ==========================================

CREATE OR REPLACE FUNCTION auto_create_lawsuit_on_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_customer RECORD;
  v_vehicle RECORD;
  v_overdue_amount DECIMAL DEFAULT 0;
  v_late_penalty DECIMAL DEFAULT 0;
  v_months_unpaid INTEGER DEFAULT 0;
  v_days_overdue INTEGER DEFAULT 0;
  v_invoices_count INTEGER DEFAULT 0;
  v_total_invoices_amount DECIMAL DEFAULT 0;
  v_violations_count INTEGER DEFAULT 0;
  v_violations_amount DECIMAL DEFAULT 0;
  v_claim_amount DECIMAL DEFAULT 0;
  v_case_title TEXT;
  v_facts TEXT;
  v_requests TEXT;
BEGIN
  -- فقط عند التحقق
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    
    RAISE NOTICE '🔄 [AUTO_LAWSUIT] بدء إنشاء قضية تلقائية للمهمة: %', NEW.id;
    
    -- جلب بيانات العقد
    SELECT * INTO v_contract FROM contracts WHERE id = NEW.contract_id;
    IF NOT FOUND THEN RETURN NEW; END IF;
    
    -- جلب بيانات العميل
    SELECT * INTO v_customer FROM customers WHERE id = NEW.customer_id;
    IF NOT FOUND THEN RETURN NEW; END IF;
    
    -- التحقق من البيانات الأساسية
    IF v_customer.national_id IS NULL OR v_customer.phone IS NULL THEN
      RAISE WARNING '⚠️ [AUTO_LAWSUIT] بيانات العميل غير مكتملة';
      RETURN NEW;
    END IF;
    
    -- جلب المركبة
    IF v_contract.vehicle_id IS NOT NULL THEN
      SELECT * INTO v_vehicle FROM vehicles WHERE id = v_contract.vehicle_id;
    END IF;
    
    -- حساب المبالغ المتأخرة
    SELECT 
      COUNT(*),
      SUM(total_amount - COALESCE(paid_amount, 0))
    INTO v_invoices_count, v_overdue_amount
    FROM invoices
    WHERE contract_id = NEW.contract_id
    AND (total_amount - COALESCE(paid_amount, 0)) > 0
    AND status != 'cancelled';
    
    v_invoices_count := COALESCE(v_invoices_count, 0);
    v_overdue_amount := COALESCE(v_overdue_amount, 0);
    v_total_invoices_amount := v_overdue_amount;
    
    -- حساب المخالفات
    SELECT 
      COUNT(*),
      SUM(COALESCE(fine_amount, 0))
    INTO v_violations_count, v_violations_amount
    FROM traffic_violations
    WHERE contract_id = NEW.contract_id
    AND payment_status != 'paid';
    
    v_violations_count := COALESCE(v_violations_count, 0);
    v_violations_amount := COALESCE(v_violations_amount, 0);
    
    -- حساب الأشهر والأيام
    v_months_unpaid := v_invoices_count;
    v_days_overdue := GREATEST(0, EXTRACT(DAY FROM (NOW() - v_contract.start_date))::INTEGER);
    
    -- حساب الغرامات
    v_late_penalty := LEAST(v_days_overdue * 120, 3000);
    
    -- إجمالي المطالبة
    v_claim_amount := v_overdue_amount + v_late_penalty + v_violations_amount;
    
    -- تحقق من وجود مبلغ
    IF v_claim_amount <= 0 THEN
      RAISE NOTICE 'ℹ️ [AUTO_LAWSUIT] لا يوجد مبلغ للمطالبة';
      RETURN NEW;
    END IF;
    
    -- تجهيز النصوص
    v_case_title := 'مطالبة مالية - ' || COALESCE(
      v_customer.company_name_ar,
      TRIM(COALESCE(v_customer.first_name_ar, '') || ' ' || COALESCE(v_customer.last_name_ar, '')),
      'عميل'
    );
    
    v_facts := format(
      'تأخر المدعى عليه في سداد المبالغ المستحقة عن عقد الإيجار رقم %s بتاريخ %s. المبلغ المستحق: %s ر.ق (إيجار: %s ر.ق + غرامات: %s ر.ق + مخالفات: %s ر.ق). عدد الفواتير المتأخرة: %s. عدد المخالفات: %s. عدد الأيام المتأخرة: %s يوم.',
      v_contract.contract_number,
      TO_CHAR(v_contract.start_date, 'DD/MM/YYYY'),
      v_claim_amount,
      v_overdue_amount,
      v_late_penalty,
      v_violations_amount,
      v_invoices_count,
      v_violations_count,
      v_days_overdue
    );
    
    v_requests := format(
      'نلتمس من عدالة المحكمة الموقرة الحكم بإلزام المدعى عليه بأداء مبلغ %s ريال قطري والفوائد القانونية من تاريخ المطالبة وحتى السداد التام، مع إلزامه بالرسوم والمصاريف وأتعاب المحاماة.',
      v_claim_amount
    );
    
    -- التحقق من عدم وجود قضية مسبقاً
    IF EXISTS (
      SELECT 1 FROM lawsuit_templates 
      WHERE contract_id = NEW.contract_id
      AND customer_id = NEW.customer_id
    ) THEN
      RAISE NOTICE 'ℹ️ [AUTO_LAWSUIT] قضية موجودة مسبقاً للعقد';
      RETURN NEW;
    END IF;
    
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
        NEW.company_id,
        NEW.customer_id,
        NEW.contract_id,
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
        NEW.id -- verification_task_id
      );
      
      RAISE NOTICE '✅ [AUTO_LAWSUIT] تم إنشاء قضية تلقائياً: %', v_case_title;
      
      -- إنشاء إشعار للموظف
      IF NEW.verified_by IS NOT NULL THEN
        INSERT INTO user_notifications (
          user_id,
          title,
          message,
          type,
          related_type,
          related_id,
          company_id
        )
        SELECT 
          p.user_id,
          'تم إنشاء قضية تلقائياً',
          format('تم إنشاء قضية قانونية تلقائياً للعميل %s بمبلغ %s ر.ق', 
                 v_case_title, 
                 v_claim_amount),
          'success',
          'lawsuit_created',
          NEW.id,
          NEW.company_id
        FROM profiles p
        WHERE p.id = NEW.verified_by;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ [AUTO_LAWSUIT] خطأ في إنشاء القضية: %', SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- إعادة إنشاء Trigger
DROP TRIGGER IF EXISTS auto_create_lawsuit_trigger ON customer_verification_tasks;
CREATE TRIGGER auto_create_lawsuit_trigger
  AFTER UPDATE ON customer_verification_tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_lawsuit_on_verification();

-- ==========================================
-- 17. Grant Permissions
-- ==========================================

GRANT EXECUTE ON FUNCTION auto_create_lawsuit_on_verification TO authenticated;

-- ==========================================
-- 18. إضافة تعليقات
-- ==========================================

COMMENT ON FUNCTION auto_create_lawsuit_on_verification IS 'إنشاء قضية تلقائياً في lawsuit_templates عند التحقق من العميل';
COMMENT ON TRIGGER auto_create_lawsuit_trigger ON customer_verification_tasks IS 'يتم تشغيله عند تحديث حالة التحقق إلى verified';
