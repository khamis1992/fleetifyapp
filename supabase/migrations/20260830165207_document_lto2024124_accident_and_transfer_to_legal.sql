-- Safely document the accident-related cancellation of LTO2024124 and send it
-- to the legal review queue. The quarantined signed-contract copy remains
-- quarantined, no legal case is created, and no damage amount is invented.
DO $migration$
DECLARE
  v_company_id CONSTANT UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4'::UUID;
  v_contract_id CONSTANT UUID := '622fce10-727e-49e0-ab45-8d2b305d452e'::UUID;
  v_customer_id CONSTANT UUID := '286b0804-fdf0-4a56-b71c-90d9e9ce3839'::UUID;
  v_vehicle_id CONSTANT UUID := '209a20d1-b8f2-4105-895c-8cf73a3a2a9a'::UUID;
  v_signed_document_id CONSTANT UUID := '5c15bb03-4dcb-4d40-b0aa-7af67b876434'::UUID;
  v_actor_user_id CONSTANT UUID := '2a2b3a8a-35dd-4251-a8ba-09f70538c920'::UUID;
  v_actor_profile_id CONSTANT UUID := '320f8030-ee98-4f9f-bab8-7341e80cd588'::UUID;
  v_migration_key CONSTANT TEXT := '20260830174500_lto2024124_accident_legal_transfer';
  v_case_note CONSTANT TEXT := 'تم إلغاء العقد بتاريخ 27/01/2026 بواسطة طارق البوزيدي بعد وقوع حادث للمركبة وإلغاء العميل للمركبة. تطالب الشركة بإلزام العميل بقيمة الأضرار الفعلية التي تثبت بتقرير الحادث، وصور الأضرار، وتقديرات أو فواتير الإصلاح، ومستندات التأمين، بعد خصم أي مبالغ تسترد من التأمين أو الغير. لا يُدرج مبلغ أضرار غير موثق قبل استكمال الأدلة.';
  v_match_count INTEGER;
  v_review_id UUID;
  v_evidence_task_id UUID;
  v_damage_task_id UUID;
