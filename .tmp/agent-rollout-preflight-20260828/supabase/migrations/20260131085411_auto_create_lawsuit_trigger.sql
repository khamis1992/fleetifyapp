-- Create trigger for auto-creating lawsuits
DROP TRIGGER IF EXISTS auto_create_lawsuit_trigger ON customer_verification_tasks;

CREATE TRIGGER auto_create_lawsuit_trigger
  AFTER UPDATE ON customer_verification_tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_lawsuit_on_verification();

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_create_lawsuit_on_verification TO authenticated;

-- Add comments
COMMENT ON FUNCTION auto_create_lawsuit_on_verification IS 'إنشاء قضية تلقائياً في lawsuit_templates عند التحقق من العميل';
COMMENT ON TRIGGER auto_create_lawsuit_trigger ON customer_verification_tasks IS 'يتم تشغيله عند تحديث حالة التحقق إلى verified';;
