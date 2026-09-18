-- Roll back the August 2026 operational fleet reconciliation without touching
-- contracts, invoices, payments, journals, or legal cases.

BEGIN;

DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid;
  v_source_sha constant text := '52D60964DEA821D023BEFDE6FB6E16F5846DC54180047364BAE7F64117CDC225';
  v_batch_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':fleet-report:' || v_source_sha, 0)
  );

  SELECT batch.id INTO v_batch_id
  FROM public.fleet_reconciliation_batches batch
  WHERE batch.company_id = v_company_id
    AND batch.source_sha256 = v_source_sha
  FOR UPDATE;

  IF v_batch_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.fleet_reconciliation_batches
       WHERE id = v_batch_id AND status = 'applied'
     )
  THEN
    IF EXISTS (
      SELECT 1
      FROM public.fleet_reconciliation_assignments assignment
      JOIN public.vehicles vehicle
        ON vehicle.id = assignment.vehicle_id
       AND vehicle.company_id = assignment.company_id
      WHERE assignment.batch_id = v_batch_id
        AND (
          assignment.is_active = false
          OR vehicle.status::text IS DISTINCT FROM assignment.after_state ->> 'status'
          OR vehicle.location IS DISTINCT FROM assignment.after_state ->> 'location'
        )
    ) THEN
      RAISE EXCEPTION
        'Rollback aborted: an applied vehicle changed or its assignment was superseded';
    END IF;

    PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

    UPDATE public.vehicles vehicle
    SET status = (assignment.before_state ->> 'status')::public.vehicle_status,
        location = assignment.before_state ->> 'location',
        updated_at = now()
    FROM public.fleet_reconciliation_assignments assignment
    WHERE assignment.batch_id = v_batch_id
      AND assignment.is_active
      AND assignment.vehicle_id = vehicle.id
      AND assignment.company_id = vehicle.company_id;

    IF EXISTS (
      SELECT 1
      FROM public.vehicles vehicle
      WHERE vehicle.company_id = v_company_id
        AND vehicle.plate_number IN ('603 353', '185 485')
    ) THEN
      RAISE EXCEPTION 'Rollback plate targets conflict with existing stored plates';
    END IF;

    UPDATE public.vehicles
    SET plate_number = CASE plate_number
          WHEN '603353' THEN '603 353'
          WHEN '185485' THEN '185 485'
          ELSE plate_number
        END,
        updated_at = now()
    WHERE company_id = v_company_id
      AND plate_number IN ('603353', '185485');

    UPDATE public.fleet_reconciliation_assignments
    SET is_active = false,
        closed_at = now(),
        closed_reason = 'migration_rollback'
    WHERE batch_id = v_batch_id
      AND is_active;

    UPDATE public.fleet_reconciliation_batches
    SET status = 'rolled_back',
        rolled_back_at = now(),
        metadata = metadata || jsonb_build_object('rollback_reason', 'migration_rollback')
    WHERE id = v_batch_id;
  END IF;
END;
$rollback$;

CREATE OR REPLACE FUNCTION public.system_agent_vehicle_derived_state(
  p_vehicle_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_vehicle public.vehicles%ROWTYPE;
  v_has_active_contract boolean := false;
  v_has_open_maintenance boolean := false;
  v_has_active_reservation boolean := false;
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

  SELECT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.company_id = p_company_id
      AND contract.vehicle_id = p_vehicle_id
      AND (
        lower(COALESCE(contract.status::text, '')) = 'active'
        OR (
          lower(COALESCE(contract.status::text, '')) = 'under_legal_procedure'
          AND COALESCE(contract.vehicle_returned, false) = false
        )
      )
      AND (contract.start_date IS NULL OR contract.start_date <= CURRENT_DATE)
      AND (contract.end_date IS NULL OR contract.end_date >= CURRENT_DATE)
  ) INTO v_has_active_contract;

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
      AND reservation.start_date <= CURRENT_DATE
      AND reservation.end_date >= CURRENT_DATE
  ) INTO v_has_active_reservation;

  v_target_status := CASE
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
  )
  INTO v_maximum_mileage
  FROM public.odometer_readings reading
  WHERE reading.company_id = p_company_id
    AND reading.vehicle_id = p_vehicle_id;

  RETURN jsonb_build_object(
    'target_status', v_target_status,
    'maximum_mileage', round(v_maximum_mileage::numeric, 2),
    'has_active_contract', v_has_active_contract,
    'has_open_maintenance', v_has_open_maintenance,
    'has_active_reservation', v_has_active_reservation
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.system_agent_vehicle_derived_state(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_vehicle_derived_state(uuid, uuid)
  TO service_role;

DROP VIEW IF EXISTS public.vehicle_current_operational_state;
DROP TRIGGER IF EXISTS trg_close_fleet_reconciliation_override ON public.vehicles;
DROP FUNCTION IF EXISTS public.close_fleet_reconciliation_override_on_manual_status();

COMMIT;

