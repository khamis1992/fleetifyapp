-- Migration Part 5: Add Trigger and Permissions
-- Date: 2026-01-31

-- دالة للتحقق من صحة البيانات
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

-- السماح للمستخدمين بالوصول للـ View
GRANT SELECT ON lawsuit_templates_with_totals TO authenticated;

-- السماح باستخدام الدالة
GRANT EXECUTE ON FUNCTION update_lawsuit_report_data TO authenticated;;
