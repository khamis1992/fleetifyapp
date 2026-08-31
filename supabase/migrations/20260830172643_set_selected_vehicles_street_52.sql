-- Move seven manager-confirmed vehicles from police-station custody to
-- the Street 52 impound. Contracts, invoices, payments, and legal cases
-- are deliberately left unchanged.

BEGIN;

DO $migration$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_user_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_migration_key constant text := '20260830172231_set_selected_vehicles_street_52';
  v_source_sha constant text :=
    md5('direct-manager-street-52-2026-08-30:2636,2773,7067,7070,725473,751425,856925')
    || md5('fleetify:direct-manager-street-52-2026-08-30');
  v_batch_id uuid;
  v_matched_count integer;
  v_updated_count integer;
  v_assignment_count integer;
BEGIN
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

  WITH requested(source_row, plate_number, vehicle_id) AS (
    VALUES
      (2, '2636',   'cbea1d08-0c1a-4c3c-9edf-99d24634f888'::uuid),
      (3, '2773',   'bb7fa11f-b9f4-4492-82a4-002993abaedc'::uuid),
      (4, '7067',   '4d6707a0-5f29-475d-9c19-ddd262e005e0'::uuid),
      (5, '7070',   'b43da50f-4be3-447b-9a76-b37672a24036'::uuid),
      (6, '725473', '9558a5c9-0365-4fdc-a1f3-4de49f0b33c4'::uuid),
      (7, '751425', 'e4af60d3-0e29-4f16-9d66-e97e78d8599f'::uuid),
      (8, '856925', '2547e984-11f0-4dd7-9115-7d5a5e1eebf3'::uuid)
  )
  SELECT count(*)
  INTO v_matched_count
  FROM requested source
  JOIN public.vehicles vehicle
    ON vehicle.id = source.vehicle_id
   AND vehicle.company_id = v_company_id
   AND public.normalize_vehicle_plate(vehicle.plate_number)
       = public.normalize_vehicle_plate(source.plate_number)
  WHERE vehicle.is_active
    AND vehicle.status = 'police_station'::public.vehicle_status;

  IF v_matched_count <> 7 THEN
    RAISE EXCEPTION
      'Precondition failed: expected 7 unique active police-station vehicles, matched %',
      v_matched_count;
  END IF;

  IF EXISTS (
    WITH requested(plate_number) AS (
      VALUES ('2636'), ('2773'), ('7067'), ('7070'), ('725473'), ('751425'), ('856925')
    )
    SELECT 1
    FROM requested source
    JOIN public.vehicles vehicle
      ON vehicle.company_id = v_company_id
     AND public.normalize_vehicle_plate(vehicle.plate_number)
         = public.normalize_vehicle_plate(source.plate_number)
    GROUP BY source.plate_number
    HAVING count(*) <> 1
  ) THEN
    RAISE EXCEPTION 'Precondition failed: a requested plate is duplicated';
  END IF;

  IF EXISTS (
    WITH requested(vehicle_id) AS (
      VALUES
        ('cbea1d08-0c1a-4c3c-9edf-99d24634f888'::uuid),
        ('bb7fa11f-b9f4-4492-82a4-002993abaedc'::uuid),
        ('4d6707a0-5f29-475d-9c19-ddd262e005e0'::uuid),
        ('b43da50f-4be3-447b-9a76-b37672a24036'::uuid),
        ('9558a5c9-0365-4fdc-a1f3-4de49f0b33c4'::uuid),
        ('e4af60d3-0e29-4f16-9d66-e97e78d8599f'::uuid),
        ('2547e984-11f0-4dd7-9115-7d5a5e1eebf3'::uuid)
    )
    SELECT 1
    FROM public.vehicle_maintenance maintenance
    JOIN requested source ON source.vehicle_id = maintenance.vehicle_id
    WHERE maintenance.company_id = v_company_id
      AND lower(COALESCE(maintenance.status::text, '')) = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'Precondition failed: a requested vehicle has open maintenance';
  END IF;

  IF EXISTS (
    WITH requested(vehicle_id) AS (
      VALUES
        ('cbea1d08-0c1a-4c3c-9edf-99d24634f888'::uuid),
        ('bb7fa11f-b9f4-4492-82a4-002993abaedc'::uuid),
        ('4d6707a0-5f29-475d-9c19-ddd262e005e0'::uuid),
        ('b43da50f-4be3-447b-9a76-b37672a24036'::uuid),
        ('9558a5c9-0365-4fdc-a1f3-4de49f0b33c4'::uuid),
        ('e4af60d3-0e29-4f16-9d66-e97e78d8599f'::uuid),
        ('2547e984-11f0-4dd7-9115-7d5a5e1eebf3'::uuid)
    )
    SELECT 1
    FROM public.vehicle_reservations reservation
    JOIN requested source ON source.vehicle_id = reservation.vehicle_id
    WHERE reservation.company_id = v_company_id
      AND lower(COALESCE(reservation.status::text, '')) NOT IN (
        'cancelled', 'canceled', 'completed', 'expired'
      )
      AND reservation.start_date <= CURRENT_DATE
      AND reservation.end_date >= CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Precondition failed: a requested vehicle has an active reservation';
  END IF;

  INSERT INTO public.fleet_reconciliation_batches (
    company_id, source_file_name, source_sha256, source_as_of, status,
    source_row_count, status_change_count, customer_snapshot_count, metadata
  ) VALUES (
    v_company_id,
    'توجيه إداري مباشر - الحجز شارع 52 - 2026-08-30',
    v_source_sha,
    DATE '2026-08-30',
    'applying',
    7,
    7,
    0,
    jsonb_build_object(
      'migration_key', v_migration_key,
      'scope', 'direct_operational_vehicle_custody_correction',
      'target_status', 'street_52',
      'target_location', 'شارع 52',
      'plates', jsonb_build_array('2636', '2773', '7067', '7070', '725473', '751425', '856925'),
      'contract_rows_changed', 0,
      'invoice_rows_changed', 0,
      'payment_rows_changed', 0,
      'legal_case_rows_changed', 0
    )
  )
  RETURNING id INTO v_batch_id;

  WITH requested(vehicle_id) AS (
    VALUES
      ('cbea1d08-0c1a-4c3c-9edf-99d24634f888'::uuid),
      ('bb7fa11f-b9f4-4492-82a4-002993abaedc'::uuid),
      ('4d6707a0-5f29-475d-9c19-ddd262e005e0'::uuid),
      ('b43da50f-4be3-447b-9a76-b37672a24036'::uuid),
      ('9558a5c9-0365-4fdc-a1f3-4de49f0b33c4'::uuid),
      ('e4af60d3-0e29-4f16-9d66-e97e78d8599f'::uuid),
      ('2547e984-11f0-4dd7-9115-7d5a5e1eebf3'::uuid)
  )
  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'superseded_by_batch:' || v_batch_id::text
  FROM requested source
  WHERE assignment.company_id = v_company_id
    AND assignment.vehicle_id = source.vehicle_id
    AND assignment.is_active;

  WITH requested(source_row, plate_number, vehicle_id) AS (
    VALUES
      (2, '2636',   'cbea1d08-0c1a-4c3c-9edf-99d24634f888'::uuid),
      (3, '2773',   'bb7fa11f-b9f4-4492-82a4-002993abaedc'::uuid),
      (4, '7067',   '4d6707a0-5f29-475d-9c19-ddd262e005e0'::uuid),
      (5, '7070',   'b43da50f-4be3-447b-9a76-b37672a24036'::uuid),
      (6, '725473', '9558a5c9-0365-4fdc-a1f3-4de49f0b33c4'::uuid),
      (7, '751425', 'e4af60d3-0e29-4f16-9d66-e97e78d8599f'::uuid),
      (8, '856925', '2547e984-11f0-4dd7-9115-7d5a5e1eebf3'::uuid)
  )
  INSERT INTO public.fleet_reconciliation_assignments (
    batch_id, company_id, vehicle_id, source_row, source_plate,
    source_result, source_classification, identity_resolution,
    target_status, target_location, decision_reason, source_fingerprint,
    source_evidence, before_state
  )
  SELECT
    v_batch_id,
    v_company_id,
    vehicle.id,
    source.source_row,
    source.plate_number,
    'نقل إلى الحجز - شارع 52',
    'حجز شارع 52',
    'not_applicable',
    'street_52'::public.vehicle_status,
    'شارع 52',
    'reported_street_52',
    md5(concat_ws('|', v_source_sha, source.source_row::text, source.plate_number, 'street_52')),
    jsonb_build_object(
      'source', 'direct_manager_instruction',
      'reported_on', '2026-08-30',
      'previous_status', vehicle.status::text,
      'previous_location', vehicle.location,
      'contracts_unchanged', true,
      'financial_records_unchanged', true,
      'legal_cases_unchanged', true
    ),
    jsonb_build_object(
      'status', vehicle.status::text,
      'location', vehicle.location,
      'plate_number', vehicle.plate_number,
      'notes', vehicle.notes,
      'is_active', vehicle.is_active,
      'updated_at', vehicle.updated_at
    )
  FROM requested source
  JOIN public.vehicles vehicle
    ON vehicle.id = source.vehicle_id
   AND vehicle.company_id = v_company_id;

  GET DIAGNOSTICS v_assignment_count = ROW_COUNT;
  IF v_assignment_count <> 7 THEN
    RAISE EXCEPTION 'Expected 7 reconciliation assignments, inserted %', v_assignment_count;
  END IF;

  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  WITH requested(vehicle_id) AS (
    VALUES
      ('cbea1d08-0c1a-4c3c-9edf-99d24634f888'::uuid),
      ('bb7fa11f-b9f4-4492-82a4-002993abaedc'::uuid),
      ('4d6707a0-5f29-475d-9c19-ddd262e005e0'::uuid),
      ('b43da50f-4be3-447b-9a76-b37672a24036'::uuid),
      ('9558a5c9-0365-4fdc-a1f3-4de49f0b33c4'::uuid),
      ('e4af60d3-0e29-4f16-9d66-e97e78d8599f'::uuid),
      ('2547e984-11f0-4dd7-9115-7d5a5e1eebf3'::uuid)
  )
  UPDATE public.vehicles vehicle
  SET status = 'street_52'::public.vehicle_status,
      location = 'شارع 52',
      notes = CASE
        WHEN COALESCE(vehicle.notes, '') LIKE '%[تصحيح تشغيلي 2026-08-30 - الحجز شارع 52]%'
          THEN vehicle.notes
        ELSE concat_ws(
          E'\n',
          NULLIF(btrim(COALESCE(vehicle.notes, '')), ''),
          '[تصحيح تشغيلي 2026-08-30 - الحجز شارع 52] المركبة في الحجز - شارع 52 حسب توجيه الإدارة.'
        )
      END,
      updated_at = now()
  FROM requested source
  WHERE vehicle.id = source.vehicle_id
    AND vehicle.company_id = v_company_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count <> 7 THEN
    RAISE EXCEPTION 'Expected 7 vehicle updates, updated %', v_updated_count;
  END IF;

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
    'VEHICLE_STATUS_CORRECTED_TO_STREET_52',
    'vehicle',
    assignment.vehicle_id,
    assignment.before_state,
    assignment.after_state,
    'info',
    'khamis-1992@hotmail.com',
    'خميس',
    assignment.source_plate,
    'نقل حالة المركبة وموقعها من مركز الشرطة إلى الحجز في شارع 52 دون تعديل العقود أو السجلات المالية أو القانونية.',
    'success',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'fleet_reconciliation_batch_id', v_batch_id,
      'fleet_reconciliation_assignment_id', assignment.id,
      'contracts_changed', false,
      'financial_records_changed', false,
      'legal_cases_changed', false
    ),
    'المركبة في الحجز - شارع 52 حسب توجيه الإدارة بتاريخ 2026-08-30.'
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.batch_id = v_batch_id;

  IF (
    SELECT count(*)
    FROM public.fleet_reconciliation_assignments assignment
    JOIN public.vehicles vehicle
      ON vehicle.id = assignment.vehicle_id
     AND vehicle.company_id = assignment.company_id
    WHERE assignment.batch_id = v_batch_id
      AND assignment.is_active
      AND assignment.target_status = 'street_52'::public.vehicle_status
      AND assignment.target_location = 'شارع 52'
      AND vehicle.status = 'street_52'::public.vehicle_status
      AND vehicle.location = 'شارع 52'
  ) <> 7 THEN
    RAISE EXCEPTION 'Postcondition failed: not all seven vehicles are in Street 52 impound';
  END IF;

  UPDATE public.fleet_reconciliation_batches
  SET status = 'applied',
      applied_at = now(),
      metadata = metadata || jsonb_build_object(
        'applied_assignment_count', 7,
        'audit_log_count', 7
      )
  WHERE id = v_batch_id;
END;
$migration$;

COMMIT;
