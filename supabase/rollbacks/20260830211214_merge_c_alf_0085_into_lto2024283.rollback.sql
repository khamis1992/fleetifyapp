-- Restore the exact before-state captured by the matching append-only audit.

BEGIN;

DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_source_number constant text := 'C-ALF-0085';
  v_target_number constant text := 'LTO2024283';
  v_audit public.audit_logs%ROWTYPE;
  v_source_json jsonb;
  v_target_json jsonb;
  v_source_id uuid;
  v_target_id uuid;
  v_history_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      v_company_id::text || ':contract-merge:' || v_source_number || ':' || v_target_number,
      0
    )
  );
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);
  PERFORM set_config('app.payment_allocation_sync', 'on', true);

  SELECT audit.*
  INTO v_audit
  FROM public.audit_logs audit
  WHERE audit.company_id = v_company_id
    AND audit.action = 'contract_merge_c_alf_0085_into_lto2024283'
    AND audit.status = 'completed'
  ORDER BY audit.created_at DESC, audit.id DESC
  LIMIT 1;

  IF v_audit.id IS NULL THEN
    RAISE EXCEPTION 'Rollback snapshot was not found in the immutable audit ledger';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.audit_logs audit
    WHERE audit.company_id = v_company_id
      AND audit.action = 'rollback_contract_merge_c_alf_0085_into_lto2024283'
      AND audit.metadata ->> 'forward_audit_id' = v_audit.id::text
  ) THEN
    RAISE NOTICE 'Contract merge rollback already applied; skipping idempotently';
    RETURN;
  END IF;

  v_source_json := v_audit.old_values::jsonb -> 'source_contract';
  v_target_json := v_audit.old_values::jsonb -> 'target_contract';
  v_source_id := (v_source_json ->> 'id')::uuid;
  v_target_id := (v_target_json ->> 'id')::uuid;
  v_history_id := (v_audit.metadata::jsonb ->> 'history_id')::uuid;

  IF EXISTS (SELECT 1 FROM public.contracts contract WHERE contract.id = v_source_id)
     OR NOT EXISTS (SELECT 1 FROM public.contracts contract WHERE contract.id = v_target_id)
  THEN
    RAISE EXCEPTION 'Rollback precondition failed: unexpected source/target contract state';
  END IF;

  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  UPDATE public.contracts
  SET status = 'cancelled', updated_at = now()
  WHERE id = v_target_id AND company_id = v_company_id;

  INSERT INTO public.contracts
  SELECT (jsonb_populate_record(NULL::public.contracts, v_source_json)).*;
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  UPDATE public.invoices
  SET contract_id = v_source_id, customer_id = (v_source_json ->> 'customer_id')::uuid
  WHERE id IN (
    SELECT jsonb_array_elements_text(v_audit.old_values::jsonb -> 'invoice_ids')::uuid
  );

  UPDATE public.payments
  SET contract_id = v_source_id, customer_id = (v_source_json ->> 'customer_id')::uuid
  WHERE id IN (
    SELECT jsonb_array_elements_text(v_audit.old_values::jsonb -> 'payment_ids')::uuid
  );

  UPDATE public.penalties
  SET contract_id = v_source_id,
      original_contract_id = v_source_id,
      original_contract_number = v_source_number,
      customer_id = (v_source_json ->> 'customer_id')::uuid,
      responsible_customer_id = (v_source_json ->> 'customer_id')::uuid
  WHERE id IN (
    SELECT jsonb_array_elements_text(v_audit.old_values::jsonb -> 'penalty_ids')::uuid
  );

  UPDATE public.traffic_violations
  SET contract_id = v_source_id,
      original_contract_number = v_source_number,
      responsible_customer_id = (v_source_json ->> 'customer_id')::uuid
  WHERE id IN (
    SELECT jsonb_array_elements_text(v_audit.old_values::jsonb -> 'traffic_violation_ids')::uuid
  );

  UPDATE public.rental_payment_receipts
  SET contract_id = v_source_id,
      customer_id = (v_source_json ->> 'customer_id')::uuid,
      vehicle_id = NULLIF(v_source_json ->> 'vehicle_id', '')::uuid
  WHERE id IN (
    SELECT jsonb_array_elements_text(v_audit.old_values::jsonb -> 'receipt_ids')::uuid
  );

  UPDATE public.contract_documents
  SET contract_id = v_source_id
  WHERE id IN (
    SELECT jsonb_array_elements_text(v_audit.old_values::jsonb -> 'document_ids')::uuid
  );

  UPDATE public.delinquent_customers
  SET contract_id = v_source_id,
      contract_number = v_source_number,
      contract_start_date = (v_source_json ->> 'start_date')::date,
      monthly_rent = (v_source_json ->> 'monthly_amount')::numeric,
      vehicle_id = NULLIF(v_source_json ->> 'vehicle_id', '')::uuid
  WHERE id IN (
    SELECT jsonb_array_elements_text(v_audit.old_values::jsonb -> 'delinquent_ids')::uuid
  );

  -- The target's original schedules are active rows. Keep it billable while
  -- restoring them, then return it to its exact pre-merge cancelled state.
  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  UPDATE public.contracts
  SET status = 'under_legal_procedure', updated_at = now()
  WHERE id = v_target_id AND company_id = v_company_id;
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  DELETE FROM public.contract_payment_schedules schedule
  WHERE schedule.id IN (
    SELECT (snapshot ->> 'id')::uuid
    FROM jsonb_array_elements(v_audit.old_values::jsonb -> 'target_schedules') snapshot
  );

  INSERT INTO public.contract_payment_schedules
  SELECT (jsonb_populate_record(NULL::public.contract_payment_schedules, snapshot)).*
  FROM jsonb_array_elements(v_audit.old_values::jsonb -> 'target_schedules') snapshot;

  INSERT INTO public.contract_payment_schedules
  SELECT (jsonb_populate_record(NULL::public.contract_payment_schedules, snapshot)).*
  FROM jsonb_array_elements(v_audit.old_values::jsonb -> 'source_schedules') snapshot;

  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  UPDATE public.contracts
  SET status = v_target_json ->> 'status',
      sub_status = v_target_json ->> 'sub_status',
      legal_status = v_target_json ->> 'legal_status',
      end_date = (v_target_json ->> 'end_date')::date,
      contract_amount = (v_target_json ->> 'contract_amount')::numeric,
      total_paid = NULLIF(v_target_json ->> 'total_paid', '')::numeric,
      balance_due = NULLIF(v_target_json ->> 'balance_due', '')::numeric,
      payment_status = v_target_json ->> 'payment_status',
      description = v_target_json ->> 'description',
      vehicle_returned = NULLIF(v_target_json ->> 'vehicle_returned', '')::boolean,
      vehicle_status = v_target_json ->> 'vehicle_status',
      last_payment_date = NULLIF(v_target_json ->> 'last_payment_date', '')::date,
      updated_at = (v_target_json ->> 'updated_at')::timestamptz
  WHERE id = v_target_id AND company_id = v_company_id;
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  DELETE FROM public.contract_number_history history
  WHERE history.id = v_history_id;

  INSERT INTO public.audit_logs (
    company_id,
    action,
    resource_type,
    resource_id,
    entity_name,
    changes_summary,
    old_values,
    new_values,
    metadata,
    status,
    severity,
    user_name,
    notes
  ) VALUES (
    v_company_id,
    'rollback_contract_merge_c_alf_0085_into_lto2024283',
    'contract_merge',
    v_target_id,
    v_target_number || ' -> ' || v_source_number,
    'استعادة العقد المصدر وكل روابطه من لقطة التدقيق',
    jsonb_build_object('merged_target_id', v_target_id),
    jsonb_build_object('restored_source_id', v_source_id),
    jsonb_build_object(
      'forward_audit_id', v_audit.id,
      'rollback', '20260830211214_merge_c_alf_0085_into_lto2024283.rollback.sql'
    ),
    'completed',
    'critical',
    'Codex production rollback',
    'استعادة ذرّية للحالة السابقة؛ سجل التدقيق الأصلي بقي محفوظاً.'
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.id = v_source_id AND contract.contract_number = v_source_number
  )
     OR (SELECT count(*) FROM public.payments payment WHERE payment.contract_id = v_source_id) <> 5
     OR (SELECT count(*) FROM public.invoices invoice WHERE invoice.contract_id = v_source_id) <> 19
     OR (SELECT count(*) FROM public.contract_payment_schedules schedule WHERE schedule.contract_id = v_source_id) <> 37
     OR (SELECT count(*) FROM public.payments payment WHERE payment.contract_id = v_target_id) <> 0
     OR (SELECT count(*) FROM public.invoices invoice WHERE invoice.contract_id = v_target_id) <> 0
  THEN
    RAISE EXCEPTION 'Contract merge rollback postcondition failed; transaction rolled back';
  END IF;
END;
$rollback$;

COMMIT;
