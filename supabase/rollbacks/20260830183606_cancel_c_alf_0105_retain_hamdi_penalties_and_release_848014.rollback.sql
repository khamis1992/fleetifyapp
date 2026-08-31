BEGIN;

DO $rollback$
DECLARE
  v_company_id CONSTANT uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_user_id CONSTANT uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_migration_key CONSTANT text :=
    '20260830183606_cancel_c_alf_0105_retain_hamdi_penalties_and_release_848014';
  v_batch_id uuid;
  v_assignment public.fleet_reconciliation_assignments%ROWTYPE;
  v_before_contract jsonb;
  v_before_penalties jsonb;
  v_before_invoices jsonb;
BEGIN
  SELECT batch.id
  INTO v_batch_id
  FROM public.fleet_reconciliation_batches batch
  WHERE batch.company_id = v_company_id
    AND batch.metadata ->> 'migration_key' = v_migration_key
    AND batch.status = 'applied';

  SELECT assignment.*
  INTO v_assignment
  FROM public.fleet_reconciliation_assignments assignment
  WHERE assignment.batch_id = v_batch_id
    AND assignment.source_plate = '848014'
    AND assignment.is_active;

  IF v_batch_id IS NULL OR v_assignment.id IS NULL THEN
    RAISE EXCEPTION 'Rollback refused: the applied 848014 reconciliation was not found';
  END IF;

  v_before_contract := v_assignment.source_evidence -> 'before_contract';
  v_before_penalties := v_assignment.source_evidence -> 'before_penalties';
  v_before_invoices := v_assignment.source_evidence -> 'before_invoices';

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    JOIN public.vehicles vehicle
      ON vehicle.id = contract.vehicle_id
     AND vehicle.company_id = contract.company_id
    WHERE contract.id = v_assignment.supporting_contract_id
      AND contract.company_id = v_company_id
      AND contract.status = 'cancelled'
      AND contract.vehicle_returned = true
      AND contract.sub_status = 'returned_available_after_cancellation'
      AND contract.payment_status = 'partial'
      AND contract.total_paid = 25802
      AND contract.balance_due = 36198
      AND vehicle.id = v_assignment.vehicle_id
      AND vehicle.status = 'available'::public.vehicle_status
      AND vehicle.is_active
      AND vehicle.location = 'متوفرة'
  ) OR (
    SELECT count(*)
    FROM public.penalties penalty
    WHERE penalty.company_id = v_company_id
      AND penalty.contract_id = v_assignment.supporting_contract_id
      AND penalty.status = 'handled'
      AND penalty.payment_status = 'unpaid'
      AND penalty.responsibility_party = 'customer'
  ) <> 2 OR EXISTS (
    SELECT 1
    FROM public.penalties penalty
    WHERE penalty.status = 'handled'
      AND penalty.id NOT IN (
        SELECT (item ->> 'id')::uuid
        FROM jsonb_array_elements(v_before_penalties) item
      )
  ) THEN
    RAISE EXCEPTION 'Rollback refused: contract, vehicle, or handled-penalty state changed after application';
  END IF;

  IF (
    SELECT jsonb_agg(to_jsonb(invoice) ORDER BY invoice.id)
    FROM public.invoices invoice
    JOIN public.penalties penalty ON penalty.id = invoice.penalty_id
    WHERE penalty.company_id = v_company_id
      AND penalty.contract_id = v_assignment.supporting_contract_id
  ) IS DISTINCT FROM v_before_invoices THEN
    RAISE EXCEPTION 'Rollback refused: a linked penalty invoice changed after application';
  END IF;

  PERFORM set_config('fleetify.reconciliation_apply', 'on', true);

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
    AND assignment.vehicle_id = v_assignment.vehicle_id
    AND assignment.closed_reason = 'superseded_by_batch:' || v_batch_id::text;

  UPDATE public.contracts contract
  SET status = v_before_contract ->> 'status',
      vehicle_returned = COALESCE((v_before_contract ->> 'vehicle_returned')::boolean, false),
      suspension_reason = v_before_contract ->> 'suspension_reason',
      description = v_before_contract ->> 'description',
      expired_at = NULLIF(v_before_contract ->> 'expired_at', '')::timestamptz,
      sub_status = v_before_contract ->> 'sub_status',
      vehicle_status = v_before_contract ->> 'vehicle_status',
      updated_at = now()
  WHERE contract.id = v_assignment.supporting_contract_id
    AND contract.company_id = v_company_id;

  UPDATE public.penalties penalty
  SET status = item.value ->> 'status',
      payment_status = item.value ->> 'payment_status',
      customer_payment_status = item.value ->> 'customer_payment_status',
      responsibility_party = item.value ->> 'responsibility_party',
      responsibility_reason = item.value ->> 'responsibility_reason',
      responsibility_decided_at = NULLIF(item.value ->> 'responsibility_decided_at', '')::timestamptz,
      responsibility_decided_by = NULLIF(item.value ->> 'responsibility_decided_by', '')::uuid,
      responsible_customer_id = NULLIF(item.value ->> 'responsible_customer_id', '')::uuid,
      original_contract_id = NULLIF(item.value ->> 'original_contract_id', '')::uuid,
      original_contract_number = item.value ->> 'original_contract_number',
      customer_id = NULLIF(item.value ->> 'customer_id', '')::uuid,
      contract_id = NULLIF(item.value ->> 'contract_id', '')::uuid,
      paid_by_company = COALESCE((item.value ->> 'paid_by_company')::boolean, false),
      company_paid_date = NULLIF(item.value ->> 'company_paid_date', '')::timestamptz,
      notes = item.value ->> 'notes',
      updated_at = now()
  FROM jsonb_array_elements(v_before_penalties) item(value)
  WHERE penalty.id = (item.value ->> 'id')::uuid
    AND penalty.company_id = v_company_id;

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
    v_actor_user_id, v_company_id,
    'C_ALF_0105_CANCELLATION_AND_PENALTY_RECONCILIATION_ROLLED_BACK',
    'contract', v_assignment.supporting_contract_id,
    jsonb_build_object(
      'status', 'cancelled',
      'vehicle_status', 'available',
      'handled_unpaid_penalty_amount', 800
    ),
    jsonb_build_object(
      'contract', v_before_contract,
      'penalties', v_before_penalties,
      'vehicle', v_assignment.before_state
    ),
    'warning', 'khamis-1992@hotmail.com', 'خميس', 'C-ALF-0105',
    'تراجع تدقيقي عن إلغاء C-ALF-0105 ومعالجة مخالفاته وإتاحة 848014.',
    'success',
    jsonb_build_object('migration_key', v_migration_key, 'batch_id', v_batch_id),
    'حُفظت سجلات التدقيق الأصلية، ولم تتغير الفواتير أو المدفوعات.'
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

ALTER TABLE public.penalties
  DROP CONSTRAINT IF EXISTS penalties_status_check;
ALTER TABLE public.penalties
  ADD CONSTRAINT penalties_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled'));

COMMIT;
