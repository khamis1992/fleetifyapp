-- Migration Part 2: Add Comments and Indexes
-- Date: 2026-01-31

-- إضافة تعليقات توضيحية للأعمدة
COMMENT ON COLUMN lawsuit_templates.months_unpaid IS 'عدد الأشهر المتأخرة من المذكرة الشارحة';
COMMENT ON COLUMN lawsuit_templates.overdue_amount IS 'قيمة الإيجار المتأخر من المذكرة الشارحة (ر.ق)';
COMMENT ON COLUMN lawsuit_templates.late_penalty IS 'غرامات التأخير من المذكرة الشارحة (ر.ق)';
COMMENT ON COLUMN lawsuit_templates.days_overdue IS 'عدد الأيام المتأخرة من المذكرة الشارحة';

COMMENT ON COLUMN lawsuit_templates.invoices_count IS 'عدد الفواتير المتأخرة من كشف المطالبات المالية';
COMMENT ON COLUMN lawsuit_templates.total_invoices_amount IS 'إجمالي المبالغ المستحقة من كشف المطالبات (ر.ق)';
COMMENT ON COLUMN lawsuit_templates.total_penalties IS 'إجمالي الغرامات من كشف المطالبات المالية (ر.ق)';

COMMENT ON COLUMN lawsuit_templates.violations_count IS 'عدد المخالفات المرورية من كشف المخالفات';
COMMENT ON COLUMN lawsuit_templates.violations_amount IS 'قيمة المخالفات المرورية (ر.ق)';

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_months_unpaid 
ON lawsuit_templates(months_unpaid) 
WHERE months_unpaid > 0;

CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_overdue_amount 
ON lawsuit_templates(overdue_amount) 
WHERE overdue_amount > 0;

CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_violations_count 
ON lawsuit_templates(violations_count) 
WHERE violations_count > 0;;
