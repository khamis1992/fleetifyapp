-- Roll back only while this exact correction remains current. Later contracts
-- or manual fleet decisions are never overwritten.

BEGIN;

DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid;
  v_vehicle_id constant uuid := 'b9b3d58a-d12a-4bc6-8148-1022b8be0915'::uuid;
  v_actor_user_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920'::uuid;
  v_migration_key constant text := '20260831135152_correct_vehicle_7039_available_without_contract';
  v_batch_id uuid;
BEGIN
  SELECT batch.id
  INTO STRICT v_batch_id
  FROM public.fleet_reconciliation_batches batch
  WHERE batch.company_id = v_company_id
    AND batch.metadata ->> 'migration_key' = v_migration_key
    AND batch.status = 'applied';

  IF NOT EXISTS (
    SELECT 1
    FROM public.fleet_reconciliation_assignments assignment
    JOIN public.vehicles vehicle
      ON vehicle.id = assignment.vehicle_id
     AND vehicle.company_id = assignment.company_id
    WHERE assignment.batch_id = v_batch_id
      AND assignment.vehicle_id = v_vehicle_id
      AND assignment.is_active
      AND assignment.target_status = 'available'::public.vehicle_status
      AND vehicle.status = 'available'::public.vehicle_status
  ) THEN
    RAISE EXCEPTION 'Rollback refused: vehicle 7039 changed after this correction';
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
    AND assignment.vehicle_id = v_vehicle_id
    AND assignment.closed_reason = 'superseded_by_batch:' || v_batch_id::text;

  INSERT INTO public.audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    severity, user_email, user_name, entity_name,
    changes_summary, status, metadata, notes
  ) VALUES (
    v_actor_user_id,
    v_company_id,
    'VEHICLE_7039_AVAILABLE_CORRECTION_ROLLED_BACK',
    'vehicle',
    v_vehicle_id,
    'warning',
    'khamis-1992@hotmail.com',
    'خميس',
    '7039',
    'تراجع تدقيقي عن تصحيح حالة المركبة 7039 إلى متاحة واستعادة الحالة السابقة.',
    'success',
    jsonb_build_object('migration_key', v_migration_key, 'fleet_reconciliation_batch_id', v_batch_id),
    'تم التراجع دون حذف تاريخ المطابقة أو العقود.'
  );

  UPDATE public.fleet_reconciliation_batches batch
  SET status = 'rolled_back',
      rolled_back_at = now(),
      metadata = batch.metadata || jsonb_build_object(
        'rolled_back_by_migration', v_migration_key || '.rollback'
      )
  WHERE batch.id = v_batch_id;
END;
$rollback$;

COMMIT;
