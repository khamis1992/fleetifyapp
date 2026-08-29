-- دالة لتحديث حالة المركبة تلقائياً بناءً على حالة العقود
CREATE OR REPLACE FUNCTION update_vehicle_status_on_contract_change()
RETURNS TRIGGER AS $$
DECLARE
  has_active_contract BOOLEAN;
BEGIN
  -- التحقق من وجود عقد نشط على المركبة
  SELECT EXISTS (
    SELECT 1 FROM contracts 
    WHERE vehicle_id = COALESCE(NEW.vehicle_id, OLD.vehicle_id)
      AND status = 'active'
  ) INTO has_active_contract;
  
  -- تحديث حالة المركبة
  IF has_active_contract THEN
    UPDATE vehicles 
    SET status = 'rented', updated_at = NOW()
    WHERE id = COALESCE(NEW.vehicle_id, OLD.vehicle_id)
      AND status != 'rented';
  ELSE
    UPDATE vehicles 
    SET status = 'available', updated_at = NOW()
    WHERE id = COALESCE(NEW.vehicle_id, OLD.vehicle_id)
      AND status = 'rented';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- حذف الـ trigger القديم إذا وجد
DROP TRIGGER IF EXISTS trigger_update_vehicle_status ON contracts;

-- إنشاء trigger جديد
CREATE TRIGGER trigger_update_vehicle_status
AFTER INSERT OR UPDATE OF status, vehicle_id OR DELETE ON contracts
FOR EACH ROW
EXECUTE FUNCTION update_vehicle_status_on_contract_change();

-- إضافة تعليق توضيحي
COMMENT ON FUNCTION update_vehicle_status_on_contract_change() IS 'تحديث حالة المركبة تلقائياً عند تغيير حالة العقد';;
