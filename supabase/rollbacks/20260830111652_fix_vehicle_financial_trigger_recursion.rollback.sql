BEGIN;

-- Restore the former broad trigger shape while retaining the null-safe function
-- guard so a rollback cannot reintroduce stack-depth recursion.
DROP TRIGGER IF EXISTS vehicle_financial_integration_trigger ON public.vehicles;
CREATE TRIGGER vehicle_financial_integration_trigger
AFTER INSERT OR UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.handle_vehicle_financial_integration();

COMMIT;
