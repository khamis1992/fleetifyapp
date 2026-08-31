-- Convert the reviewed LTO2024276 contract to the internal legal-preparation
-- workflow. This does not mark a court filing: case_status remains pending,
-- workflow_stage remains preparation, and filing_date remains NULL.

BEGIN;

DO $migration$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id constant uuid := 'd00185fb-df9a-4abd-975a-cc99aab7bf77';
  v_customer_id constant uuid := '56cc1339-1da4-4f5f-87e8-e5e8489cbca1';
  v_vehicle_id constant uuid := '22c776f2-2bdf-412a-8baa-fe6fdee5d12c';
  v_document_id constant uuid := '8541f1b9-4b43-4596-8cd4-5fd7e05e85bc';
  v_actor_user_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_actor_profile_id constant uuid := '320f8030-ee98-4f9f-bab8-7341e80cd588';
  v_migration_key constant text := '20260831134745_convert_lto2024276_to_legal';
  v_case_id uuid := gen_random_uuid();
  v_review_id uuid := gen_random_uuid();
  v_profile_id uuid := gen_random_uuid();
  v_task_id uuid := gen_random_uuid();
  v_operation_id uuid := gen_random_uuid();
  v_audit_id uuid := gen_random_uuid();
  v_case_number text;
  v_due_amount numeric;
  v_due_count integer;
  v_contract public.contracts%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_customer public.customers%rowtype;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_company_id::text || ':legal-contract:LTO2024276', 0));

  SELECT contract.* INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_contract_id
    AND contract.company_id = v_company_id
    AND contract.contract_number = 'LTO2024276'
  FOR UPDATE;

  IF v_contract.id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.audit_logs audit
      WHERE audit.company_id = v_company_id
        AND audit.action = 'convert_lto2024276_to_legal'
        AND audit.status = 'completed'
    ) AND EXISTS (
      SELECT 1 FROM public.legal_cases legal_case
      WHERE legal_case.company_id = v_company_id
        AND legal_case.contract_id = v_contract_id
        AND legal_case.case_status = 'pending'
    ) THEN
      RAISE NOTICE 'LTO2024276 legal conversion already applied; skipping';
      RETURN;
    END IF;
    RAISE EXCEPTION 'LTO2024276 was not found';
  END IF;

  SELECT vehicle.* INTO v_vehicle
  FROM public.vehicles vehicle
  WHERE vehicle.id = v_vehicle_id AND vehicle.company_id = v_company_id
  FOR UPDATE;

  SELECT customer.* INTO v_customer
  FROM public.customers customer
  WHERE customer.id = v_customer_id AND customer.company_id = v_company_id;

  IF v_contract.customer_id <> v_customer_id
     OR v_contract.vehicle_id <> v_vehicle_id
     OR v_contract.status <> 'cancelled'
     OR v_contract.legal_status IS NOT NULL
     OR v_contract.start_date <> date '2024-08-15'
     OR v_contract.end_date <> date '2027-08-15'
     OR v_contract.contract_amount <> 55500
     OR v_contract.monthly_amount <> 1500
     OR coalesce(v_contract.total_paid, 0) <> 0
     OR coalesce(v_contract.balance_due, 0) <> 55500
     OR coalesce(v_contract.vehicle_returned, false) <> false
     OR v_vehicle.plate_number <> '8209'
     OR v_vehicle.status::text <> 'rented'
     OR v_customer.id IS NULL
  THEN
    RAISE EXCEPTION 'LTO2024276 reviewed contract/customer/vehicle state changed before execution';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts other_contract
    WHERE other_contract.company_id = v_company_id
      AND other_contract.vehicle_id = v_vehicle_id
      AND other_contract.id <> v_contract_id
      AND lower(coalesce(other_contract.status, '')) IN ('active', 'under_legal_procedure')
      AND coalesce(other_contract.vehicle_returned, false) = false
  ) THEN
    RAISE EXCEPTION 'Vehicle 8209 is now assigned to another current contract';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.company_id = v_company_id
      AND legal_case.contract_id = v_contract_id
      AND lower(coalesce(legal_case.case_status, '')) IN ('open', 'active', 'pending', 'on_hold', 'under_review')
  ) OR EXISTS (
    SELECT 1 FROM public.legal_transfer_employee_reviews review
    WHERE review.company_id = v_company_id
      AND review.contract_id = v_contract_id
      AND review.status IN ('awaiting_assignment', 'pending', 'in_progress', 'corrections_required', 'deferred')
  ) THEN
    RAISE EXCEPTION 'LTO2024276 already has an open legal case or review';
  END IF;

  IF (SELECT count(*) FROM public.contract_documents document WHERE document.company_id = v_company_id AND document.contract_id = v_contract_id) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.contract_documents document
       WHERE document.id = v_document_id
         AND document.company_id = v_company_id
         AND document.contract_id = v_contract_id
         AND document.document_type IN ('signed_contract', 'signed_contract_image')
         AND document.legal_identity_match_status = 'matched'
         AND coalesce(document.legal_evidence_state, 'active') = 'active'
         AND nullif(btrim(document.file_path), '') IS NOT NULL
     )
     OR (SELECT count(*) FROM public.invoices invoice WHERE invoice.company_id = v_company_id AND invoice.contract_id = v_contract_id) <> 0
     OR (SELECT count(*) FROM public.payments payment WHERE payment.company_id = v_company_id AND payment.contract_id = v_contract_id) <> 0
     OR (SELECT count(*) FROM public.penalties penalty WHERE penalty.company_id = v_company_id AND penalty.contract_id = v_contract_id) <> 0
     OR (SELECT count(*) FROM public.contract_payment_schedules schedule WHERE schedule.company_id = v_company_id AND schedule.contract_id = v_contract_id) <> 37
     OR (
       SELECT coalesce(sum(schedule.amount), 0)
       FROM public.contract_payment_schedules schedule
       WHERE schedule.company_id = v_company_id
         AND schedule.contract_id = v_contract_id
         AND lower(coalesce(schedule.status, '')) NOT IN ('cancelled', 'canceled')
     ) <> 55500
  THEN
    RAISE EXCEPTION 'LTO2024276 reviewed financial/evidence graph changed before execution';
  END IF;

  SELECT count(*), coalesce(sum(schedule.amount - coalesce(schedule.paid_amount, 0)), 0)
  INTO v_due_count, v_due_amount
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_company_id
    AND schedule.contract_id = v_contract_id
    AND schedule.due_date <= current_date
    AND lower(coalesce(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'paid');

  IF v_due_count <> 24 OR v_due_amount <> 36000 THEN
    RAISE EXCEPTION 'Unexpected current LTO2024276 delinquency: % installments / % QAR', v_due_count, v_due_amount;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles profile
    WHERE profile.id = v_actor_profile_id
      AND profile.user_id = v_actor_user_id
      AND profile.company_id = v_company_id
      AND profile.is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.user_roles role
    WHERE role.user_id = v_actor_user_id
      AND role.company_id = v_company_id
      AND role.role::text IN ('super_admin', 'admin', 'company_admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Approved manager identity is unavailable or unauthorized';
  END IF;

  v_case_number := public.generate_legal_case_number(v_company_id);

  INSERT INTO public.audit_logs (
    id, company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, new_values, metadata, status, severity,
    user_id, user_email, user_name, notes
  ) VALUES (
    v_audit_id, v_company_id, 'convert_lto2024276_to_legal',
    'contract', v_contract_id, 'LTO2024276',
    'تحويل العقد الملغى إدارياً إلى مسار التجهيز القانوني مع إبقاء الرفع القضائي غير منفذ',
    jsonb_build_object('contract', to_jsonb(v_contract), 'vehicle', to_jsonb(v_vehicle)),
    jsonb_build_object(
      'status', 'under_legal_procedure',
      'legal_status', 'under_legal_action',
      'legal_case_id', v_case_id,
      'legal_case_number', v_case_number,
      'case_status', 'pending',
      'workflow_stage', 'preparation',
      'court_filing_completed', false
    ),
    jsonb_build_object(
      'migration_key', v_migration_key,
      'case_id', v_case_id,
      'review_id', v_review_id,
      'profile_id', v_profile_id,
      'task_id', v_task_id,
      'operation_id', v_operation_id,
      'signed_document_id', v_document_id,
      'due_installments', v_due_count,
      'due_amount', v_due_amount,
      'full_contract_balance', v_contract.balance_due
    ),
    'completed', 'critical', v_actor_user_id,
    'khamis-1992@hotmail.com', 'خميس',
    'القضية داخلية للتجهيز فقط؛ لا يوجد رقم دعوى قضائية أو إيصال رفع.'
  );

  INSERT INTO public.legal_transfer_employee_reviews (
    id, company_id, contract_id, customer_id, assigned_to_profile_id,
    requested_by, reviewed_by, overridden_by, status, request_reason,
    override_reason, checklist, corrected_fields, request_snapshot,
    approval_snapshot, requested_at, due_at, responded_at
  ) VALUES (
    v_review_id, v_company_id, v_contract_id, v_customer_id, null,
    v_actor_user_id, null, v_actor_user_id, 'manager_overridden',
    'تحويل LTO2024276 إلى الشؤون القانونية بناء على أمر الإدارة.',
    'اعتماد إداري صريح بتاريخ 31/08/2026؛ يظل اعتماد المذكرة والرفع القضائي من اختصاص الوكيل بعد مراجعة الملف.',
    '{}'::jsonb, '{}'::jsonb,
    jsonb_build_object(
      'contract_number', 'LTO2024276',
      'contract_status_before', v_contract.status,
      'customer_id', v_customer_id,
      'vehicle_id', v_vehicle_id,
      'vehicle_plate', '8209',
      'signed_document_id', v_document_id,
      'due_amount', v_due_amount,
      'full_contract_balance', v_contract.balance_due,
      'captured_at', now()
    ),
    jsonb_build_object('manager_override', true, 'approved_at', now(), 'source', 'explicit_user_instruction'),
    now(), now() + interval '2 days', now()
  );

  INSERT INTO public.legal_cases (
    id, company_id, contract_id, case_number, case_title, case_title_ar,
    case_type, case_status, workflow_stage, priority, client_id, client_name,
    client_phone, client_email, case_value, description, notes, legal_fees,
    court_fees, other_expenses, total_costs, billing_status, is_confidential,
    legal_team, tags, filing_date, created_by
  ) VALUES (
    v_case_id, v_company_id, v_contract_id, v_case_number,
    'تحصيل مستحقات عقد LTO2024276', 'تحصيل مستحقات عقد LTO2024276',
    'payment_collection', 'pending', 'preparation', 'high',
    v_customer_id,
    btrim(concat_ws(' ', coalesce(v_customer.first_name_ar, v_customer.first_name), coalesce(v_customer.last_name_ar, v_customer.last_name))),
    v_customer.phone, v_customer.email, 55500,
    'ملف داخلي لتجهيز مطالبة عقد LTO2024276؛ لم تُرفع دعوى بالمحكمة.',
    concat_ws(E'\n',
      'رقم العقد: LTO2024276',
      'العميل: سعيد الحبابي',
      'المركبة: جي ايه سي GS3 2024 — لوحة 8209',
      'المتأخر حتى تاريخ التحويل: 36,000 ر.ق عن 24 قسطاً وفق جدول السداد.',
      'الرصيد التعاقدي الكامل في النظام: 55,500 ر.ق.',
      'لا توجد فواتير أو دفعات أو مخالفات مسجلة على العقد وقت التحويل.',
      'مكان المركبة الفعلي يحتاج تحقق الوكيل؛ لا يوجد عقد أحدث مسجل عليها.',
      'لا يوجد رقم دعوى قضائية أو إيصال رفع؛ الحالة الحالية تجهيز فقط.'
    ),
    0, 0, 0, 0, 'pending', false, '[]'::jsonb,
    jsonb_build_array('تحويل_من_عقد', 'LTO2024276', 'مراجعة_الوكيل_مطلوبة'),
    null, v_actor_user_id
  );

  INSERT INTO public.legal_case_litigation_profile (
    id, company_id, contract_id, case_id, rescission_strategy,
    termination_type, termination_date_status, vehicle_custody,
    rent_due_day, legal_review_status, defendant_service_address,
    defendant_contact_source, defendant_email_status, notes, created_by
  ) VALUES (
    v_profile_id, v_company_id, v_contract_id, v_case_id,
    'judicial_rescission', 'judicial_rescission', 'requires_judicial_proof',
    'unknown', 1, 'draft', 'الدوحة قطر', 'customer_record', 'verified',
    'ملف أولي أنشئ آلياً. يجب على الوكيل التحقق من مكان المركبة، وفترة الحيازة، وصحة جدول السداد، وعدم اعتماد المذكرة قبل توليد الفواتير أو تثبيت مصدر المطالبة الحسابية.',
    v_actor_user_id
  );

  INSERT INTO public.delinquent_customers (
    company_id, customer_id, customer_name, customer_code, customer_type,
    phone, email, contract_id, contract_number, contract_start_date,
    vehicle_id, vehicle_plate, monthly_rent, total_debt, overdue_amount,
    violations_count, violations_amount, months_unpaid,
    expected_payments_count, actual_payments_count, days_overdue,
    risk_level, risk_level_en, risk_color, risk_score,
    recommended_action, has_previous_legal_cases, previous_legal_cases_count,
    is_active, first_detected_at, last_updated_at
  ) VALUES (
    v_company_id, v_customer_id,
    btrim(concat_ws(' ', coalesce(v_customer.first_name_ar, v_customer.first_name), coalesce(v_customer.last_name_ar, v_customer.last_name))),
    v_customer.customer_code, v_customer.customer_type,
    v_customer.phone, v_customer.email, v_contract_id, 'LTO2024276',
    v_contract.start_date, v_vehicle_id, '8209', 1500,
    v_due_amount, v_due_amount, 0, 0, v_due_count,
    v_due_count, 0, greatest(current_date - date '2024-09-01', 0),
    'HIGH', 'High', '#ef4444', 100,
    'تم التحويل للشؤون القانونية؛ مراجعة الوكيل مطلوبة قبل الرفع.',
    true, 1, true, now(), now()
  );

  INSERT INTO public.legal_case_activities (
    case_id, company_id, activity_type, activity_title,
    activity_description, new_values, created_by
  ) VALUES (
    v_case_id, v_company_id, 'case_created',
    'إنشاء ملف قانوني داخلي من العقد LTO2024276',
    'تم إنشاء ملف في مرحلة التجهيز دون تسجيل رفع قضائي، مع إحالة المستندات والحساب لمراجعة الوكيل.',
    jsonb_build_object(
      'case_status', 'pending', 'workflow_stage', 'preparation',
      'due_amount', v_due_amount, 'case_value', 55500,
      'court_filing_completed', false
    ),
    v_actor_user_id
  );

  INSERT INTO public.tasks (
    id, company_id, title, description, created_by, assigned_to,
    status, priority, due_date, category, tags, metadata
  ) VALUES (
    v_task_id, v_company_id,
    'مراجعة وتجهيز الملف القانوني — LTO2024276',
    'راجع العقد الموقع وهوية سعيد الحبابي ومكان المركبة 8209. طابق الأقساط الـ37، وتحقق من المتأخر البالغ 36,000 ر.ق وعدم وجود دفعات غير مستوردة، ثم أنشئ الفواتير والمذكرة وكشف المطالبات قبل أي رفع قضائي.',
    v_actor_profile_id, null, 'pending', 'urgent', now() + interval '1 day',
    'legal_workflow', ARRAY['legal', 'agent-review', 'case-preparation'],
    jsonb_build_object(
      'migration_key', v_migration_key,
      'workflow_key', 'legal-prepare:LTO2024276',
      'contract_id', v_contract_id,
      'case_id', v_case_id,
      'review_id', v_review_id,
      'profile_id', v_profile_id,
      'signed_document_id', v_document_id,
      'required_agent', 'legal-evidence-review',
      'court_filing_authorized', false
    )
  );

  INSERT INTO public.contract_operations_log (
    id, contract_id, company_id, operation_type, operation_details,
    old_values, new_values, notes, performed_by
  ) VALUES (
    v_operation_id, v_contract_id, v_company_id, 'convert_to_legal',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'legal_case_id', v_case_id,
      'legal_case_number', v_case_number,
      'case_value', 55500,
      'due_amount', v_due_amount,
      'court_filing_completed', false
    ),
    jsonb_build_object('status', v_contract.status, 'legal_status', v_contract.legal_status),
    jsonb_build_object('status', 'under_legal_procedure', 'legal_status', 'under_legal_action'),
    'تم تحويل العقد إلى مسار التجهيز القانوني وإسناد المراجعة للوكيل دون اعتماد رفع قضائي.',
    v_actor_user_id
  );

  -- Avoid legacy status triggers turning the vehicle available or generating
  -- unreviewed invoices while restoring the cancelled import to legal status.
  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  UPDATE public.contracts
  SET status = 'under_legal_procedure',
      legal_status = 'under_legal_action',
      sub_status = null,
      suspension_reason = 'تم التحويل للشؤون القانونية - ملف داخلي رقم ' || v_case_number,
      vehicle_returned = false,
      vehicle_status = 'rented',
      description = concat_ws(E'\n', nullif(description, ''),
        'تحويل قانوني داخلي بتاريخ 31/08/2026؛ مراجعة الوكيل مطلوبة قبل توليد المذكرة أو تنفيذ الرفع القضائي.'),
      updated_at = now()
  WHERE id = v_contract_id AND company_id = v_company_id;
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  UPDATE public.vehicles
  SET status = 'rented', updated_at = now()
  WHERE id = v_vehicle_id AND company_id = v_company_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.id = v_contract_id AND contract.company_id = v_company_id
      AND contract.status = 'under_legal_procedure'
      AND contract.legal_status = 'under_legal_action'
      AND contract.vehicle_returned = false
  ) OR NOT EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.id = v_case_id AND legal_case.company_id = v_company_id
      AND legal_case.contract_id = v_contract_id
      AND legal_case.case_status = 'pending'
      AND legal_case.workflow_stage = 'preparation'
      AND legal_case.filing_date IS NULL
      AND legal_case.case_value = 55500
  ) OR NOT EXISTS (
    SELECT 1 FROM public.legal_case_litigation_profile profile
    WHERE profile.id = v_profile_id AND profile.contract_id = v_contract_id
      AND profile.legal_review_status = 'draft'
      AND profile.vehicle_custody = 'unknown'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.tasks task
    WHERE task.id = v_task_id AND task.status = 'pending'
      AND task.metadata ->> 'court_filing_authorized' = 'false'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.delinquent_customers delinquent
    WHERE delinquent.company_id = v_company_id AND delinquent.contract_id = v_contract_id
      AND delinquent.is_active = true AND delinquent.overdue_amount = 36000
  ) OR NOT EXISTS (
    SELECT 1 FROM public.vehicles vehicle
    WHERE vehicle.id = v_vehicle_id AND vehicle.company_id = v_company_id
      AND vehicle.status::text = 'rented'
  ) THEN
    RAISE EXCEPTION 'Post-migration verification failed for LTO2024276 legal conversion';
  END IF;
END;
$migration$;

COMMIT;
