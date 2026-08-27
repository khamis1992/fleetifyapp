-- Rollback: Auto-link contracts to vehicles
DROP TRIGGER IF EXISTS trg_auto_link_contract_to_vehicle ON public.contracts;
DROP FUNCTION IF EXISTS public.auto_link_contract_to_vehicle();

-- Note: The backfill data changes are intentionally NOT rolled back
-- as they represent correct data corrections. To undo those changes,
-- manually reset vehicle_id to NULL for affected contracts if needed.