BEGIN
  PERFORM 1
  FROM public.contracts contract
  WHERE contract.id = v_contract_id
    AND contract.company_id = v_company_id
    AND contract.customer_id = v_customer_id
    AND contract.vehicle_id = v_vehicle_id
    AND contract.contract_number = 'LTO2024124'
    AND contract.status = 'cancelled'
    AND contract.vehicle_returned = false
    AND contract.description IS NULL
    AND contract.suspension_reason IS NULL
    AND contract.legal_status IS NULL
    AND contract.sub_status IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LTO2024124 no longer matches the reviewed cancelled state';
  END IF;

  PERFORM 1
  FROM public.customers customer
  WHERE customer.id = v_customer_id
    AND customer.company_id = v_company_id
    AND customer.customer_code = 'IND-25-0167'
    AND BTRIM(customer.first_name) = 'أمير'
    AND BTRIM(customer.last_name) = 'عبد الرحمن احمد المهدى'
    AND BTRIM(customer.first_name_ar) = 'أمير'
    AND BTRIM(customer.last_name_ar) IN ('عبد الرحمن احمد المهدى بط', 'عبد الرحمن احمد المهدى')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The reviewed customer identity for LTO2024124 no longer matches';
  END IF;

  PERFORM 1
  FROM public.profiles profile
  WHERE profile.id = v_actor_profile_id
    AND profile.user_id = v_actor_user_id
    AND profile.company_id = v_company_id
    AND profile.is_active = true;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.user_roles role
    WHERE role.user_id = v_actor_user_id
      AND role.company_id = v_company_id
      AND role.role::TEXT IN ('super_admin', 'admin', 'company_admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'The approved manager identity is unavailable or unauthorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.company_id = v_company_id
      AND legal_case.contract_id = v_contract_id
      AND LOWER(COALESCE(legal_case.case_status, '')) IN
        ('open', 'active', 'pending', 'on_hold', 'under_review')
  ) THEN
    RAISE EXCEPTION 'LTO2024124 already has an active legal case';
  END IF;

  SELECT COUNT(*) INTO v_match_count
  FROM public.contract_documents document
  WHERE document.company_id = v_company_id
    AND document.contract_id = v_contract_id
    AND document.document_type IN ('signed_contract', 'signed_contract_image')
    AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL
    AND document.legal_identity_match_status = 'matched';
  IF v_match_count <> 1 THEN
    RAISE EXCEPTION 'Expected one matched signed contract document for LTO2024124, found %', v_match_count;
  END IF;

  PERFORM 1
  FROM public.contract_documents document
  WHERE document.id = v_signed_document_id
    AND document.company_id = v_company_id
    AND document.contract_id = v_contract_id
    AND document.document_type = 'signed_contract'
    AND document.legal_identity_match_status = 'matched'
    AND document.legal_evidence_state = 'quarantined'
    AND document.ocr_review_reason = 'AMBIGUOUS_MULTIPLE_ACTIVE_MATCHED_DOCUMENTS'
    AND document.notes LIKE '%national_id=27273600742%'
    AND document.notes LIKE '%contract via plate=847099%'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The reviewed signed-contract evidence no longer matches the quarantine state';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.legal_transfer_employee_reviews review
    WHERE review.company_id = v_company_id
      AND review.contract_id = v_contract_id
      AND review.status IN ('awaiting_assignment', 'pending', 'in_progress', 'corrections_required', 'deferred')
  ) THEN
    RAISE EXCEPTION 'An open legal-transfer review now exists for LTO2024124';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.audit_logs audit
    WHERE audit.company_id = v_company_id
      AND audit.resource_id = v_contract_id
      AND audit.resource_type = 'contract'
      AND audit.action = 'UPDATE'
      AND audit.created_at::DATE = DATE '2026-01-27'
      AND audit.metadata ->> 'reason' = ''
      AND audit.user_email = 'tareklaribi25914@gmail.com'
  ) THEN
    RAISE EXCEPTION 'The original blank-reason cancellation audit could not be verified';
  END IF;

  -- Finish the previously authorized customer-name correction consistently in
  -- both the Arabic and non-Arabic name columns.
  UPDATE public.customers
  SET last_name_ar = 'عبد الرحمن احمد المهدى',
      updated_at = NOW()
  WHERE id = v_customer_id AND company_id = v_company_id;

  UPDATE public.contracts
  SET description = v_case_note,
      suspension_reason = 'محال للمراجعة القانونية بسبب حادث؛ إنشاء القضية معلق حتى اعتماد مستند العقد واستكمال أدلة الأضرار.',
      legal_status = 'under_legal_action',
      sub_status = 'awaiting_legal_evidence_review',
      updated_at = NOW()
  WHERE id = v_contract_id AND company_id = v_company_id;

  INSERT INTO public.legal_transfer_employee_reviews (
    company_id, contract_id, customer_id, assigned_to_profile_id,
    requested_by, status, request_reason, checklist, corrected_fields,
    request_snapshot, approval_snapshot, requested_at, due_at
  ) VALUES (
    v_company_id, v_contract_id, v_customer_id, NULL,
    v_actor_user_id, 'awaiting_assignment',
    'حادث للمركبة وإلغاء العميل للمركبة. يلزم مراجعة نسخة العقد المحجورة، والتحقق من مكان المركبة ومحضر التسليم، واستكمال مستندات الأضرار قبل إنشاء القضية.',
    jsonb_build_object(
      'contract_reviewed', false,
      'customer_reviewed', false,
      'signed_contract_reviewed', false,
      'financial_reviewed', false,
      'vehicle_custody_reviewed', false,
      'damage_evidence_reviewed', false
    ),
    jsonb_build_object(
      'cancellation_reason', 'حادث للمركبة وإلغاء العميل للمركبة',
      'customer_name_ar', 'أمير عبد الرحمن احمد المهدى'
    ),
    jsonb_build_object(
      'migration_key', v_migration_key,
      'contract_number', 'LTO2024124',
      'contract_status', 'cancelled',
      'legal_status', 'under_legal_action',
      'customer_id', v_customer_id,
      'vehicle_id', v_vehicle_id,
      'vehicle_returned_recorded', false,
      'signed_document_id', v_signed_document_id,
      'signed_document_state', 'quarantined',
      'signed_document_review_reason', 'AMBIGUOUS_MULTIPLE_ACTIVE_MATCHED_DOCUMENTS',
      'damage_amount', NULL,
      'damage_amount_status', 'awaiting_evidence',
      'captured_at', NOW()
    ),
    '{}'::JSONB,
    NOW(), NOW() + INTERVAL '2 days'
  ) RETURNING id INTO v_review_id;

  INSERT INTO public.contract_operations_log (
    contract_id, company_id, operation_type, operation_details,
    old_values, new_values, notes, performed_by
  ) VALUES (
    v_contract_id, v_company_id, 'legal_employee_review_requested',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'review_id', v_review_id,
      'status', 'awaiting_assignment',
      'signed_document_state', 'quarantined',
      'damage_amount_status', 'awaiting_evidence'
    ),
    jsonb_build_object('status', 'cancelled', 'legal_status', NULL, 'cancellation_reason', ''),
    jsonb_build_object(
      'status', 'cancelled',
      'legal_status', 'under_legal_action',
      'cancellation_reason', 'حادث للمركبة وإلغاء العميل للمركبة'
    ),
    'تم إرسال العقد للمراجعة القانونية دون تجاوز حجر المستند أو إنشاء قضية قبل اكتمال الأدلة.',
    v_actor_user_id
  );

  INSERT INTO public.tasks (
    company_id, title, description, created_by, assigned_to,
    status, priority, due_date, category, tags, metadata
  ) VALUES (
    v_company_id,
    'مراجعة نسخة العقد المحجورة LTO2024124',
    'مراجعة نسخة العقد الموقعة المرتبطة بالمركبة 847099 وحسم سبب الحجر القديم AMBIGUOUS_MULTIPLE_ACTIVE_MATCHED_DOCUMENTS. لا تعتمد النسخة ولا تنشئ القضية إلا بعد التحقق من هوية العميل ورقم المركبة وعدم وجود نسخة قانونية متعارضة.',
    v_actor_profile_id, NULL, 'pending', 'urgent', NOW() + INTERVAL '1 day',
    'legal_workflow', ARRAY['legal', 'evidence-review', 'agent-review'],
    jsonb_build_object(
      'migration_key', v_migration_key,
      'workflow_key', 'signed-contract-review:LTO2024124',
      'contract_id', v_contract_id,
      'review_id', v_review_id,
      'document_id', v_signed_document_id,
      'required_agent', 'legal-evidence-review',
      'blocking_legal_conversion', true
    )
  ) RETURNING id INTO v_evidence_task_id;

  INSERT INTO public.tasks (
    company_id, title, description, created_by, assigned_to,
    status, priority, due_date, category, tags, metadata
  ) VALUES (
    v_company_id,
    'استكمال مستندات أضرار حادث العقد LTO2024124',
    'إرفاق تقرير الحادث، صور الأضرار، تقرير الفحص، تقديرات أو فواتير الإصلاح، ومستندات التأمين وأي مبالغ مستردة من التأمين أو الغير. بعد المراجعة يسجل صافي الضرر المثبت فقط ويضاف إلى المطالبة. يلزم أيضاً التحقق من مكان المركبة الحالي وتوثيق التسليم أو عدمه بمحضر.',
    v_actor_profile_id, NULL, 'pending', 'urgent', NOW() + INTERVAL '2 days',
    'legal_workflow', ARRAY['legal', 'accident', 'damage-evidence'],
    jsonb_build_object(
      'migration_key', v_migration_key,
      'workflow_key', 'damage-evidence:LTO2024124',
      'contract_id', v_contract_id,
      'review_id', v_review_id,
      'customer_id', v_customer_id,
      'vehicle_id', v_vehicle_id,
      'damage_amount_status', 'awaiting_evidence',
      'required_evidence', jsonb_build_array(
        'accident_report', 'damage_photos', 'inspection_report',
        'repair_estimate_or_invoice', 'insurance_documents',
        'vehicle_handover_or_custody_proof'
      )
    )
  ) RETURNING id INTO v_damage_task_id;

  INSERT INTO public.audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    old_values, new_values, severity, user_email, user_name,
    entity_name, changes_summary, status, metadata, notes
  ) VALUES (
    v_actor_user_id, v_company_id,
    'CANCELLATION_REASON_DOCUMENTED_AND_LEGAL_REVIEW_REQUESTED',
    'contract', v_contract_id,
    jsonb_build_object(
      'status', 'cancelled', 'legal_status', NULL,
      'cancellation_reason', '', 'cancelled_at', '2026-01-27',
      'cancelled_by', 'طارق البوزيدي'
    ),
    jsonb_build_object(
      'status', 'cancelled', 'legal_status', 'under_legal_action',
      'cancellation_reason', 'حادث للمركبة وإلغاء العميل للمركبة',
      'legal_review_id', v_review_id,
      'damage_claim', 'requested_subject_to_evidence',
      'damage_amount', NULL
    ),
    'info', 'khamis-1992@hotmail.com', 'خميس',
    'LTO2024124',
    'توثيق سبب الإلغاء وإرسال العقد للمراجعة القانونية وإنشاء مهمتي مراجعة المستند وإثبات أضرار الحادث.',
    'success',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'review_id', v_review_id,
      'evidence_task_id', v_evidence_task_id,
      'damage_task_id', v_damage_task_id,
      'signed_document_id', v_signed_document_id,
      'legal_case_created', false,
      'legal_case_blocker', 'quarantined_signed_contract_evidence'
    ),
    v_case_note
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.id = v_contract_id
      AND contract.company_id = v_company_id
      AND contract.status = 'cancelled'
      AND contract.legal_status = 'under_legal_action'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.legal_transfer_employee_reviews review
    WHERE review.id = v_review_id
      AND review.company_id = v_company_id
      AND review.status = 'awaiting_assignment'
  ) OR EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.company_id = v_company_id
      AND legal_case.contract_id = v_contract_id
  ) THEN
    RAISE EXCEPTION 'Post-migration safe legal-review verification failed';
  END IF;
END;
$migration$;
