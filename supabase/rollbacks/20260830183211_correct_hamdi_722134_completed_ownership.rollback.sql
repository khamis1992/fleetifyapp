BEGIN;

DO $rollback$
DECLARE
  v_company_id CONSTANT uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_user_id CONSTANT uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_migration_key CONSTANT text := '20260830183211_correct_hamdi_722134_completed_ownership';
  v_batch_id uuid;
  v_assignment public.fleet_reconciliation_assignments%ROWTYPE;
  v_before_contract jsonb;
BEGIN
  SELECT batch.id INTO v_batch_id
  FROM public.fleet_reconciliation_batches batch
  WHERE batch.company_id = v_company_id
    AND batch.metadata ->> 'migration_key' = v_migration_key
    AND batch.status = 'applied';

  SELECT * INTO v_assignment
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.batch_id = v_batch_id
    AND assignment.source_plate = '722134'
    AND assignment.is_active;

  IF v_batch_id IS NULL OR v_assignment.id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.vehicles vehicle
    WHERE vehicle.id = v_assignment.vehicle_id
      AND vehicle.status = 'out_of_service'::public.vehicle_status
      AND vehicle.is_active = false
  ) OR NOT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.id = v_assignment.supporting_contract_id
      AND contract.status = 'expired'
      AND contract.sub_status = 'ownership_transferred_completed'
  ) THEN
    RAISE EXCEPTION 'Rollback refused: the 722134 correction changed after application';
  END IF;

  v_before_contract := v_assignment.source_evidence -> 'before_contract';
  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'rolled_back_batch:' || v_batch_id::text
  WHERE assignment.id = v_assignment.id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = true, closed_at = NULL, closed_reason = NULL
  WHERE assignment.company_id = v_company_id
    AND assignment.vehicle_id = v_assignment.vehicle_id
    AND assignment.closed_reason = 'superseded_by_batch:' || v_batch_id::text;

  UPDATE public.contracts contract
  SET status = v_before_contract ->> 'status',
      contract_type = v_before_contract ->> 'contract_type',
      description = v_before_contract ->> 'description',
      terms = v_before_contract ->> 'terms',
      expired_at = (v_before_contract ->> 'expired_at')::timestamptz,
      sub_status = v_before_contract ->> 'sub_status',
      vehicle_status = v_before_contract ->> 'vehicle_status',
      updated_at = now()
  WHERE contract.id = v_assignment.supporting_contract_id
    AND contract.company_id = v_company_id;

  UPDATE public.vehicles vehicle
  SET status = (v_assignment.before_state ->> 'status')::public.vehicle_status,
      location = v_assignment.before_state ->> 'location',
      notes = v_assignment.before_state ->> 'notes',
      is_active = (v_assignment.before_state ->> 'is_active')::boolean,
      updated_at = now()
  WHERE vehicle.id = v_assignment.vehicle_id
    AND vehicle.company_id = v_company_id;

  INSERT INTO public.audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    old_values, new_values, severity, user_email, user_name,
    entity_name, changes_summary, status, metadata, notes
  ) VALUES (
    v_actor_user_id, v_company_id, 'HAMDI_722134_OWNERSHIP_CORRECTION_ROLLED_BACK',
    'vehicle', v_assignment.vehicle_id,
    v_assignment.after_state, v_assignment.before_state,
    'warning', 'khamis-1992@hotmail.com', 'خميس', '722134',
    'تراجع تدقيقي عن تصحيح تمليك المركبة 722134.', 'success',
    jsonb_build_object('migration_key', v_migration_key, 'batch_id', v_batch_id),
    'حُفظت سجلات التدقيق الأصلية.'
  );

  UPDATE public.fleet_reconciliation_batches
  SET status = 'rolled_back', rolled_back_at = now(),
      metadata = metadata || jsonb_build_object(
        'rolled_back_by_migration', v_migration_key || '.rollback'
      )
  WHERE id = v_batch_id;
END;
$rollback$;

COMMIT;
