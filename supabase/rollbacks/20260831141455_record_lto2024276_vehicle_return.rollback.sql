DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id constant uuid := 'd00185fb-df9a-4abd-975a-cc99aab7bf77';
  v_migration_key constant text := '20260831141455_record_lto2024276_vehicle_return';
  v_audit public.audit_logs%ROWTYPE;
  v_contract jsonb;
  v_vehicle jsonb;
  v_profile jsonb;
  v_case jsonb;
  v_review_task jsonb;
BEGIN
  SELECT * INTO STRICT v_audit
  FROM public.audit_logs AS audit_log
  WHERE audit_log.company_id = v_company_id
    AND audit_log.resource_id = v_contract_id
    AND audit_log.action = 'record_lto2024276_vehicle_return'
    AND audit_log.metadata ->> 'migration_key' = v_migration_key
  FOR UPDATE;

  v_contract := v_audit.old_values -> 'contract';
  v_vehicle := v_audit.old_values -> 'vehicle';
  v_profile := v_audit.old_values -> 'litigation_profile';
  v_case := v_audit.old_values -> 'legal_case';
  v_review_task := v_audit.old_values -> 'review_task';

  IF EXISTS (
    SELECT 1 FROM public.legal_cases AS legal_case
    WHERE legal_case.id = (v_audit.metadata ->> 'case_id')::uuid
      AND (legal_case.filing_date IS NOT NULL OR legal_case.workflow_stage IS DISTINCT FROM 'preparation')
  ) THEN
    RAISE EXCEPTION 'Refusing rollback: legal file progressed after vehicle return';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contract_vehicle_returns AS vehicle_return
    WHERE vehicle_return.company_id = v_company_id
      AND vehicle_return.contract_id = v_contract_id
  ) THEN
    RAISE EXCEPTION 'Refusing rollback: a formal return record now exists';
  END IF;

  DELETE FROM public.contract_operations_log
  WHERE id = (v_audit.metadata ->> 'operation_id')::uuid;

  DELETE FROM public.legal_case_activities
  WHERE id = (v_audit.metadata ->> 'activity_id')::uuid;

  DELETE FROM public.tasks
  WHERE id = (v_audit.metadata ->> 'followup_task_id')::uuid;

  UPDATE public.tasks
  SET description = v_review_task ->> 'description',
      metadata = v_review_task -> 'metadata',
      updated_at = (v_review_task ->> 'updated_at')::timestamptz
  WHERE id = (v_review_task ->> 'id')::uuid
    AND company_id = v_company_id;

  UPDATE public.legal_cases
  SET notes = v_case ->> 'notes',
      updated_at = (v_case ->> 'updated_at')::timestamptz
  WHERE id = (v_case ->> 'id')::uuid
    AND company_id = v_company_id;

  UPDATE public.legal_case_litigation_profile
  SET vehicle_custody = v_profile ->> 'vehicle_custody',
      vehicle_returned_at = nullif(v_profile ->> 'vehicle_returned_at', '')::date,
      notes = v_profile ->> 'notes',
      updated_at = (v_profile ->> 'updated_at')::timestamptz
  WHERE id = (v_profile ->> 'id')::uuid
    AND company_id = v_company_id;

  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  UPDATE public.contracts
  SET vehicle_returned = coalesce((v_contract ->> 'vehicle_returned')::boolean, false),
      vehicle_status = v_contract ->> 'vehicle_status',
      description = v_contract ->> 'description',
      suspension_reason = v_contract ->> 'suspension_reason',
      updated_at = (v_contract ->> 'updated_at')::timestamptz
  WHERE id = v_contract_id
    AND company_id = v_company_id;
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  UPDATE public.vehicles
  SET status = (v_vehicle ->> 'status')::public.vehicle_status,
      notes = v_vehicle ->> 'notes',
      updated_at = (v_vehicle ->> 'updated_at')::timestamptz
  WHERE id = (v_vehicle ->> 'id')::uuid
    AND company_id = v_company_id;

  DELETE FROM public.audit_logs
  WHERE id = v_audit.id;
EXCEPTION
  WHEN OTHERS THEN
    BEGIN
      ALTER TABLE public.contracts ENABLE TRIGGER USER;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RAISE;
END;
$rollback$;
