-- Correct vehicle 7039 after a direct manager confirmation that it has no
-- current renter. The August operational-only snapshot is retained as audit
-- history, but its unsupported rented assignment is superseded.

BEGIN;

DO $migration$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid;
  v_vehicle_id constant uuid := 'b9b3d58a-d12a-4bc6-8148-1022b8be0915'::uuid;
  v_actor_user_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920'::uuid;
  v_migration_key constant text := '20260831135152_correct_vehicle_7039_available_without_contract';
  v_source_sha constant text := md5('direct-manager-correction:vehicle-7039:available:2026-08-31')
    || md5('fleetify:no-current-contract-or-operational-occupancy');
  v_batch_id uuid;
  v_vehicle public.vehicles%ROWTYPE;
  v_before_state jsonb;
  v_active_assignment_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':vehicle-status:' || v_vehicle_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.fleet_reconciliation_batches batch
    WHERE batch.company_id = v_company_id
      AND (
        batch.source_sha256 = v_source_sha
        OR batch.metadata ->> 'migration_key' = v_migration_key
      )
  ) THEN
    RAISE EXCEPTION 'Migration % has already been recorded', v_migration_key;
  END IF;

  SELECT vehicle.*
  INTO STRICT v_vehicle
  FROM public.vehicles vehicle
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id
    AND public.normalize_vehicle_plate(vehicle.plate_number) = '7039'
    AND vehicle.is_active
  FOR UPDATE;

  IF v_vehicle.status IS DISTINCT FROM 'rented'::public.vehicle_status THEN
    RAISE EXCEPTION 'Precondition failed: vehicle 7039 status is %, expected rented', v_vehicle.status;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.company_id = v_company_id
      AND contract.vehicle_id = v_vehicle_id
      AND contract.start_date <= CURRENT_DATE
      AND contract.end_date >= CURRENT_DATE
      AND (
        contract.status = 'active'
        OR (
          contract.status = 'under_legal_procedure'
          AND COALESCE(contract.vehicle_returned, false) = false
        )
      )
  ) THEN
    RAISE EXCEPTION 'Precondition failed: vehicle 7039 now has a current occupying contract';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.vehicle_maintenance maintenance
    WHERE maintenance.company_id = v_company_id
      AND maintenance.vehicle_id = v_vehicle_id
      AND lower(COALESCE(maintenance.status::text, '')) = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'Precondition failed: vehicle 7039 has open maintenance';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.vehicle_reservations reservation
    WHERE reservation.company_id = v_company_id
      AND reservation.vehicle_id = v_vehicle_id
      AND lower(COALESCE(reservation.status::text, '')) NOT IN (
        'cancelled', 'canceled', 'completed', 'expired'
      )
      AND reservation.start_date::date <= CURRENT_DATE
      AND reservation.end_date::date >= CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Precondition failed: vehicle 7039 has an active reservation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.driver_assignments assignment
    WHERE assignment.company_id = v_company_id
      AND assignment.vehicle_id = v_vehicle_id
      AND lower(COALESCE(assignment.status, '')) NOT IN (
        'cancelled', 'canceled', 'completed', 'expired'
      )
      AND assignment.start_date::date <= CURRENT_DATE
      AND COALESCE(assignment.end_date::date, CURRENT_DATE) >= CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Precondition failed: vehicle 7039 has an active driver assignment';
  END IF;

  SELECT count(*)
  INTO v_active_assignment_count
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.company_id = v_company_id
    AND assignment.vehicle_id = v_vehicle_id
    AND assignment.is_active;

  IF v_active_assignment_count <> 1 THEN
    RAISE EXCEPTION
      'Precondition failed: expected one active reconciliation assignment for vehicle 7039, found %',
      v_active_assignment_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.fleet_reconciliation_assignments assignment
    WHERE assignment.company_id = v_company_id
      AND assignment.vehicle_id = v_vehicle_id
      AND assignment.is_active
      AND assignment.target_status = 'rented'::public.vehicle_status
      AND assignment.supporting_contract_id IS NULL
      AND assignment.source_classification = 'no_live_contract'
  ) THEN
    RAISE EXCEPTION 'Precondition failed: active rented state is no longer the unsupported August assignment';
  END IF;

  v_before_state := jsonb_build_object(
    'status', v_vehicle.status::text,
    'location', v_vehicle.location,
    'plate_number', v_vehicle.plate_number,
    'notes', v_vehicle.notes,
    'is_active', v_vehicle.is_active,
    'updated_at', v_vehicle.updated_at
  );

  INSERT INTO public.fleet_reconciliation_batches (
    company_id, source_file_name, source_sha256, source_as_of, status,
    source_row_count, status_change_count, customer_snapshot_count, metadata
  ) VALUES (
    v_company_id,
    'توجيه إداري مباشر - تصحيح حالة المركبة 7039 - 2026-08-31',
    v_source_sha,
    DATE '2026-08-31',
    'applying',
    1,
    1,
    0,
    jsonb_build_object(
      'migration_key', v_migration_key,
      'scope', 'direct_operational_vehicle_availability_correction',
      'vehicle_id', v_vehicle_id,
      'plate_number', '7039',
      'target_status', 'available',
      'contract_rows_changed', 0,
      'invoice_rows_changed', 0,
      'payment_rows_changed', 0,
      'legal_case_rows_changed', 0
    )
  )
  RETURNING id INTO v_batch_id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'superseded_by_batch:' || v_batch_id::text
  WHERE assignment.company_id = v_company_id
    AND assignment.vehicle_id = v_vehicle_id
    AND assignment.is_active;

  INSERT INTO public.fleet_reconciliation_assignments (
    batch_id, company_id, vehicle_id, source_row, source_plate,
    source_result, source_classification, identity_resolution,
    target_status, target_location, decision_reason, source_fingerprint,
    source_evidence, before_state
  ) VALUES (
    v_batch_id,
    v_company_id,
    v_vehicle_id,
    2,
    '7039',
    'لا يوجد عقد أو شاغل حالي',
    'available_no_occupant',
    'not_applicable',
    'available'::public.vehicle_status,
    NULL,
    'direct_manager_no_current_contract',
    md5(concat_ws('|', v_source_sha, '7039', 'available')),
    jsonb_build_object(
      'source', 'direct_manager_instruction',
      'reported_on', '2026-08-31',
      'vehicle_page', '/fleet/vehicles/b9b3d58a-d12a-4bc6-8148-1022b8be0915',
      'current_contract_count', 0,
      'active_maintenance_count', 0,
      'active_reservation_count', 0,
      'active_driver_assignment_count', 0,
      'contracts_unchanged', true,
      'financial_records_unchanged', true,
      'legal_cases_unchanged', true
    ),
    v_before_state
  );

  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  UPDATE public.vehicles vehicle
  SET status = 'available'::public.vehicle_status,
      location = NULL,
      notes = CASE
        WHEN COALESCE(vehicle.notes, '') LIKE '%[تصحيح تشغيلي 2026-08-31 - 7039 متاحة]%'
          THEN vehicle.notes
        ELSE concat_ws(
          E'\n',
          NULLIF(btrim(COALESCE(vehicle.notes, '')), ''),
          '[تصحيح تشغيلي 2026-08-31 - 7039 متاحة] لا يوجد عقد أو شاغل حالي؛ أُغلق تعيين أغسطس غير المدعوم بعقد.'
        )
      END,
      updated_at = now()
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET after_state = jsonb_build_object(
        'status', vehicle.status::text,
        'location', vehicle.location,
        'plate_number', vehicle.plate_number,
        'notes', vehicle.notes,
        'is_active', vehicle.is_active,
        'updated_at', vehicle.updated_at
      )
  FROM public.vehicles vehicle
  WHERE assignment.batch_id = v_batch_id
    AND assignment.vehicle_id = vehicle.id
    AND assignment.company_id = vehicle.company_id;

  INSERT INTO public.audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    old_values, new_values, severity, user_email, user_name,
    entity_name, changes_summary, status, metadata, notes
  )
  SELECT
    v_actor_user_id,
    v_company_id,
    'VEHICLE_STATUS_CORRECTED_TO_AVAILABLE_NO_OCCUPANT',
    'vehicle',
    assignment.vehicle_id,
    assignment.before_state,
    assignment.after_state,
    'info',
    'khamis-1992@hotmail.com',
    'خميس',
    assignment.source_plate,
    'تصحيح حالة المركبة من مؤجرة إلى متاحة بعد إثبات عدم وجود عقد أو شاغل أو صيانة أو حجز حالي.',
    'success',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'fleet_reconciliation_batch_id', v_batch_id,
      'fleet_reconciliation_assignment_id', assignment.id,
      'contracts_changed', false,
      'financial_records_changed', false,
      'legal_cases_changed', false
    ),
    'أُغلق تعيين تقرير أغسطس غير المدعوم بعقد وأصبحت المركبة 7039 متاحة.'
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.batch_id = v_batch_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vehicles vehicle
    JOIN public.fleet_reconciliation_assignments assignment
      ON assignment.vehicle_id = vehicle.id
     AND assignment.company_id = vehicle.company_id
    WHERE vehicle.id = v_vehicle_id
      AND vehicle.company_id = v_company_id
      AND vehicle.status = 'available'::public.vehicle_status
      AND assignment.batch_id = v_batch_id
      AND assignment.is_active
      AND assignment.target_status = 'available'::public.vehicle_status
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: vehicle 7039 is not available with the new active assignment';
  END IF;

  UPDATE public.fleet_reconciliation_batches batch
  SET status = 'applied',
      applied_at = now(),
      metadata = batch.metadata || jsonb_build_object(
        'applied_assignment_count', 1,
        'audit_log_count', 1
      )
  WHERE batch.id = v_batch_id;
END;
$migration$;

COMMIT;
