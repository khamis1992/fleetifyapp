-- Restore the operational state that existed before recording employee
-- Osama's custody. Refuse to overwrite any later fleet update.

BEGIN;

DO $rollback$
DECLARE
  v_company_id CONSTANT uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_user_id CONSTANT uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_vehicle_id CONSTANT uuid := '55c81bd1-807e-4be2-97e3-83b3366f8db2';
  v_migration_key CONSTANT text := '20260830175441_record_846485_employee_osama_custody';
  v_batch_id uuid;
  v_assignment public.fleet_reconciliation_assignments%ROWTYPE;
BEGIN
  SELECT batch.id
  INTO v_batch_id
  FROM public.fleet_reconciliation_batches batch
  WHERE batch.company_id = v_company_id
    AND batch.metadata ->> 'migration_key' = v_migration_key
    AND batch.status = 'applied';

  IF v_batch_id IS NULL THEN
    RAISE EXCEPTION 'Applied batch % was not found', v_migration_key;
  END IF;

  SELECT *
  INTO v_assignment
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.batch_id = v_batch_id
    AND assignment.vehicle_id = v_vehicle_id
    AND assignment.is_active;

  IF NOT FOUND OR NOT EXISTS (
    SELECT 1
    FROM public.vehicles vehicle
    WHERE vehicle.id = v_vehicle_id
      AND vehicle.company_id = v_company_id
      AND vehicle.status = 'reserved_employee'::public.vehicle_status
      AND vehicle.location = 'مع الموظف اسامة عبدالمنعم'
  ) THEN
    RAISE EXCEPTION 'Rollback refused: vehicle 846485 changed after this migration';
  END IF;

  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  UPDATE public.vehicles vehicle
  SET status = (v_assignment.before_state ->> 'status')::public.vehicle_status,
      location = v_assignment.before_state ->> 'location',
      notes = v_assignment.before_state ->> 'notes',
      updated_at = now()
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'rolled_back_batch:' || v_batch_id::text
  WHERE assignment.id = v_assignment.id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = true,
      closed_at = NULL,
      closed_reason = NULL
  WHERE assignment.company_id = v_company_id
    AND assignment.vehicle_id = v_vehicle_id
    AND assignment.closed_reason = 'superseded_by_batch:' || v_batch_id::text;

  INSERT INTO public.audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    old_values, new_values, severity, user_email, user_name,
    entity_name, changes_summary, status, metadata, notes
  ) VALUES (
    v_actor_user_id,
    v_company_id,
    'VEHICLE_EMPLOYEE_CUSTODY_CORRECTION_ROLLED_BACK',
    'vehicle',
    v_vehicle_id,
    v_assignment.after_state,
    v_assignment.before_state,
    'warning',
    'khamis-1992@hotmail.com',
    'خميس',
    '846485',
    'تراجع تدقيقي عن تسجيل حيازة المركبة لدى الموظف اسامة واستعادة الحالة السابقة.',
    'success',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'fleet_reconciliation_batch_id', v_batch_id,
      'contracts_changed', false,
      'financial_records_changed', false
    ),
    'تم التراجع مع الحفاظ على سجل التدقيق.'
  );

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
