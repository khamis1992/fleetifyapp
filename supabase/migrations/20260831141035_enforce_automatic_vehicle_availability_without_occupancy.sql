-- Make live operational evidence authoritative for rentable vehicle status.
-- A reconciliation import may provide evidence, but cannot keep a vehicle
-- rented without a current occupying contract.

BEGIN;

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
  v_has_occupying_contract boolean := false;
  v_has_open_maintenance boolean := false;
  v_has_active_reservation boolean := false;
  v_override_status text;
  v_override_assignment_id uuid;
  v_target_status text;
  v_maximum_mileage numeric := 0;
BEGIN
  SELECT * INTO v_vehicle
  FROM public.vehicles vehicle
  WHERE vehicle.id = p_vehicle_id
    AND vehicle.company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT assignment.id, assignment.target_status::text
  INTO v_override_assignment_id, v_override_status
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.company_id = p_company_id
    AND assignment.vehicle_id = p_vehicle_id
    AND assignment.is_active
  ORDER BY assignment.created_at DESC, assignment.id DESC
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.company_id = p_company_id
      AND contract.vehicle_id = p_vehicle_id
      AND contract.start_date <= CURRENT_DATE
      AND contract.end_date >= CURRENT_DATE
      AND COALESCE(contract.vehicle_returned, false) = false
      AND (
        lower(COALESCE(contract.status, '')) IN ('active', 'suspended')
        OR lower(COALESCE(contract.status, '')) = 'under_legal_procedure'
      )
  ) INTO v_has_occupying_contract;

  SELECT EXISTS (
    SELECT 1
    FROM public.vehicle_maintenance maintenance
    WHERE maintenance.company_id = p_company_id
      AND maintenance.vehicle_id = p_vehicle_id
      AND lower(COALESCE(maintenance.status::text, '')) = 'in_progress'
  ) INTO v_has_open_maintenance;

  SELECT EXISTS (
    SELECT 1
    FROM public.vehicle_reservations reservation
    WHERE reservation.company_id = p_company_id
      AND reservation.vehicle_id = p_vehicle_id
      AND lower(COALESCE(reservation.status::text, '')) NOT IN (
        'cancelled', 'canceled', 'completed', 'expired'
      )
      AND reservation.start_date::date <= CURRENT_DATE
      AND reservation.end_date::date >= CURRENT_DATE
  ) INTO v_has_active_reservation;

  v_target_status := CASE
    WHEN v_vehicle.is_active = false THEN 'out_of_service'
    WHEN lower(COALESCE(v_vehicle.status::text, '')) IN (
      'accident', 'stolen', 'police_station', 'out_of_service',
      'reserved_employee', 'municipality'
    ) THEN NULL
    WHEN lower(COALESCE(v_override_status, '')) IN (
      'accident', 'stolen', 'police_station', 'out_of_service',
      'reserved_employee', 'municipality'
    ) THEN v_override_status
    WHEN v_has_open_maintenance THEN 'maintenance'
    WHEN v_has_occupying_contract THEN 'rented'
    WHEN v_has_active_reservation THEN 'street_52'
    WHEN lower(COALESCE(v_override_status, '')) = 'street_52' THEN 'street_52'
    ELSE 'available'
  END;

  SELECT GREATEST(
    COALESCE(v_vehicle.current_mileage, 0),
    COALESCE(v_vehicle.odometer_reading, 0),
    COALESCE(MAX(reading.odometer_reading), 0)
  )
  INTO v_maximum_mileage
  FROM public.odometer_readings reading
  WHERE reading.company_id = p_company_id
    AND reading.vehicle_id = p_vehicle_id;

  RETURN jsonb_build_object(
    'target_status', v_target_status,
    'maximum_mileage', round(v_maximum_mileage::numeric, 2),
    'has_active_contract', v_has_occupying_contract,
    'has_occupying_contract', v_has_occupying_contract,
    'has_open_maintenance', v_has_open_maintenance,
    'has_active_reservation', v_has_active_reservation,
    'reconciliation_assignment_id', v_override_assignment_id,
    'reconciliation_override_status', v_override_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.system_agent_vehicle_derived_state(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_vehicle_derived_state(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_vehicle_operational_status_v1(
  p_vehicle_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_state jsonb;
  v_target text;
  v_previous_status text;
  v_changed boolean := false;
BEGIN
  SELECT vehicle.status::text
  INTO v_previous_status
  FROM public.vehicles vehicle
  WHERE vehicle.id = p_vehicle_id
    AND vehicle.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_state := public.system_agent_vehicle_derived_state(p_vehicle_id, p_company_id);
  v_target := NULLIF(btrim(v_state ->> 'target_status'), '');

  IF v_target IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM unnest(enum_range(NULL::public.vehicle_status)) AS allowed(status)
       WHERE allowed.status::text = v_target
     )
  THEN
    UPDATE public.vehicles vehicle
    SET status = v_target::public.vehicle_status,
        updated_at = now()
    WHERE vehicle.id = p_vehicle_id
      AND vehicle.company_id = p_company_id
      AND vehicle.status IS DISTINCT FROM v_target::public.vehicle_status;
    v_changed := FOUND;
  END IF;

  RETURN v_state || jsonb_build_object(
    'previous_status', v_previous_status,
    'applied_status', COALESCE(v_target, v_previous_status),
    'changed', v_changed
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_vehicle_operational_status_v1(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_vehicle_operational_status_v1(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.update_vehicle_status_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_vehicle_operational_status_v1(NEW.vehicle_id, NEW.company_id);
    RETURN NEW;
  END IF;

  PERFORM public.refresh_vehicle_operational_status_v1(OLD.vehicle_id, OLD.company_id);

  IF TG_OP = 'UPDATE'
     AND (NEW.vehicle_id, NEW.company_id) IS DISTINCT FROM (OLD.vehicle_id, OLD.company_id)
  THEN
    PERFORM public.refresh_vehicle_operational_status_v1(NEW.vehicle_id, NEW.company_id);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_vehicle_status_from_contract()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_vehicle_status_on_maintenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_vehicle_operational_status_v1(NEW.vehicle_id, NEW.company_id);
    RETURN NEW;
  END IF;

  PERFORM public.refresh_vehicle_operational_status_v1(OLD.vehicle_id, OLD.company_id);

  IF TG_OP = 'UPDATE'
     AND (NEW.vehicle_id, NEW.company_id) IS DISTINCT FROM (OLD.vehicle_id, OLD.company_id)
  THEN
    PERFORM public.refresh_vehicle_operational_status_v1(NEW.vehicle_id, NEW.company_id);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_vehicle_status_on_maintenance()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_update_vehicle_status_on_maintenance
  ON public.vehicle_maintenance;
CREATE TRIGGER trigger_update_vehicle_status_on_maintenance
AFTER INSERT OR DELETE OR UPDATE OF vehicle_id, company_id, status, started_date, completed_date
ON public.vehicle_maintenance
FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_status_on_maintenance();

CREATE OR REPLACE FUNCTION public.refresh_vehicle_status_on_reservation_change_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_vehicle_operational_status_v1(NEW.vehicle_id, NEW.company_id);
    RETURN NEW;
  END IF;

  PERFORM public.refresh_vehicle_operational_status_v1(OLD.vehicle_id, OLD.company_id);

  IF TG_OP = 'UPDATE'
     AND (NEW.vehicle_id, NEW.company_id) IS DISTINCT FROM (OLD.vehicle_id, OLD.company_id)
  THEN
    PERFORM public.refresh_vehicle_operational_status_v1(NEW.vehicle_id, NEW.company_id);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_vehicle_status_on_reservation_change_v1()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_refresh_vehicle_status_on_reservation_change_v1
  ON public.vehicle_reservations;
CREATE TRIGGER trg_refresh_vehicle_status_on_reservation_change_v1
AFTER INSERT OR DELETE OR UPDATE OF vehicle_id, company_id, status, start_date, end_date, hold_until
ON public.vehicle_reservations
FOR EACH ROW EXECUTE FUNCTION public.refresh_vehicle_status_on_reservation_change_v1();

CREATE TEMP TABLE vehicle_availability_backfill ON COMMIT DROP AS
SELECT
  vehicle.id AS vehicle_id,
  vehicle.company_id,
  jsonb_build_object(
    'status', vehicle.status::text,
    'updated_at', vehicle.updated_at,
    'plate_number', vehicle.plate_number
  ) AS before_state,
  COALESCE((
    SELECT jsonb_agg(assignment.id)
    FROM public.fleet_reconciliation_assignments assignment
    WHERE assignment.company_id = vehicle.company_id
      AND assignment.vehicle_id = vehicle.id
      AND assignment.is_active
  ), '[]'::jsonb) AS previous_assignment_ids
FROM public.vehicles vehicle
WHERE vehicle.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
  AND vehicle.is_active
  AND vehicle.status = 'rented'::public.vehicle_status
  AND NOT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.company_id = vehicle.company_id
      AND contract.vehicle_id = vehicle.id
      AND contract.start_date <= CURRENT_DATE
      AND contract.end_date >= CURRENT_DATE
      AND COALESCE(contract.vehicle_returned, false) = false
      AND lower(COALESCE(contract.status, '')) IN (
        'active', 'suspended', 'under_legal_procedure'
      )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.vehicle_maintenance maintenance
    WHERE maintenance.company_id = vehicle.company_id
      AND maintenance.vehicle_id = vehicle.id
      AND lower(COALESCE(maintenance.status::text, '')) = 'in_progress'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.vehicle_reservations reservation
    WHERE reservation.company_id = vehicle.company_id
      AND reservation.vehicle_id = vehicle.id
      AND lower(COALESCE(reservation.status::text, '')) NOT IN (
        'cancelled', 'canceled', 'completed', 'expired'
      )
      AND reservation.start_date::date <= CURRENT_DATE
      AND reservation.end_date::date >= CURRENT_DATE
  );

SELECT public.refresh_vehicle_operational_status_v1(
  backfill.vehicle_id,
  backfill.company_id
)
FROM vehicle_availability_backfill backfill;

INSERT INTO public.audit_logs (
  user_id, company_id, action, resource_type, resource_id,
  old_values, new_values, severity, user_email, user_name,
  entity_name, changes_summary, status, metadata, notes
)
SELECT
  '2a2b3a8a-35dd-4251-a8ba-09f70538c920'::uuid,
  backfill.company_id,
  'VEHICLE_AUTOMATICALLY_RELEASED_WITHOUT_OCCUPANCY',
  'vehicle',
  vehicle.id,
  backfill.before_state,
  jsonb_build_object(
    'status', vehicle.status::text,
    'updated_at', vehicle.updated_at,
    'plate_number', vehicle.plate_number
  ),
  'info',
  'khamis-1992@hotmail.com',
  'خميس',
  vehicle.plate_number,
  'تحويل تلقائي من مؤجرة إلى متاحة لعدم وجود عقد مُشغِل أو صيانة أو حجز فعّال.',
  'success',
  jsonb_build_object(
    'migration_key', '20260831141035_enforce_automatic_vehicle_availability_without_occupancy',
    'previous_assignment_ids', backfill.previous_assignment_ids,
    'policy', 'live_operational_evidence'
  ),
  'أصبحت المركبة متاحة وجاهزة للتأجير وفق الحالة الحية.'
FROM vehicle_availability_backfill backfill
JOIN public.vehicles vehicle
  ON vehicle.id = backfill.vehicle_id
 AND vehicle.company_id = backfill.company_id
WHERE vehicle.status = 'available'::public.vehicle_status;

DO $verification$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.vehicles vehicle
    WHERE vehicle.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
      AND vehicle.is_active
      AND vehicle.status = 'rented'::public.vehicle_status
      AND NOT EXISTS (
        SELECT 1 FROM public.contracts contract
        WHERE contract.company_id = vehicle.company_id
          AND contract.vehicle_id = vehicle.id
          AND contract.start_date <= CURRENT_DATE
          AND contract.end_date >= CURRENT_DATE
          AND COALESCE(contract.vehicle_returned, false) = false
          AND lower(COALESCE(contract.status, '')) IN (
            'active', 'suspended', 'under_legal_procedure'
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.vehicle_maintenance maintenance
        WHERE maintenance.company_id = vehicle.company_id
          AND maintenance.vehicle_id = vehicle.id
          AND lower(COALESCE(maintenance.status::text, '')) = 'in_progress'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.vehicle_reservations reservation
        WHERE reservation.company_id = vehicle.company_id
          AND reservation.vehicle_id = vehicle.id
          AND lower(COALESCE(reservation.status::text, '')) NOT IN (
            'cancelled', 'canceled', 'completed', 'expired'
          )
          AND reservation.start_date::date <= CURRENT_DATE
          AND reservation.end_date::date >= CURRENT_DATE
      )
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: rented vehicles without live occupancy remain';
  END IF;
END;
$verification$;

COMMENT ON FUNCTION public.refresh_vehicle_operational_status_v1(uuid, uuid) IS
'Atomically derives and applies vehicle availability from current contracts, maintenance, reservations, and protected physical/legal custody states.';

COMMIT;
