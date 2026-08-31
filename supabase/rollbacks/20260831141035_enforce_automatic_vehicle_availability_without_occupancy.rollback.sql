BEGIN;

DO $restore_backfill$
DECLARE
  v_audit record;
BEGIN
  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  FOR v_audit IN
    SELECT audit.*
    FROM public.audit_logs audit
    WHERE audit.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
      AND audit.action = 'VEHICLE_AUTOMATICALLY_RELEASED_WITHOUT_OCCUPANCY'
      AND audit.metadata ->> 'migration_key' =
        '20260831141035_enforce_automatic_vehicle_availability_without_occupancy'
      AND audit.status = 'success'
    ORDER BY audit.created_at DESC
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.vehicles vehicle
      WHERE vehicle.id = v_audit.resource_id
        AND vehicle.company_id = v_audit.company_id
        AND vehicle.status::text = v_audit.new_values ->> 'status'
    ) THEN
      UPDATE public.fleet_reconciliation_assignments assignment
      SET is_active = true,
          closed_at = NULL,
          closed_reason = NULL
      WHERE assignment.id IN (
        SELECT value::uuid
        FROM jsonb_array_elements_text(
          COALESCE(v_audit.metadata -> 'previous_assignment_ids', '[]'::jsonb)
        ) ids(value)
      )
        AND assignment.company_id = v_audit.company_id
        AND assignment.vehicle_id = v_audit.resource_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.fleet_reconciliation_assignments active_assignment
          WHERE active_assignment.company_id = assignment.company_id
            AND active_assignment.vehicle_id = assignment.vehicle_id
            AND active_assignment.is_active
        );

      UPDATE public.vehicles vehicle
      SET status = (v_audit.old_values ->> 'status')::public.vehicle_status,
          updated_at = now()
      WHERE vehicle.id = v_audit.resource_id
        AND vehicle.company_id = v_audit.company_id;
    END IF;
  END LOOP;
END;
$restore_backfill$;

DROP TRIGGER IF EXISTS trg_refresh_vehicle_status_on_reservation_change_v1
  ON public.vehicle_reservations;
DROP FUNCTION IF EXISTS public.refresh_vehicle_status_on_reservation_change_v1();

CREATE OR REPLACE FUNCTION public.update_vehicle_status_on_maintenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    IF NEW.status = 'in_progress' THEN
      UPDATE public.vehicles SET status = 'maintenance', updated_at = now()
      WHERE id = NEW.vehicle_id;
    ELSIF NEW.status = 'completed' THEN
      UPDATE public.vehicles SET status = 'available', updated_at = now()
      WHERE id = NEW.vehicle_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_update_vehicle_status_on_maintenance
  ON public.vehicle_maintenance;
CREATE TRIGGER trigger_update_vehicle_status_on_maintenance
AFTER INSERT OR UPDATE ON public.vehicle_maintenance
FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_status_on_maintenance();

