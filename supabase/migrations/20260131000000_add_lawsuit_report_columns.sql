-- Migration: Add Report Columns to lawsuit_templates
-- Date: 2026-01-31
-- Description: إضافة أعمدة التقارير الثلاثة (المذكرة الشارحة، كشف المطالبات، كشف المخالفات)

-- ==========================================
-- 1. إضافة الأعمدة من المذكرة الشارحة
-- ==========================================

ALTER TABLE lawsuit_templates 
ADD COLUMN IF NOT EXISTS months_unpaid INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overdue_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_penalty DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0;

-- ==========================================
-- 2. إضافة الأعمدة من كشف المطالبات المالية
-- ==========================================

ALTER TABLE lawsuit_templates 
ADD COLUMN IF NOT EXISTS invoices_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_invoices_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_penalties DECIMAL(10,2) DEFAULT 0;

-- ==========================================
-- 3. إضافة الأعمدة من كشف المخالفات المرورية
-- ==========================================

ALTER TABLE lawsuit_templates 
ADD COLUMN IF NOT EXISTS violations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS violations_amount DECIMAL(10,2) DEFAULT 0;

-- ==========================================
-- 4. إضافة تعليقات توضيحية للأعمدة
-- ==========================================

COMMENT ON COLUMN lawsuit_templates.months_unpaid IS 'عدد الأشهر المتأخرة من المذكرة الشارحة';
COMMENT ON COLUMN lawsuit_templates.overdue_amount IS 'قيمة الإيجار المتأخر من المذكرة الشارحة (ر.ق)';
COMMENT ON COLUMN lawsuit_templates.late_penalty IS 'غرامات التأخير من المذكرة الشارحة (ر.ق)';
COMMENT ON COLUMN lawsuit_templates.days_overdue IS 'عدد الأيام المتأخرة من المذكرة الشارحة';

COMMENT ON COLUMN lawsuit_templates.invoices_count IS 'عدد الفواتير المتأخرة من كشف المطالبات المالية';
COMMENT ON COLUMN lawsuit_templates.total_invoices_amount IS 'إجمالي المبالغ المستحقة من كشف المطالبات (ر.ق)';
COMMENT ON COLUMN lawsuit_templates.total_penalties IS 'إجمالي الغرامات من كشف المطالبات المالية (ر.ق)';

COMMENT ON COLUMN lawsuit_templates.violations_count IS 'عدد المخالفات المرورية من كشف المخالفات';
COMMENT ON COLUMN lawsuit_templates.violations_amount IS 'قيمة المخالفات المرورية (ر.ق)';

-- ==========================================
-- 5. إضافة فهارس للأداء (اختياري)
-- ==========================================

-- فهرس لتسريع البحث حسب عدد الأشهر المتأخرة
CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_months_unpaid 
ON lawsuit_templates(months_unpaid) 
WHERE months_unpaid > 0;

-- فهرس لتسريع البحث حسب قيمة الإيجار المتأخر
CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_overdue_amount 
ON lawsuit_templates(overdue_amount) 
WHERE overdue_amount > 0;

-- فهرس لتسريع البحث حسب عدد المخالفات
CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_violations_count 
ON lawsuit_templates(violations_count) 
WHERE violations_count > 0;

-- ==========================================
-- 6. إضافة قيود التحقق (Constraints)
-- ==========================================

