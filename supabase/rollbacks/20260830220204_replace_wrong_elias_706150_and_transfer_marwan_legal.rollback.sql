-- Reverses 20260830220204_replace_wrong_elias_706150_and_transfer_marwan_legal.
-- Refuses to run after the newly-created Marwan case advances beyond preparation.

BEGIN;

DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_source_id constant uuid := '2732d28f-d460-4d25-8a1e-b7da3ae32323';
  v_marwan_id constant uuid := '1479ae09-5b28-4d59-ac57-43943e8a37cb';
  v_elias_customer_id constant uuid := '42c92a86-d50d-4a70-a138-d9e4ae51f8b0';
  v_marwan_customer_id constant uuid := 'c5b1d57f-8162-4140-bcae-5d667760cac8';
  v_vehicle_id constant uuid := '854cacba-cc29-40be-9901-f929731f2964';
  v_source_number constant text := 'HIST-XLS-B70-706150';
  v_replacement_number constant text := 'HIST-XLS-ELIAS-706150';
  v_migration_key constant text := '20260830220204_replace_wrong_elias_706150_and_transfer_marwan_legal';
  v_audit public.audit_logs%rowtype;
  v_replacement_id uuid;
  v_marwan_case_id uuid;
  v_source public.contracts%rowtype;
  v_marwan public.contracts%rowtype;
  v_profile public.legal_case_litigation_profile%rowtype;
  v_delinquent public.delinquent_customers%rowtype;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_company_id::text || ':vehicle:706150:identity-correction', 0));
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);
  PERFORM set_config('app.payment_allocation_sync', 'on', true);

  SELECT audit.* INTO v_audit
  FROM public.audit_logs audit
  WHERE audit.company_id = v_company_id
    AND audit.action = 'replace_wrong_elias_706150_and_transfer_marwan_legal'
    AND audit.status = 'completed'
  ORDER BY audit.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_audit.id IS NULL THEN
    RAISE EXCEPTION 'Completed correction audit was not found';
  END IF;

  v_replacement_id := (v_audit.new_values ->> 'replacement_contract_id')::uuid;
  v_marwan_case_id := (v_audit.new_values ->> 'marwan_case_id')::uuid;
  v_source := jsonb_populate_record(null::public.contracts, v_audit.old_values -> 'source_contract');
  v_marwan := jsonb_populate_record(null::public.contracts, v_audit.old_values -> 'marwan_contract');
  v_profile := jsonb_populate_record(null::public.legal_case_litigation_profile, v_audit.old_values -> 'source_profile');
  v_delinquent := jsonb_populate_record(null::public.delinquent_customers, v_audit.old_values -> 'marwan_delinquent');

  IF NOT EXISTS (SELECT 1 FROM public.contracts WHERE id = v_replacement_id AND company_id = v_company_id)
     OR EXISTS (SELECT 1 FROM public.contracts WHERE id = v_source_id)
  THEN
    RAISE EXCEPTION 'Rollback identities do not match the applied correction';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.id = v_marwan_case_id
      AND (legal_case.case_status <> 'pending' OR legal_case.workflow_stage <> 'preparation')
  ) THEN
    RAISE EXCEPTION 'Marwan case advanced after migration; automatic rollback is unsafe';
  END IF;

  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  INSERT INTO public.contracts (
    id, account_id, assigned_at, assigned_by_profile_id, assigned_to_profile_id,
    assignment_notes, auto_renew_enabled, balance_due, company_id, contract_amount,
    contract_date, contract_number, contract_type, cost_center_id, created_at,
    created_by, created_via, creation_idempotency_key, customer_id, days_overdue,
    description, end_date, expired_at, journal_entry_id, last_payment_check_date,
    last_payment_date, last_renewal_check, late_fine_amount, legal_status,
    license_plate, make, model, monthly_amount, payment_status, renewal_terms,
    start_date, status, sub_status, suspension_reason, terms, total_paid,
    updated_at, vehicle_id, vehicle_returned, vehicle_status, year
  ) VALUES (
    v_source.id, v_source.account_id, v_source.assigned_at,
    v_source.assigned_by_profile_id, v_source.assigned_to_profile_id,
    v_source.assignment_notes, v_source.auto_renew_enabled, v_source.balance_due,
    v_source.company_id, v_source.contract_amount, v_source.contract_date,
    v_source.contract_number, v_source.contract_type, v_source.cost_center_id,
    v_source.created_at, v_source.created_by, v_source.created_via,
    v_source.creation_idempotency_key, v_source.customer_id, v_source.days_overdue,
    v_source.description, v_source.end_date, v_source.expired_at,
    v_source.journal_entry_id, v_source.last_payment_check_date,
    v_source.last_payment_date, v_source.last_renewal_check,
    v_source.late_fine_amount, v_source.legal_status, v_source.license_plate,
    v_source.make, v_source.model, v_source.monthly_amount,
    v_source.payment_status, v_source.renewal_terms, v_source.start_date,
    v_source.status, v_source.sub_status, v_source.suspension_reason,
    v_source.terms, v_source.total_paid, v_source.updated_at, v_source.vehicle_id,
    v_source.vehicle_returned, v_source.vehicle_status, v_source.year
  );
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  DELETE FROM public.legal_case_activities WHERE case_id = v_marwan_case_id AND company_id = v_company_id;
  DELETE FROM public.legal_cases WHERE id = v_marwan_case_id AND company_id = v_company_id;
  DELETE FROM public.tasks WHERE company_id = v_company_id AND metadata ->> 'migration_key' = v_migration_key;
  DELETE FROM public.contract_operations_log
  WHERE company_id = v_company_id
    AND operation_details ->> 'migration_key' = v_migration_key;

  UPDATE public.penalties
  SET contract_id = v_source_id,
      original_contract_id = v_source_id,
      original_contract_number = v_source_number,
      customer_id = v_elias_customer_id,
      responsible_customer_id = v_elias_customer_id,
      notes = replace(coalesce(notes, ''), E'\nأعيد إسنادها من السجل الخاطئ HIST-XLS-B70-706150 إلى C-ALF-0058 لأن تاريخ المخالفة يقع ضمن حيازة مروان باكير للمركبة 706150.', ''),
      updated_at = now()
  WHERE company_id = v_company_id
    AND id IN (
      SELECT value::text::uuid
      FROM jsonb_array_elements(v_audit.old_values -> 'penalty_ids')
    );

  UPDATE public.invoices
  SET contract_id = v_source_id, customer_id = v_elias_customer_id, updated_at = now()
  WHERE company_id = v_company_id
    AND id IN (
      SELECT value::text::uuid
      FROM jsonb_array_elements(v_audit.old_values -> 'penalty_invoice_ids')
    );

  UPDATE public.contract_payment_schedules
  SET contract_id = v_source_id,
      status = 'overdue',
      description = null,
      updated_at = now()
  WHERE company_id = v_company_id
    AND id IN (
      SELECT value::text::uuid
      FROM jsonb_array_elements(v_audit.old_values -> 'penalty_schedule_ids')
    );

  UPDATE public.contract_documents
  SET contract_id = v_source_id,
      notes = replace(coalesce(notes, ''), E'\nنُقل كشف مخالفات اللوحة 706150 إلى عقد مروان C-ALF-0058 بعد تصحيح هوية السجل.', ''),
      updated_at = now()
  WHERE company_id = v_company_id
    AND id IN (
      SELECT value::text::uuid
      FROM jsonb_array_elements(v_audit.old_values -> 'source_document_ids')
    );

  UPDATE public.invoices SET contract_id = v_source_id, customer_id = v_elias_customer_id, updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;
  UPDATE public.payments SET contract_id = v_source_id, customer_id = v_elias_customer_id, updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;
  UPDATE public.contract_payment_schedules SET contract_id = v_source_id, updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;
  UPDATE public.rental_payment_receipts SET contract_id = v_source_id, customer_id = v_elias_customer_id, vehicle_id = v_vehicle_id, updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;
  UPDATE public.customer_communications SET contract_id = v_source_id, updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;
  UPDATE public.employee_tasks SET contract_id = v_source_id, updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;
  UPDATE public.excel_import_versions
  SET contract_id = v_source_id,
      summary = replace(replace(summary::text, v_replacement_id::text, v_source_id::text), v_replacement_number, v_source_number)::jsonb,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;
  UPDATE public.missing_contract_pdf_requests
  SET contract_id = v_source_id, contract_number = v_source_number, updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;

  UPDATE public.legal_cases legal_case
  SET contract_id = old_case.contract_id,
      description = old_case.description,
      notes = old_case.notes,
      case_value = old_case.case_value,
      updated_at = old_case.updated_at
  FROM jsonb_populate_recordset(
    null::public.legal_cases,
    v_audit.old_values -> 'source_legal_cases'
  ) old_case
  WHERE legal_case.id = old_case.id AND legal_case.company_id = v_company_id;

  UPDATE public.legal_case_litigation_profile
  SET contract_id = v_source_id,
      case_id = v_profile.case_id,
      vehicle_custody = v_profile.vehicle_custody,
      legal_review_status = v_profile.legal_review_status,
      approved_by = v_profile.approved_by,
      approved_at = v_profile.approved_at,
      approval_source = v_profile.approval_source,
      approval_job_id = v_profile.approval_job_id,
      approval_worker_id = v_profile.approval_worker_id,
      notes = v_profile.notes,
      updated_at = v_profile.updated_at
  WHERE id = v_profile.id AND company_id = v_company_id;

  ALTER TABLE public.legal_case_memo_snapshots DISABLE TRIGGER USER;
  UPDATE public.legal_case_memo_snapshots SET contract_id = v_source_id
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;
  ALTER TABLE public.legal_case_memo_snapshots ENABLE TRIGGER USER;

  DELETE FROM public.legal_transfer_employee_reviews
  WHERE id = (v_audit.metadata ->> 'elias_review_id')::uuid AND company_id = v_company_id;
  UPDATE public.legal_transfer_employee_reviews
  SET contract_id = v_source_id,
      request_snapshot = replace(replace(request_snapshot::text, v_replacement_id::text, v_source_id::text), v_replacement_number, v_source_number)::jsonb,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;

  UPDATE public.legal_case_evidence_proposals
  SET contract_id = v_source_id,
      status = 'accepted',
      reason = replace(reason, ' — أُلغي اعتماد المقترح بعد تصحيح هوية العقد وحيازة المركبة.', ''),
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;
  UPDATE public.legal_filing_repair_audit SET contract_id = v_source_id
  WHERE company_id = v_company_id AND contract_id = v_replacement_id;

  INSERT INTO public.lawsuit_documents (
    id, company_id, contract_id, created_at, created_by, document_name,
    document_type, file_url, html_content, legal_case_id, updated_at
  )
  SELECT id, company_id, v_source_id, created_at, created_by, document_name,
         document_type, file_url, html_content, legal_case_id, updated_at
  FROM jsonb_populate_recordset(
    null::public.lawsuit_documents,
    v_audit.old_values -> 'lawsuit_documents'
  );

  UPDATE public.delinquent_customers
  SET actual_payments_count = v_delinquent.actual_payments_count,
      days_overdue = v_delinquent.days_overdue,
      expected_payments_count = v_delinquent.expected_payments_count,
      has_previous_legal_cases = v_delinquent.has_previous_legal_cases,
      late_penalty = v_delinquent.late_penalty,
      months_unpaid = v_delinquent.months_unpaid,
      overdue_amount = v_delinquent.overdue_amount,
      recommended_action = v_delinquent.recommended_action,
      total_debt = v_delinquent.total_debt,
      violations_amount = v_delinquent.violations_amount,
      violations_count = v_delinquent.violations_count,
      last_updated_at = v_delinquent.last_updated_at
  WHERE company_id = v_company_id AND contract_id = v_marwan_id;

  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  UPDATE public.contracts
  SET status = v_marwan.status,
      legal_status = v_marwan.legal_status,
      sub_status = v_marwan.sub_status,
      suspension_reason = v_marwan.suspension_reason,
      vehicle_returned = v_marwan.vehicle_returned,
      vehicle_status = v_marwan.vehicle_status,
      description = v_marwan.description,
      updated_at = v_marwan.updated_at
  WHERE id = v_marwan_id AND company_id = v_company_id;
  DELETE FROM public.contracts WHERE id = v_replacement_id AND company_id = v_company_id;
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, new_values, metadata, status, severity,
    user_name, notes
  ) VALUES (
    v_company_id, 'rollback_replace_wrong_elias_706150_and_transfer_marwan_legal',
    'contract_identity_correction', v_source_id, v_source_number,
    'استرجاع الحالة السابقة لتصحيح المركبة 706150',
    jsonb_build_object('replacement_contract_id', v_replacement_id, 'marwan_case_id', v_marwan_case_id),
    jsonb_build_object('source_contract_restored', true, 'marwan_contract_restored', true),
    jsonb_build_object('migration_key', v_migration_key, 'forward_audit_id', v_audit.id),
    'completed', 'critical', 'Codex production rollback',
    'تم الاسترجاع من لقطة التدقيق دون إسقاط أي دفعة أو فاتورة.'
  );
END;
$rollback$;

COMMIT;
