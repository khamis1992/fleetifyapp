-- Remove only the untouched administrative paid contract created by the
-- matching migration, then restore the prior operational assignment.

BEGIN;

DO $rollback$
DECLARE
  v_company_id CONSTANT uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_user_id CONSTANT uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_vehicle_id CONSTANT uuid := '43cb61c2-9c1b-45c8-bf99-fbf28f329d4b';
  v_migration_key CONSTANT text := '20260830180342_create_paid_rent_to_own_847932_for_hassan';
  v_creation_key CONSTANT text := 'ownership-transfer-847932-hassan-20260830';
  v_batch_id uuid;
  v_contract_id uuid;
  v_assignment public.fleet_reconciliation_assignments%ROWTYPE;
BEGIN
  SELECT batch.id, (batch.metadata ->> 'contract_id')::uuid
  INTO v_batch_id, v_contract_id
  FROM public.fleet_reconciliation_batches batch
  WHERE batch.company_id = v_company_id
    AND batch.metadata ->> 'migration_key' = v_migration_key
    AND batch.status = 'applied';

  IF v_batch_id IS NULL OR v_contract_id IS NULL THEN
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
    FROM public.contracts contract
    WHERE contract.id = v_contract_id
      AND contract.company_id = v_company_id
      AND contract.creation_idempotency_key = v_creation_key
      AND contract.status = 'expired'
      AND contract.contract_amount = 68040
      AND contract.total_paid = 68040
      AND contract.balance_due = 0
      AND contract.payment_status = 'paid'
      AND contract.end_date = DATE '2027-12-31'
  ) THEN
    RAISE EXCEPTION 'Rollback refused: contract 847932 changed after creation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoices invoice WHERE invoice.contract_id = v_contract_id
  ) OR EXISTS (
    SELECT 1 FROM public.payments payment WHERE payment.contract_id = v_contract_id
  ) OR EXISTS (
    SELECT 1 FROM public.legal_cases legal_case WHERE legal_case.contract_id = v_contract_id
  ) THEN
    RAISE EXCEPTION 'Rollback refused: contract 847932 has dependent financial or legal rows';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vehicles vehicle
    WHERE vehicle.id = v_vehicle_id
      AND vehicle.company_id = v_company_id
      AND vehicle.status = 'out_of_service'::public.vehicle_status
      AND vehicle.location = 'لدى حسن بن ساسي ظاهري - بانتظار نقل الملكية في ديسمبر 2027'
  ) THEN
    RAISE EXCEPTION 'Rollback refused: vehicle 847932 changed after this migration';
  END IF;

  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

  DELETE FROM public.contracts contract
  WHERE contract.id = v_contract_id
    AND contract.company_id = v_company_id
    AND contract.creation_idempotency_key = v_creation_key;

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
    v_actor_user_id, v_company_id,
    'PAID_RENT_TO_OWN_847932_ROLLED_BACK', 'vehicle', v_vehicle_id,
    v_assignment.after_state,
    v_assignment.before_state,
    'warning', 'khamis-1992@hotmail.com', 'خميس', '847932',
    'تراجع تدقيقي عن إنشاء عقد التمليك المدفوع واستعادة حالة المركبة السابقة.',
    'success',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'removed_contract_id', v_contract_id,
      'fleet_reconciliation_batch_id', v_batch_id
    ),
    'لم يتم حذف سجلات التدقيق الأصلية.'
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