-- حذف القيود القديمة إذا كانت موجودة
DO $$ 
BEGIN
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_months_unpaid_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_overdue_amount_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_late_penalty_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_days_overdue_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_invoices_count_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_total_invoices_amount_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_total_penalties_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_violations_count_positive;
  ALTER TABLE lawsuit_templates DROP CONSTRAINT IF EXISTS check_violations_amount_positive;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- التأكد من أن القيم غير سالبة
ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_months_unpaid_positive 
CHECK (months_unpaid >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_overdue_amount_positive 
CHECK (overdue_amount >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_late_penalty_positive 
CHECK (late_penalty >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_days_overdue_positive 
CHECK (days_overdue >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_invoices_count_positive 
CHECK (invoices_count >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_total_invoices_amount_positive 
CHECK (total_invoices_amount >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_total_penalties_positive 
CHECK (total_penalties >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_violations_count_positive 
CHECK (violations_count >= 0);

ALTER TABLE lawsuit_templates 
ADD CONSTRAINT check_violations_amount_positive 
CHECK (violations_amount >= 0);

-- ==========================================
-- 7. تحديث RLS Policies (إذا لزم الأمر)
-- ==========================================

-- السياسات الحالية تغطي جميع الأعمدة، لا حاجة لتحديث

-- ==========================================
-- 8. إنشاء View للتقارير الموحدة (اختياري)
-- ==========================================

CREATE OR REPLACE VIEW lawsuit_templates_with_totals AS
SELECT 
  lt.*,
  -- حساب الإجمالي الكلي
  (COALESCE(lt.overdue_amount, 0) + 
   COALESCE(lt.late_penalty, 0) + 
   COALESCE(lt.total_invoices_amount, 0) + 
   COALESCE(lt.total_penalties, 0) + 
   COALESCE(lt.violations_amount, 0)) AS grand_total,
  
  -- حساب متوسط الإيجار الشهري المتأخر
  CASE 
    WHEN lt.months_unpaid > 0 THEN lt.overdue_amount / lt.months_unpaid
    ELSE 0
  END AS avg_monthly_overdue,
  
  -- حساب متوسط قيمة المخالفة
  CASE 
    WHEN lt.violations_count > 0 THEN lt.violations_amount / lt.violations_count
    ELSE 0
  END AS avg_violation_amount,
  
  -- حساب متوسط قيمة الفاتورة
  CASE 
    WHEN lt.invoices_count > 0 THEN lt.total_invoices_amount / lt.invoices_count
    ELSE 0
  END AS avg_invoice_amount
  
FROM lawsuit_templates lt;

-- إضافة تعليق على الـ View
COMMENT ON VIEW lawsuit_templates_with_totals IS 'عرض موحد لبيانات القضايا مع الحسابات الإجمالية والمتوسطات';

-- ==========================================
-- 9. إنشاء دالة للتحديث التلقائي (اختياري)
-- ==========================================

CREATE OR REPLACE FUNCTION update_lawsuit_report_data(
  p_lawsuit_id INTEGER,
  p_months_unpaid INTEGER DEFAULT NULL,
  p_overdue_amount DECIMAL DEFAULT NULL,
  p_late_penalty DECIMAL DEFAULT NULL,
  p_days_overdue INTEGER DEFAULT NULL,
  p_invoices_count INTEGER DEFAULT NULL,
  p_total_invoices_amount DECIMAL DEFAULT NULL,
  p_total_penalties DECIMAL DEFAULT NULL,
  p_violations_count INTEGER DEFAULT NULL,
  p_violations_amount DECIMAL DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lawsuit_templates
  SET 
    months_unpaid = COALESCE(p_months_unpaid, months_unpaid),
    overdue_amount = COALESCE(p_overdue_amount, overdue_amount),
    late_penalty = COALESCE(p_late_penalty, late_penalty),
    days_overdue = COALESCE(p_days_overdue, days_overdue),
    invoices_count = COALESCE(p_invoices_count, invoices_count),
    total_invoices_amount = COALESCE(p_total_invoices_amount, total_invoices_amount),
    total_penalties = COALESCE(p_total_penalties, total_penalties),
    violations_count = COALESCE(p_violations_count, violations_count),
    violations_amount = COALESCE(p_violations_amount, violations_amount),
    updated_at = NOW()
  WHERE id = p_lawsuit_id;
  
  RETURN FOUND;
END;
$$;

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION update_lawsuit_report_data IS 'تحديث بيانات التقارير لقضية معينة';

-- ==========================================
-- 10. إنشاء Trigger للتحديث التلقائي (اختياري)
-- ==========================================

-- دالة للتحقق من صحة البيانات قبل الإدراج/التحديث
CREATE OR REPLACE FUNCTION validate_lawsuit_report_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- التحقق من أن الإجمالي الكلي لا يتجاوز قيمة المطالبة
  IF (COALESCE(NEW.overdue_amount, 0) + 
      COALESCE(NEW.late_penalty, 0) + 
      COALESCE(NEW.total_invoices_amount, 0) + 
      COALESCE(NEW.total_penalties, 0) + 
      COALESCE(NEW.violations_amount, 0)) > NEW.claim_amount * 1.5 THEN
    RAISE WARNING 'الإجمالي الكلي يتجاوز قيمة المطالبة بأكثر من 50%%';
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء Trigger
DROP TRIGGER IF EXISTS validate_lawsuit_report_data_trigger ON lawsuit_templates;
CREATE TRIGGER validate_lawsuit_report_data_trigger
  BEFORE INSERT OR UPDATE ON lawsuit_templates
  FOR EACH ROW
  EXECUTE FUNCTION validate_lawsuit_report_data();

-- ==========================================
-- 11. Grant Permissions
-- ==========================================

-- السماح للمستخدمين المصرح لهم بالوصول للـ View
GRANT SELECT ON lawsuit_templates_with_totals TO authenticated;

-- السماح باستخدام الدالة
GRANT EXECUTE ON FUNCTION update_lawsuit_report_data TO authenticated;

-- ==========================================
-- Migration Complete
-- ==========================================

-- إضافة سجل في جدول المراجعة (إذا كان موجوداً)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_log') THEN
    INSERT INTO migration_log (migration_name, executed_at, description)
    VALUES (
      '20260131000000_add_lawsuit_report_columns',
      NOW(),
      'إضافة أعمدة التقارير الثلاثة إلى جدول lawsuit_templates'
    );
  END IF;
END $$;
