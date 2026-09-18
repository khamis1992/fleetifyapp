-- Prevent the vehicle financial integration trigger from recursively firing
-- on status, location, timestamps, and the cost totals it writes itself.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_vehicle_financial_integration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  purchase_journal_id uuid;
  fixed_asset_id uuid;
  maint_ops_center_id uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.purchase_cost IS NOT DISTINCT FROM NEW.purchase_cost
     AND OLD.cost_center_id IS NOT DISTINCT FROM NEW.cost_center_id
  THEN
    RETURN NEW;
  END IF;

  SELECT id INTO maint_ops_center_id
  FROM public.cost_centers
  WHERE company_id = NEW.company_id
    AND center_code = 'MAINT_OPS'
    AND is_active = true
  LIMIT 1;

  IF NEW.cost_center_id IS NULL AND maint_ops_center_id IS NOT NULL THEN
    UPDATE public.vehicles
    SET cost_center_id = maint_ops_center_id
    WHERE id = NEW.id
      AND cost_center_id IS NULL;
  END IF;

  IF TG_OP = 'INSERT' AND COALESCE(NEW.purchase_cost, 0) > 0 THEN
    BEGIN
      fixed_asset_id := public.create_vehicle_fixed_asset_entry(NEW.id);

      IF fixed_asset_id IS NOT NULL THEN
        UPDATE public.vehicles
        SET fixed_asset_id = fixed_asset_id
        WHERE id = NEW.id;
      END IF;

      purchase_journal_id := public.create_vehicle_purchase_journal_entry(NEW.id);

      IF purchase_journal_id IS NOT NULL THEN
        UPDATE public.vehicles
        SET journal_entry_id = purchase_journal_id
        WHERE id = NEW.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create financial entries for vehicle %: %', NEW.id, SQLERRM;
    END;
  END IF;

  BEGIN
    PERFORM public.calculate_vehicle_total_costs(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to calculate total costs for vehicle %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS vehicle_financial_integration_trigger ON public.vehicles;
CREATE TRIGGER vehicle_financial_integration_trigger
AFTER INSERT OR UPDATE OF purchase_cost, cost_center_id ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.handle_vehicle_financial_integration();

COMMENT ON FUNCTION public.handle_vehicle_financial_integration() IS
'Creates initial vehicle financial records and recalculates costs without recursively reacting to unrelated vehicle updates.';

COMMIT;
