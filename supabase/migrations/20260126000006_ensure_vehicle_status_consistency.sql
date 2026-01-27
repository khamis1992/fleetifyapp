-- Function to sync vehicle status when contract becomes active
CREATE OR REPLACE FUNCTION public.sync_vehicle_status_on_contract_active()
RETURNS TRIGGER AS $$
BEGIN
  -- If contract becomes active (either inserted as active or updated to active)
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Update the associated vehicle to 'rented' if it's not already
    UPDATE vehicles
    SET status = 'rented', updated_at = NOW()
    WHERE id = NEW.vehicle_id AND status != 'rented';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function
DROP TRIGGER IF EXISTS on_contract_active_sync_vehicle ON contracts;
CREATE TRIGGER on_contract_active_sync_vehicle
AFTER INSERT OR UPDATE OF status ON contracts
FOR EACH ROW
EXECUTE FUNCTION public.sync_vehicle_status_on_contract_active();
