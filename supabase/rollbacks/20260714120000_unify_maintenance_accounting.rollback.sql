DROP TRIGGER IF EXISTS vehicle_maintenance_accounting_v1 ON public.vehicle_maintenance;
DROP FUNCTION IF EXISTS public.apply_vehicle_maintenance_accounting_v1();

CREATE TRIGGER maintenance_journal_trigger
BEFORE UPDATE ON public.vehicle_maintenance
FOR EACH ROW EXECUTE FUNCTION public.handle_maintenance_changes();

CREATE TRIGGER trigger_maintenance_accounting
BEFORE UPDATE ON public.vehicle_maintenance
FOR EACH ROW EXECUTE FUNCTION public.handle_maintenance_accounting();

CREATE TRIGGER trigger_maintenance_expense
AFTER UPDATE ON public.vehicle_maintenance
FOR EACH ROW EXECUTE FUNCTION public.trigger_maintenance_expense_entry();
