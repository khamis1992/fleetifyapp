CREATE OR REPLACE FUNCTION public.update_vehicle_status_on_contract_change()
RETURNS TRIGGER AS $$
DECLARE
  has_active_contract BOOLEAN;
BEGIN
  -- التحقق من وجود عقد نشط على المركبة
  SELECT EXISTS (
    SELECT 1 FROM public.contracts 
    WHERE vehicle_id = COALESCE(NEW.vehicle_id, OLD.vehicle_id)
      AND status = 'active'
  ) INTO has_active_contract;
  
  -- تحديث حالة المركبة
  IF has_active_contract THEN
    UPDATE public.vehicles 
    SET status = 'rented', updated_at = NOW()
    WHERE id = COALESCE(NEW.vehicle_id, OLD.vehicle_id)
      AND status != 'rented';
  ELSE
    UPDATE public.vehicles 
    SET status = 'available', updated_at = NOW()
    WHERE id = COALESCE(NEW.vehicle_id, OLD.vehicle_id)
      AND status = 'rented';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
