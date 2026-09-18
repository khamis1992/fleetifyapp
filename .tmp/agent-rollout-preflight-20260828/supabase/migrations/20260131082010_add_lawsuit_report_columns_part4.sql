-- Migration Part 4: Create View and Functions
-- Date: 2026-01-31

-- إنشاء View للتقارير الموحدة
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

COMMENT ON VIEW lawsuit_templates_with_totals IS 'عرض موحد لبيانات القضايا مع الحسابات الإجمالية والمتوسطات';

-- إنشاء دالة للتحديث التلقائي
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

COMMENT ON FUNCTION update_lawsuit_report_data IS 'تحديث بيانات التقارير لقضية معينة';;
