-- Replace the misidentified HIST-XLS-B70-706150 row with an Elias-specific
-- historical contract, assign the March/April 2026 plate penalties to the
-- customer who actually held vehicle 706150 in that period (Marwan / C-ALF-0058),
-- and convert Marwan's live contract to the legal workflow.

BEGIN;

DO $migration$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_source_id constant uuid := '2732d28f-d460-4d25-8a1e-b7da3ae32323';
  v_marwan_id constant uuid := '1479ae09-5b28-4d59-ac57-43943e8a37cb';
  v_elias_customer_id constant uuid := '42c92a86-d50d-4a70-a138-d9e4ae51f8b0';
  v_marwan_customer_id constant uuid := 'c5b1d57f-8162-4140-bcae-5d667760cac8';
  v_vehicle_id constant uuid := '854cacba-cc29-40be-9901-f929731f2964';
  v_actor_user_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_actor_profile_id constant uuid := '320f8030-ee98-4f9f-bab8-7341e80cd588';
  v_source_number constant text := 'HIST-XLS-B70-706150';
  v_replacement_number constant text := 'HIST-XLS-ELIAS-706150';
  v_marwan_number constant text := 'C-ALF-0058';
  v_migration_key constant text := '20260830220204_replace_wrong_elias_706150_and_transfer_marwan_legal';
  v_replacement_id uuid := gen_random_uuid();
  v_marwan_case_id uuid := gen_random_uuid();
  v_elias_review_id uuid := gen_random_uuid();
  v_elias_task_id uuid := gen_random_uuid();
  v_marwan_task_id uuid := gen_random_uuid();
  v_audit_id uuid := gen_random_uuid();
  v_operation_id uuid := gen_random_uuid();
  v_marwan_case_number text;
  v_marwan_case_value numeric;
  v_source public.contracts%rowtype;
  v_marwan public.contracts%rowtype;
  v_marwan_delinquent jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_company_id::text || ':vehicle:706150:identity-correction', 0));
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);
  PERFORM set_config('app.payment_allocation_sync', 'on', true);

  SELECT contract.* INTO v_source
  FROM public.contracts contract
  WHERE contract.id = v_source_id
    AND contract.company_id = v_company_id
    AND contract.contract_number = v_source_number
  FOR UPDATE;

  IF v_source.id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.audit_logs audit
      WHERE audit.company_id = v_company_id
        AND audit.action = 'replace_wrong_elias_706150_and_transfer_marwan_legal'
        AND audit.status = 'completed'
    ) AND EXISTS (
      SELECT 1 FROM public.contracts contract
      WHERE contract.company_id = v_company_id
        AND contract.contract_number = v_replacement_number
    ) THEN
      RAISE NOTICE 'Vehicle 706150 identity correction already applied; skipping';
      RETURN;
    END IF;
    RAISE EXCEPTION 'Reviewed source contract % is missing', v_source_number;
  END IF;

  SELECT contract.* INTO v_marwan
  FROM public.contracts contract
  WHERE contract.id = v_marwan_id
    AND contract.company_id = v_company_id
    AND contract.contract_number = v_marwan_number
  FOR UPDATE;

  IF v_marwan.id IS NULL THEN
    RAISE EXCEPTION 'Reviewed Marwan contract % is missing', v_marwan_number;
  END IF;

  IF v_source.customer_id <> v_elias_customer_id
     OR v_source.vehicle_id <> v_vehicle_id
     OR v_source.status <> 'under_legal_procedure'
     OR v_source.start_date <> date '2025-01-01'
     OR v_source.end_date <> date '2027-12-01'
     OR v_source.contract_amount <> 57600
     OR coalesce(v_source.total_paid, 0) <> 2650
     OR coalesce(v_source.balance_due, 0) <> 54950
  THEN
    RAISE EXCEPTION 'Elias source contract changed after approval';
  END IF;

  IF v_marwan.customer_id <> v_marwan_customer_id
     OR v_marwan.vehicle_id <> v_vehicle_id
     OR v_marwan.status <> 'active'
     OR v_marwan.start_date <> date '2025-07-11'
     OR coalesce(v_marwan.balance_due, 0) <> 56000
  THEN
    RAISE EXCEPTION 'Marwan contract changed after approval';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.company_id = v_company_id
      AND contract.contract_number = v_replacement_number
  ) OR EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.company_id = v_company_id
      AND legal_case.contract_id = v_marwan_id
      AND lower(coalesce(legal_case.case_status, '')) IN ('open', 'active', 'pending', 'on_hold', 'under_review')
  ) THEN
    RAISE EXCEPTION 'Replacement identity or an open Marwan legal case now exists';
  END IF;

  IF (SELECT count(*) FROM public.penalties penalty WHERE penalty.company_id = v_company_id AND penalty.contract_id = v_source_id) <> 2
     OR (SELECT coalesce(sum(penalty.amount), 0) FROM public.penalties penalty WHERE penalty.company_id = v_company_id AND penalty.contract_id = v_source_id) <> 1000
     OR EXISTS (
       SELECT 1 FROM public.penalties penalty
       WHERE penalty.company_id = v_company_id
         AND penalty.contract_id = v_source_id
         AND penalty.penalty_date NOT BETWEEN v_marwan.start_date AND v_marwan.end_date
     )
     OR (SELECT count(*) FROM public.invoices invoice WHERE invoice.company_id = v_company_id AND invoice.contract_id = v_source_id) <> 38
     OR (SELECT count(*) FROM public.invoices invoice WHERE invoice.company_id = v_company_id AND invoice.contract_id = v_source_id AND invoice.penalty_id IS NOT NULL) <> 2
     OR (SELECT count(*) FROM public.payments payment WHERE payment.company_id = v_company_id AND payment.contract_id = v_source_id) <> 2
     OR (SELECT coalesce(sum(payment.amount), 0) FROM public.payments payment WHERE payment.company_id = v_company_id AND payment.contract_id = v_source_id AND payment.payment_status = 'completed') <> 2650
     OR (SELECT count(*) FROM public.contract_payment_schedules schedule WHERE schedule.company_id = v_company_id AND schedule.contract_id = v_source_id) <> 36
     OR (SELECT count(*) FROM public.rental_payment_receipts receipt WHERE receipt.company_id = v_company_id AND receipt.contract_id = v_source_id) <> 2
     OR (SELECT count(*) FROM public.contract_documents document WHERE document.company_id = v_company_id AND document.contract_id = v_source_id) <> 1
     OR (SELECT count(*) FROM public.legal_cases legal_case WHERE legal_case.company_id = v_company_id AND legal_case.contract_id = v_source_id) <> 2
     OR (SELECT count(*) FROM public.legal_case_litigation_profile profile WHERE profile.company_id = v_company_id AND profile.contract_id = v_source_id) <> 1
     OR (SELECT count(*) FROM public.legal_case_memo_snapshots snapshot WHERE snapshot.company_id = v_company_id AND snapshot.contract_id = v_source_id) <> 1
  THEN
    RAISE EXCEPTION 'Audited Elias financial/legal graph changed before execution';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.contract_documents document
    WHERE document.company_id = v_company_id
      AND document.contract_id = v_marwan_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND coalesce(document.legal_evidence_state, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Marwan signed-contract evidence is no longer matched and active';
  END IF;

  SELECT coalesce(to_jsonb(delinquent), '{}'::jsonb) INTO v_marwan_delinquent
  FROM public.delinquent_customers delinquent
  WHERE delinquent.company_id = v_company_id
    AND delinquent.contract_id = v_marwan_id
    AND delinquent.is_active = true
  FOR UPDATE;

  INSERT INTO public.audit_logs (
    id, company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, new_values, metadata, status, severity,
    user_id, user_email, user_name, notes
  ) VALUES (
    v_audit_id, v_company_id,
    'replace_wrong_elias_706150_and_transfer_marwan_legal',
    'contract_identity_correction', v_source_id,
    v_source_number || ' -> ' || v_replacement_number || ' / ' || v_marwan_number,
    'إنشاء سجل ألياس التاريخي البديل، نقل مخالفات مارس/أبريل 2026 إلى مروان، وإحالة عقد مروان للشؤون القانونية',
    jsonb_build_object(
      'source_contract', to_jsonb(v_source),
      'marwan_contract', to_jsonb(v_marwan),
      'marwan_delinquent', v_marwan_delinquent,
      'source_legal_cases', (SELECT coalesce(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb) FROM public.legal_cases row_data WHERE row_data.company_id = v_company_id AND row_data.contract_id = v_source_id),
      'source_profile', (SELECT to_jsonb(row_data) FROM public.legal_case_litigation_profile row_data WHERE row_data.company_id = v_company_id AND row_data.contract_id = v_source_id),
      'source_snapshot', (SELECT to_jsonb(row_data) FROM public.legal_case_memo_snapshots row_data WHERE row_data.company_id = v_company_id AND row_data.contract_id = v_source_id),
      'lawsuit_documents', (SELECT coalesce(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb) FROM public.lawsuit_documents row_data WHERE row_data.company_id = v_company_id AND row_data.contract_id = v_source_id),
      'penalty_ids', (SELECT jsonb_agg(row_data.id ORDER BY row_data.id) FROM public.penalties row_data WHERE row_data.company_id = v_company_id AND row_data.contract_id = v_source_id),
      'penalty_invoice_ids', (SELECT jsonb_agg(row_data.id ORDER BY row_data.id) FROM public.invoices row_data WHERE row_data.company_id = v_company_id AND row_data.contract_id = v_source_id AND row_data.penalty_id IS NOT NULL),
      'penalty_schedule_ids', (
        SELECT jsonb_agg(schedule.id ORDER BY schedule.id)
        FROM public.contract_payment_schedules schedule
        JOIN public.invoices invoice ON invoice.id = schedule.invoice_id
        WHERE schedule.company_id = v_company_id AND schedule.contract_id = v_source_id AND invoice.penalty_id IS NOT NULL
      ),
      'source_document_ids', (SELECT jsonb_agg(row_data.id ORDER BY row_data.id) FROM public.contract_documents row_data WHERE row_data.company_id = v_company_id AND row_data.contract_id = v_source_id)
    ),
    jsonb_build_object(
      'replacement_contract_id', v_replacement_id,
      'replacement_contract_number', v_replacement_number,
      'marwan_case_id', v_marwan_case_id,
      'source_deleted', true
    ),
    jsonb_build_object(
      'migration_key', v_migration_key,
      'elias_review_id', v_elias_review_id,
      'elias_task_id', v_elias_task_id,
      'marwan_task_id', v_marwan_task_id,
      'marwan_case_id', v_marwan_case_id,
      'vehicle_plate', '706150',
      'reason', 'penalties occurred during Marwan actual contract period'
    ),
    'completed', 'critical', v_actor_user_id,
    'khamis-1992@hotmail.com', 'خميس',
    'عملية ذرّية قابلة للتراجع؛ لا تنشئ حيازة حالية أو استحقاقاً جارياً باسم ألياس.'
  );

  -- Create the corrected historical identity with the same contractual dates
  -- and amounts. It starts in a temporary legal state while active financial
  -- records are repointed, then is closed as a non-current historical row.
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
    v_replacement_id, v_source.account_id, v_source.assigned_at,
    v_source.assigned_by_profile_id, v_source.assigned_to_profile_id,
    v_source.assignment_notes, false, v_source.balance_due, v_company_id,
    v_source.contract_amount, v_source.contract_date, v_replacement_number,
    v_source.contract_type, v_source.cost_center_id, v_source.created_at,
    v_source.created_by, 'excel_import_recovery',
    v_migration_key || ':' || v_replacement_id::text, v_elias_customer_id,
    v_source.days_overdue,
    concat_ws(E'\n', nullif(v_source.description, ''),
      'سجل تاريخي مصحح لألياس يعقوبي. حُفظت تواريخ السجل المستورد كما طلبت الإدارة، ولا يثبت هذا السجل حيازة المركبة بعد بدء عقد مروان باكير في 11/07/2025.'),
    v_source.end_date, v_source.expired_at, v_source.journal_entry_id,
    v_source.last_payment_check_date, v_source.last_payment_date,
    v_source.last_renewal_check, v_source.late_fine_amount,
    'under_legal_action', v_source.license_plate, v_source.make, v_source.model,
    v_source.monthly_amount, v_source.payment_status, v_source.renewal_terms,
    v_source.start_date, 'under_legal_procedure', 'identity_correction_review',
    'مراجعة قانونية آلية بعد تصحيح هوية العقد وإعادة إسناد مخالفات فترة مروان.',
    v_source.terms, v_source.total_paid, now(), v_vehicle_id, false,
    v_source.vehicle_status, v_source.year
  );
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  -- The two imported penalties, their invoices and their schedule rows belong
  -- to Marwan because both dates fall inside his actual vehicle custody period.
  UPDATE public.penalties
  SET contract_id = v_marwan_id,
      original_contract_id = v_marwan_id,
      original_contract_number = v_marwan_number,
      customer_id = v_marwan_customer_id,
      responsible_customer_id = v_marwan_customer_id,
      notes = concat_ws(E'\n', nullif(notes, ''),
        'أعيد إسنادها من السجل الخاطئ HIST-XLS-B70-706150 إلى C-ALF-0058 لأن تاريخ المخالفة يقع ضمن حيازة مروان باكير للمركبة 706150.'),
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.invoices
  SET contract_id = v_marwan_id,
      customer_id = v_marwan_customer_id,
      updated_at = now()
  WHERE company_id = v_company_id
    AND contract_id = v_source_id
    AND penalty_id IS NOT NULL;

  UPDATE public.contract_payment_schedules schedule
  SET contract_id = v_marwan_id,
      status = 'cancelled',
      description = concat_ws(E'\n', nullif(description, ''),
        'أُلغي سطر الجدول المكرر عند نقل المخالفة إلى C-ALF-0058؛ تبقى الفاتورة والمخالفة مستحقتين دون إنشاء قسط ثانٍ في الشهر نفسه.'),
      updated_at = now()
  WHERE schedule.company_id = v_company_id
    AND schedule.contract_id = v_source_id
    AND EXISTS (
      SELECT 1 FROM public.invoices invoice
      WHERE invoice.id = schedule.invoice_id
        AND invoice.company_id = v_company_id
        AND invoice.contract_id = v_marwan_id
        AND invoice.penalty_id IS NOT NULL
    );

  UPDATE public.contract_documents
  SET contract_id = v_marwan_id,
      notes = concat_ws(E'\n', nullif(notes, ''),
        'نُقل كشف مخالفات اللوحة 706150 إلى عقد مروان C-ALF-0058 بعد تصحيح هوية السجل.'),
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  -- Preserve Elias's actual rent/payment history on the replacement identity.
  UPDATE public.invoices
  SET contract_id = v_replacement_id,
      customer_id = v_elias_customer_id,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.payments
  SET contract_id = v_replacement_id,
      customer_id = v_elias_customer_id,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.contract_payment_schedules
  SET contract_id = v_replacement_id,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.rental_payment_receipts
  SET contract_id = v_replacement_id,
      customer_id = v_elias_customer_id,
      vehicle_id = v_vehicle_id,
      notes = concat_ws(E'\n', nullif(notes, ''), 'نُقل إلى سجل ألياس التاريخي المصحح ' || v_replacement_number),
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.customer_communications
  SET contract_id = v_replacement_id,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.employee_tasks
  SET contract_id = v_replacement_id,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.excel_import_versions
  SET contract_id = v_replacement_id,
      summary = replace(
        replace(summary::text, v_source_id::text, v_replacement_id::text),
        v_source_number, v_replacement_number
      )::jsonb,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.missing_contract_pdf_requests
  SET contract_id = v_replacement_id,
      contract_number = v_replacement_number,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.legal_cases
  SET contract_id = v_replacement_id,
      description = replace(replace(coalesce(description, ''), v_source_id::text, v_replacement_number), v_source_number, v_replacement_number),
      notes = concat_ws(E'\n', replace(coalesce(notes, ''), v_source_number, v_replacement_number),
        'تصحيح 31/08/2026: المخالفتان بقيمة 1,000 ر.ق نُقلتا إلى عقد مروان C-ALF-0058 لوقوعهما أثناء حيازته للمركبة.'),
      case_value = CASE WHEN id = '3bf95c19-6fe3-45ce-a067-09b9d607ef8a'::uuid THEN 30350 ELSE case_value END,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.legal_case_litigation_profile
  SET contract_id = v_replacement_id,
      vehicle_custody = 'unknown',
      legal_review_status = 'draft', approved_by = null, approved_at = null,
      approval_source = null, approval_job_id = null, approval_worker_id = null,
      notes = concat_ws(E'\n', nullif(notes, ''),
        'أعيد الملف للمراجعة بعد تصحيح هوية العقد. لا يُنسب احتباس المركبة لألياس بعد 11/07/2025؛ يلزم الوكيل تحديد نهاية حيازته من المستندات قبل اعتماد المطالبة.'),
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  -- The snapshot remains immutable historical evidence; only its FK identity
  -- is repointed while mutation guards are transactionally suspended.
  ALTER TABLE public.legal_case_memo_snapshots DISABLE TRIGGER USER;
  UPDATE public.legal_case_memo_snapshots
  SET contract_id = v_replacement_id
  WHERE company_id = v_company_id AND contract_id = v_source_id;
  ALTER TABLE public.legal_case_memo_snapshots ENABLE TRIGGER USER;

  UPDATE public.legal_transfer_employee_reviews
  SET contract_id = v_replacement_id,
      request_snapshot = replace(
        replace(request_snapshot::text, v_source_id::text, v_replacement_id::text),
        v_source_number, v_replacement_number
      )::jsonb,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.legal_case_evidence_proposals
  SET contract_id = v_replacement_id,
      status = 'superseded',
      reason = reason || ' — أُلغي اعتماد المقترح بعد تصحيح هوية العقد وحيازة المركبة.',
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  UPDATE public.legal_filing_repair_audit
  SET contract_id = v_replacement_id
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  -- Generated documents contain the old identity and penalty claim, so they
  -- are removed and retained in the audit snapshot for exact rollback. The
  -- agent task below requires regeneration from the corrected graph.
  DELETE FROM public.lawsuit_documents
  WHERE company_id = v_company_id AND contract_id = v_source_id;

  INSERT INTO public.legal_transfer_employee_reviews (
    id, company_id, contract_id, customer_id, assigned_to_profile_id,
    requested_by, status, request_reason, checklist, corrected_fields,
    request_snapshot, approval_snapshot, requested_at, due_at
  ) VALUES (
    v_elias_review_id, v_company_id, v_replacement_id, v_elias_customer_id,
    'da3bd48d-7d74-4106-b7ac-c0842f05d43b'::uuid,
    v_actor_user_id, 'awaiting_assignment',
    'مراجعة كاملة لملف ألياس بعد إنشاء الهوية التاريخية الصحيحة وحذف المذكرة وكشف المطالبات القديمين ونقل مخالفات مارس/أبريل 2026 إلى مروان.',
    jsonb_build_object(
      'contract_identity_reviewed', false,
      'custody_period_reviewed', false,
      'financial_reviewed', false,
      'signed_contract_reviewed', false,
      'memo_regenerated', false
    ),
    jsonb_build_object(
      'replacement_contract_number', v_replacement_number,
      'removed_penalties', 2,
      'removed_penalty_amount', 1000,
      'current_vehicle_custody', 'not_attributed_after_2025-07-11'
    ),
    jsonb_build_object(
      'migration_key', v_migration_key,
      'old_contract_id', v_source_id,
      'new_contract_id', v_replacement_id,
      'old_contract_number', v_source_number,
      'new_contract_number', v_replacement_number,
      'captured_at', now()
    ),
    '{}'::jsonb, now(), now() + interval '1 day'
  );

  INSERT INTO public.tasks (
    id, company_id, title, description, created_by, assigned_to,
    status, priority, due_date, category, tags, metadata
  ) VALUES (
    v_elias_task_id, v_company_id,
    'إعادة مراجعة وتجهيز ملف ألياس — ' || v_replacement_number,
    'راجع تواريخ حيازة ألياس، الفواتير والمدفوعات، ومستند العقد الصحيح. ولّد مذكرة وكشف مطالبات جديدين دون مخالفتي مارس/أبريل 2026 ودون نسبة حيازة المركبة إليه بعد بدء عقد مروان في 11/07/2025.',
    v_actor_profile_id, null, 'pending', 'urgent', now() + interval '1 day',
    'legal_workflow', ARRAY['legal', 'agent-review', 'identity-correction'],
    jsonb_build_object(
      'migration_key', v_migration_key,
      'workflow_key', 'legal-rebuild:' || v_replacement_number,
      'contract_id', v_replacement_id,
      'review_id', v_elias_review_id,
      'required_agent', 'legal-evidence-review',
      'regenerate_lawsuit_documents', true
    )
  );

  -- Recalculate the delinquency card after adding two further unpaid QAR 500
  -- penalties, then create the legal case using the system's canonical rule:
  -- full contract balance + unpaid penalties.
  UPDATE public.delinquent_customers
  SET violations_count = (
        SELECT count(*) FROM public.penalties penalty
        WHERE penalty.company_id = v_company_id AND penalty.contract_id = v_marwan_id
          AND lower(coalesce(penalty.payment_status, 'unpaid')) <> 'paid'
          AND lower(coalesce(penalty.status, 'pending')) <> 'cancelled'
      ),
      violations_amount = (
        SELECT coalesce(sum(penalty.amount), 0) FROM public.penalties penalty
        WHERE penalty.company_id = v_company_id AND penalty.contract_id = v_marwan_id
          AND lower(coalesce(penalty.payment_status, 'unpaid')) <> 'paid'
          AND lower(coalesce(penalty.status, 'pending')) <> 'cancelled'
      ),
      overdue_amount = coalesce(overdue_amount, 0) + 1000,
      total_debt = coalesce(total_debt, 0) + 1000,
      recommended_action = 'تم التحويل للشؤون القانونية بعد تصحيح مخالفات المركبة 706150',
      has_previous_legal_cases = true,
      last_updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_marwan_id AND is_active = true;

  SELECT coalesce(v_marwan.balance_due, 0)
       + coalesce(v_marwan.late_fine_amount, 0)
       + coalesce(sum(penalty.amount), 0)
  INTO v_marwan_case_value
  FROM public.penalties penalty
  WHERE penalty.company_id = v_company_id
    AND penalty.contract_id = v_marwan_id
    AND lower(coalesce(penalty.payment_status, 'unpaid')) <> 'paid'
    AND lower(coalesce(penalty.status, 'pending')) <> 'cancelled';

  IF v_marwan_case_value <> 58000 THEN
    RAISE EXCEPTION 'Unexpected Marwan legal claim after penalty transfer: %', v_marwan_case_value;
  END IF;

  v_marwan_case_number := public.generate_legal_case_number(v_company_id);

  INSERT INTO public.legal_cases (
    id, company_id, contract_id, case_number, case_title, case_title_ar,
    case_type, case_status, workflow_stage, priority, client_id, client_name,
    client_phone, client_email, case_value, description, notes, legal_fees,
    court_fees, other_expenses, total_costs, billing_status, is_confidential,
    legal_team, tags, filing_date, created_by
  )
  SELECT
    v_marwan_case_id, v_company_id, v_marwan_id, v_marwan_case_number,
    'تحصيل مستحقات عقد ' || v_marwan_number,
    'تحصيل مستحقات عقد ' || v_marwan_number,
    'payment_collection', 'pending', 'preparation', 'high',
    customer.id,
    btrim(concat_ws(' ', coalesce(customer.first_name_ar, customer.first_name), coalesce(customer.last_name_ar, customer.last_name))),
    customer.phone, customer.email, v_marwan_case_value,
    'قضية تحصيل مستحقات العقد C-ALF-0058 بعد تصحيح إسناد مخالفات المركبة 706150.',
    concat_ws(E'\n',
      'رقم العقد: ' || v_marwan_number,
      'رقم لوحة المركبة: 706150',
      'حالة المركبة عند التحويل: ما زالت لدى العميل',
      'رصيد العقد: ' || coalesce(v_marwan.balance_due, 0)::text || ' ر.ق',
      'المخالفات غير المسددة: 4 بإجمالي 2,000 ر.ق',
      'منها مخالفتان مؤرختان 01/03/2026 و01/04/2026 نُقلتا من السجل الخاطئ لوقوعهما أثناء فترة هذا العقد.'
    ),
    0, 0, 0, 0, 'pending', false, '[]'::jsonb,
    jsonb_build_array('تحويل_من_عقد', v_marwan_number, 'تصحيح_هوية_706150'),
    current_date, v_actor_user_id
  FROM public.customers customer
  WHERE customer.id = v_marwan_customer_id AND customer.company_id = v_company_id;

  INSERT INTO public.legal_case_activities (
    case_id, company_id, activity_type, activity_title,
    activity_description, new_values, created_by
  ) VALUES (
    v_marwan_case_id, v_company_id, 'case_created',
    'تم إنشاء القضية من عقد مروان بعد تصحيح مخالفات المركبة',
    'تم تحويل C-ALF-0058 للشؤون القانونية وربط مخالفات مارس وأبريل 2026 به وفق فترة الحيازة.',
    jsonb_build_object('case_value', v_marwan_case_value, 'penalties_count', 4, 'penalties_total', 2000),
    v_actor_user_id
  );

  INSERT INTO public.tasks (
    id, company_id, title, description, created_by, assigned_to,
    status, priority, due_date, category, tags, metadata
  ) VALUES (
    v_marwan_task_id, v_company_id,
    'تجهيز ومراجعة قضية مروان — ' || v_marwan_number,
    'راجع العقد الموقع، رصيد العقد، المخالفات الأربع وكشفي الإثبات، ثم جهز المذكرة وكشف المطالبات. لا تعتمد الرفع القضائي إلا بعد اكتمال مراجعة الوكيل.',
    v_actor_profile_id, null, 'pending', 'urgent', now() + interval '1 day',
    'legal_workflow', ARRAY['legal', 'agent-review', 'case-preparation'],
    jsonb_build_object(
      'migration_key', v_migration_key,
      'workflow_key', 'legal-prepare:' || v_marwan_number,
      'contract_id', v_marwan_id,
      'case_id', v_marwan_case_id,
      'required_agent', 'legal-evidence-review'
    )
  );

  INSERT INTO public.contract_operations_log (
    id, contract_id, company_id, operation_type, operation_details,
    old_values, new_values, notes, performed_by
  ) VALUES (
    v_operation_id, v_marwan_id, v_company_id, 'convert_to_legal',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'legal_case_id', v_marwan_case_id,
      'legal_case_number', v_marwan_case_number,
      'total_case_value', v_marwan_case_value,
      'transferred_penalties_count', 2,
      'transferred_penalties_amount', 1000
    ),
    jsonb_build_object('status', v_marwan.status, 'legal_status', v_marwan.legal_status),
    jsonb_build_object('status', 'under_legal_procedure', 'legal_status', 'under_legal_action'),
    'تم تصحيح مخالفات اللوحة 706150 وتحويل عقد مروان للشؤون القانونية مع إبقاء المركبة في حالة مؤجرة.',
    v_actor_user_id
  );

  -- Final identity/status writes are supervised and asserted below. Regular
  -- status triggers are suspended only for these rows to avoid legacy
  -- self-updating triggers and accidental vehicle availability changes.
  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  UPDATE public.contracts
  SET status = 'cancelled',
      legal_status = null,
      sub_status = null,
      suspension_reason = 'سجل تاريخي مصحح؛ لا يمثل حيازة حالية للمركبة بعد بدء عقد C-ALF-0058.',
      vehicle_returned = false,
      description = concat_ws(E'\n', nullif(description, ''),
        'أُغلق السجل تشغيلياً لمنع ازدواج الحيازة والاستحقاق الجاري؛ ملف المطالبة التاريخية بانتظار مراجعة الوكيل.'),
      updated_at = now()
  WHERE id = v_replacement_id AND company_id = v_company_id;

  UPDATE public.contracts
  SET status = 'under_legal_procedure',
      legal_status = 'under_legal_action',
      sub_status = null,
      suspension_reason = 'تم التحويل للشؤون القانونية - قضية رقم ' || v_marwan_case_number,
      vehicle_returned = false,
      vehicle_status = 'rented',
      description = concat_ws(E'\n', nullif(description, ''),
        'تحويل قانوني بتاريخ 31/08/2026 بعد تصحيح إسناد مخالفتي مارس وأبريل 2026 للمركبة 706150.'),
      updated_at = now()
  WHERE id = v_marwan_id AND company_id = v_company_id;
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  DELETE FROM public.contracts
  WHERE id = v_source_id AND company_id = v_company_id;

  IF EXISTS (SELECT 1 FROM public.contracts WHERE id = v_source_id)
     OR NOT EXISTS (
       SELECT 1 FROM public.contracts
       WHERE id = v_replacement_id AND company_id = v_company_id
         AND contract_number = v_replacement_number AND status = 'cancelled'
         AND customer_id = v_elias_customer_id AND vehicle_id = v_vehicle_id
     )
     OR NOT EXISTS (
       SELECT 1 FROM public.contracts
       WHERE id = v_marwan_id AND company_id = v_company_id
         AND status = 'under_legal_procedure' AND legal_status = 'under_legal_action'
         AND vehicle_returned = false
     )
     OR (SELECT count(*) FROM public.penalties WHERE company_id = v_company_id AND contract_id = v_marwan_id) <> 4
     OR (SELECT coalesce(sum(amount), 0) FROM public.penalties WHERE company_id = v_company_id AND contract_id = v_marwan_id) <> 2000
     OR (SELECT count(*) FROM public.penalties WHERE company_id = v_company_id AND contract_id = v_replacement_id) <> 0
     OR (SELECT count(*) FROM public.invoices WHERE company_id = v_company_id AND contract_id = v_replacement_id) <> 36
     OR (SELECT coalesce(sum(total_amount), 0) FROM public.invoices WHERE company_id = v_company_id AND contract_id = v_replacement_id) <> 57600
     OR (SELECT count(*) FROM public.payments WHERE company_id = v_company_id AND contract_id = v_replacement_id) <> 2
     OR (SELECT coalesce(sum(amount), 0) FROM public.payments WHERE company_id = v_company_id AND contract_id = v_replacement_id) <> 2650
     OR (SELECT count(*) FROM public.legal_cases WHERE company_id = v_company_id AND contract_id = v_replacement_id) <> 2
     OR NOT EXISTS (
       SELECT 1 FROM public.legal_cases
       WHERE id = v_marwan_case_id AND company_id = v_company_id
         AND contract_id = v_marwan_id AND case_status = 'pending'
         AND workflow_stage = 'preparation' AND case_value = 58000
     )
     OR EXISTS (
       SELECT 1 FROM public.legal_case_litigation_profile
       WHERE company_id = v_company_id AND contract_id = v_replacement_id
         AND vehicle_custody = 'with_defendant'
     )
     OR EXISTS (SELECT 1 FROM public.lawsuit_documents WHERE company_id = v_company_id AND contract_id = v_replacement_id)
     OR NOT EXISTS (SELECT 1 FROM public.tasks WHERE id = v_elias_task_id AND status = 'pending')
     OR NOT EXISTS (SELECT 1 FROM public.tasks WHERE id = v_marwan_task_id AND status = 'pending')
  THEN
    RAISE EXCEPTION 'Post-migration verification failed for vehicle 706150 correction';
  END IF;
END;
$migration$;

COMMIT;