-- Restore the previous reconciliation-override derivation and contract trigger
-- from migration 20260830110005.
CREATE OR REPLACE FUNCTION public.system_agent_vehicle_derived_state(
  p_vehicle_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_vehicle public.vehicles%ROWTYPE;
  v_has_active_contract boolean := false;
  v_has_open_maintenance boolean := false;
  v_has_active_reservation boolean := false;
  v_override_status text;
  v_override_assignment_id uuid;
  v_target_status text;
  v_maximum_mileage numeric := 0;
BEGIN
  SELECT * INTO v_vehicle FROM public.vehicles vehicle
  WHERE vehicle.id = p_vehicle_id AND vehicle.company_id = p_company_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT assignment.id, assignment.target_status::text
  INTO v_override_assignment_id, v_override_status
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.company_id = p_company_id
    AND assignment.vehicle_id = p_vehicle_id
    AND assignment.is_active
    AND NOT EXISTS (
      SELECT 1 FROM public.contracts newer_contract
      WHERE newer_contract.company_id = assignment.company_id
        AND newer_contract.vehicle_id = assignment.vehicle_id
        AND newer_contract.created_at > assignment.created_at
        AND (
          lower(COALESCE(newer_contract.status::text, '')) = 'active'
          OR (
            lower(COALESCE(newer_contract.status::text, '')) = 'under_legal_procedure'
            AND COALESCE(newer_contract.vehicle_returned, false) = false
          )
        )
        AND newer_contract.start_date <= CURRENT_DATE
        AND newer_contract.end_date >= CURRENT_DATE
    )
  ORDER BY assignment.created_at DESC, assignment.id DESC LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.company_id = p_company_id
      AND contract.vehicle_id = p_vehicle_id
      AND (
        lower(COALESCE(contract.status::text, '')) = 'active'
        OR (
          lower(COALESCE(contract.status::text, '')) = 'under_legal_procedure'
          AND COALESCE(contract.vehicle_returned, false) = false
        )
      )
      AND contract.start_date <= CURRENT_DATE
      AND contract.end_date >= CURRENT_DATE
  ) INTO v_has_active_contract;

  SELECT EXISTS (
    SELECT 1 FROM public.vehicle_maintenance maintenance
    WHERE maintenance.company_id = p_company_id
      AND maintenance.vehicle_id = p_vehicle_id
      AND lower(COALESCE(maintenance.status::text, '')) = 'in_progress'
  ) INTO v_has_open_maintenance;

  SELECT EXISTS (
    SELECT 1 FROM public.vehicle_reservations reservation
    WHERE reservation.company_id = p_company_id
      AND reservation.vehicle_id = p_vehicle_id
      AND lower(COALESCE(reservation.status::text, '')) NOT IN (
        'cancelled', 'canceled', 'completed', 'expired'
      )
      AND reservation.start_date <= CURRENT_DATE
      AND reservation.end_date >= CURRENT_DATE
  ) INTO v_has_active_reservation;

  v_target_status := CASE
    WHEN v_override_status IS NOT NULL THEN v_override_status
    WHEN lower(COALESCE(v_vehicle.status::text, '')) IN (
      'maintenance', 'accident', 'stolen', 'police_station',
      'out_of_service', 'reserved_employee', 'municipality'
    ) THEN NULL
    WHEN v_has_open_maintenance THEN 'maintenance'
    WHEN v_has_active_contract THEN 'rented'
    WHEN v_has_active_reservation THEN 'street_52'
    WHEN lower(COALESCE(v_vehicle.status::text, '')) = 'street_52' THEN NULL
    WHEN v_vehicle.is_active = false THEN 'out_of_service'
    ELSE 'available'
  END;

  SELECT GREATEST(
    COALESCE(v_vehicle.current_mileage, 0),
    COALESCE(v_vehicle.odometer_reading, 0),
    COALESCE(MAX(reading.odometer_reading), 0)
  ) INTO v_maximum_mileage
  FROM public.odometer_readings reading
  WHERE reading.company_id = p_company_id AND reading.vehicle_id = p_vehicle_id;

  RETURN jsonb_build_object(
    'target_status', v_target_status,
    'maximum_mileage', round(v_maximum_mileage::numeric, 2),
    'has_active_contract', v_has_active_contract,
    'has_open_maintenance', v_has_open_maintenance,
    'has_active_reservation', v_has_active_reservation,
    'reconciliation_assignment_id', v_override_assignment_id,
    'reconciliation_override_status', v_override_status
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_vehicle_status_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_state jsonb;
  v_target text;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.vehicle_id IS NOT NULL THEN
    v_state := public.system_agent_vehicle_derived_state(OLD.vehicle_id, OLD.company_id);
    v_target := NULLIF(BTRIM(v_state ->> 'target_status'), '');
    IF v_target IS NOT NULL THEN
      UPDATE public.vehicles SET status = v_target::public.vehicle_status, updated_at = now()
      WHERE id = OLD.vehicle_id AND company_id = OLD.company_id
        AND status IS DISTINCT FROM v_target::public.vehicle_status;
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' AND NEW.vehicle_id IS NOT NULL THEN
    v_state := public.system_agent_vehicle_derived_state(NEW.vehicle_id, NEW.company_id);
    v_target := NULLIF(BTRIM(v_state ->> 'target_status'), '');
    IF v_target IS NOT NULL THEN
      UPDATE public.vehicles SET status = v_target::public.vehicle_status, updated_at = now()
      WHERE id = NEW.vehicle_id AND company_id = NEW.company_id
        AND status IS DISTINCT FROM v_target::public.vehicle_status;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- The replacement contract and maintenance trigger functions no longer depend
-- on the shared refresher, so it is now safe to remove it without CASCADE.
DROP FUNCTION IF EXISTS public.refresh_vehicle_operational_status_v1(uuid, uuid);

COMMIT;
