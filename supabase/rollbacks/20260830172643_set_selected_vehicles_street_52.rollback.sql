-- Roll back only if the seven vehicles still carry this batch's active
-- Street 52 assignment. Later operational changes are never overwritten.

BEGIN;

DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_user_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_migration_key constant text := '20260830172231_set_selected_vehicles_street_52';
  v_batch_id uuid;
  v_restored_count integer;
BEGIN
  SELECT batch.id
  INTO v_batch_id
  FROM public.fleet_reconciliation_batches batch
  WHERE batch.company_id = v_company_id
    AND batch.metadata ->> 'migration_key' = v_migration_key
    AND batch.status = 'applied';

  IF v_batch_id IS NULL THEN
    RAISE EXCEPTION 'Applied reconciliation batch % was not found', v_migration_key;
  END IF;

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
    RAISE EXCEPTION 'Rollback refused: one or more vehicles changed after this migration';
  END IF;

  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  UPDATE public.vehicles vehicle
  SET status = (assignment.before_state ->> 'status')::public.vehicle_status,
      location = assignment.before_state ->> 'location',
      notes = assignment.before_state ->> 'notes',
      updated_at = now()
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.batch_id = v_batch_id
    AND assignment.is_active
    AND assignment.vehicle_id = vehicle.id
    AND assignment.company_id = vehicle.company_id;

  GET DIAGNOSTICS v_restored_count = ROW_COUNT;
  IF v_restored_count <> 7 THEN
    RAISE EXCEPTION 'Expected to restore 7 vehicles, restored %', v_restored_count;
  END IF;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'rolled_back_batch:' || v_batch_id::text
  WHERE assignment.batch_id = v_batch_id
    AND assignment.is_active;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = true,
      closed_at = NULL,
      closed_reason = NULL
  WHERE assignment.company_id = v_company_id
    AND assignment.closed_reason = 'superseded_by_batch:' || v_batch_id::text;

  INSERT INTO public.audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    old_values, new_values, severity, user_email, user_name,
    entity_name, changes_summary, status, metadata, notes
  )
  SELECT
    v_actor_user_id,
    v_company_id,
    'VEHICLE_STREET_52_CORRECTION_ROLLED_BACK',
    'vehicle',
    assignment.vehicle_id,
    assignment.after_state,
    assignment.before_state,
    'warning',
    'khamis-1992@hotmail.com',
    'خميس',
    assignment.source_plate,
    'تراجع تدقيقي عن نقل المركبة إلى الحجز شارع 52 واستعادة الحالة السابقة.',
    'success',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'fleet_reconciliation_batch_id', v_batch_id,
      'contracts_changed', false,
      'financial_records_changed', false,
      'legal_cases_changed', false
    ),
    'تم التراجع مع الحفاظ على جميع سجلات التدقيق.'
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.batch_id = v_batch_id;

  UPDATE public.fleet_reconciliation_batches
  SET status = 'rolled_back',
      rolled_back_at = now(),
      metadata = metadata || jsonb_build_object(
        'rolled_back_by_migration', v_migration_key || '.rollback'
      )
  WHERE id = v_batch_id;
END;
$rollback$;

COMMIT;
