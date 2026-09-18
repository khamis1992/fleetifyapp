-- Reverses 20260831134745_convert_lto2024276_to_legal while the internally
-- created case is still pending/preparation and has not been filed.

BEGIN;

DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id constant uuid := 'd00185fb-df9a-4abd-975a-cc99aab7bf77';
  v_vehicle_id constant uuid := '22c776f2-2bdf-412a-8baa-fe6fdee5d12c';
  v_migration_key constant text := '20260831134745_convert_lto2024276_to_legal';
  v_audit public.audit_logs%rowtype;
  v_contract public.contracts%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_case_id uuid;
  v_review_id uuid;
  v_profile_id uuid;
  v_task_id uuid;
  v_operation_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_company_id::text || ':legal-contract:LTO2024276', 0));

  SELECT audit.* INTO v_audit
  FROM public.audit_logs audit
  WHERE audit.company_id = v_company_id
    AND audit.action = 'convert_lto2024276_to_legal'
    AND audit.status = 'completed'
  ORDER BY audit.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_audit.id IS NULL THEN
    RAISE EXCEPTION 'LTO2024276 conversion audit was not found';
  END IF;

  v_contract := jsonb_populate_record(null::public.contracts, v_audit.old_values -> 'contract');
  v_vehicle := jsonb_populate_record(null::public.vehicles, v_audit.old_values -> 'vehicle');
  v_case_id := (v_audit.metadata ->> 'case_id')::uuid;
  v_review_id := (v_audit.metadata ->> 'review_id')::uuid;
  v_profile_id := (v_audit.metadata ->> 'profile_id')::uuid;
  v_task_id := (v_audit.metadata ->> 'task_id')::uuid;
  v_operation_id := (v_audit.metadata ->> 'operation_id')::uuid;

  IF EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.id = v_case_id
      AND (
        legal_case.case_status <> 'pending'
        OR legal_case.workflow_stage <> 'preparation'
        OR legal_case.filing_date IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'The legal case advanced or was filed; automatic rollback is unsafe';
  END IF;

  DELETE FROM public.legal_case_activities
  WHERE case_id = v_case_id AND company_id = v_company_id;
  DELETE FROM public.legal_case_litigation_profile
  WHERE id = v_profile_id AND company_id = v_company_id;
  DELETE FROM public.legal_cases
  WHERE id = v_case_id AND company_id = v_company_id;
  DELETE FROM public.legal_transfer_employee_reviews
  WHERE id = v_review_id AND company_id = v_company_id;
  DELETE FROM public.tasks
  WHERE id = v_task_id AND company_id = v_company_id;
  DELETE FROM public.delinquent_customers
  WHERE company_id = v_company_id AND contract_id = v_contract_id;
  DELETE FROM public.contract_operations_log
  WHERE id = v_operation_id AND company_id = v_company_id;

  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  UPDATE public.contracts
  SET status = v_contract.status,
      legal_status = v_contract.legal_status,
      sub_status = v_contract.sub_status,
      suspension_reason = v_contract.suspension_reason,
      vehicle_returned = v_contract.vehicle_returned,
      vehicle_status = v_contract.vehicle_status,
      description = v_contract.description,
      updated_at = v_contract.updated_at
  WHERE id = v_contract_id AND company_id = v_company_id;
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  UPDATE public.vehicles
  SET status = v_vehicle.status,
      notes = v_vehicle.notes,
      updated_at = v_vehicle.updated_at
  WHERE id = v_vehicle_id AND company_id = v_company_id;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, new_values, metadata, status, severity,
    user_name, notes
  ) VALUES (
    v_company_id, 'rollback_convert_lto2024276_to_legal',
    'contract', v_contract_id, 'LTO2024276',
    'استرجاع حالة العقد قبل التحويل القانوني',
    jsonb_build_object('case_id', v_case_id, 'status', 'under_legal_procedure'),
    jsonb_build_object('status', v_contract.status, 'legal_status', v_contract.legal_status),
    jsonb_build_object('migration_key', v_migration_key, 'forward_audit_id', v_audit.id),
    'completed', 'critical', 'Codex production rollback',
    'تم الاسترجاع من لقطة التدقيق؛ لم تُحذف أي دفعة أو فاتورة.'
  );
END;
$rollback$;

COMMIT;
