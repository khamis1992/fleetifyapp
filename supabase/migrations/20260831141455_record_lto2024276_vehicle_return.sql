-- Record the management-confirmed recovery of vehicle 8209 from LTO2024276.
-- Preserve its newer employee-custody status; the legal claim stays open.
DO $migration$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id constant uuid := 'd00185fb-df9a-4abd-975a-cc99aab7bf77';
  v_vehicle_id constant uuid := '22c776f2-2bdf-412a-8baa-fe6fdee5d12c';
  v_case_id constant uuid := 'a5cf3f5c-166a-425a-933a-9b354cb9f4fc';
  v_profile_id constant uuid := '8364da5b-2000-4433-b858-251d2bc52fa7';
  v_actor_user_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_actor_profile_id constant uuid := '320f8030-ee98-4f9f-bab8-7341e80cd588';
  v_return_date constant date := date '2026-08-31';
  v_migration_key constant text := '20260831141455_record_lto2024276_vehicle_return';
  v_audit_id uuid := gen_random_uuid();
  v_activity_id uuid := gen_random_uuid();
  v_operation_id uuid := gen_random_uuid();
  v_followup_task_id uuid := gen_random_uuid();
  v_contract public.contracts%ROWTYPE;
  v_vehicle public.vehicles%ROWTYPE;
  v_profile public.legal_case_litigation_profile%ROWTYPE;
  v_case public.legal_cases%ROWTYPE;
  v_review_task public.tasks%ROWTYPE;
BEGIN
  SELECT * INTO STRICT v_contract
  FROM public.contracts AS contract
  WHERE contract.id = v_contract_id
    AND contract.company_id = v_company_id
    AND contract.contract_number = 'LTO2024276'
  FOR UPDATE;

  SELECT * INTO STRICT v_vehicle
  FROM public.vehicles AS vehicle
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id
    AND vehicle.plate_number = '8209'
  FOR UPDATE;

  SELECT * INTO STRICT v_case
  FROM public.legal_cases AS legal_case
  WHERE legal_case.id = v_case_id
    AND legal_case.company_id = v_company_id
    AND legal_case.contract_id = v_contract_id
  FOR UPDATE;

  SELECT * INTO STRICT v_profile
  FROM public.legal_case_litigation_profile AS profile
  WHERE profile.id = v_profile_id
    AND profile.company_id = v_company_id
    AND profile.case_id = v_case_id
    AND profile.contract_id = v_contract_id
  FOR UPDATE;

  SELECT * INTO STRICT v_review_task
  FROM public.tasks AS task
  WHERE task.company_id = v_company_id
    AND task.title = 'مراجعة وتجهيز الملف القانوني — LTO2024276'
  FOR UPDATE;

  IF v_contract.status::text <> 'under_legal_procedure'
     OR v_contract.legal_status IS DISTINCT FROM 'under_legal_action'
     OR coalesce(v_contract.vehicle_returned, false) IS TRUE
     OR v_contract.vehicle_id IS DISTINCT FROM v_vehicle_id
     OR v_contract.vehicle_status IS DISTINCT FROM 'rented' THEN
    RAISE EXCEPTION 'LTO2024276 is not in the expected pre-return legal state';
  END IF;

  IF v_vehicle.status::text <> 'reserved_employee'
     OR btrim(coalesce(v_vehicle.notes, '')) <> 'طارق تطواني'
     OR coalesce(v_vehicle.is_active, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Vehicle 8209 is not in the expected newer employee-custody state';
  END IF;

  IF v_case.case_status IS DISTINCT FROM 'pending'
     OR v_case.workflow_stage IS DISTINCT FROM 'preparation'
     OR v_case.filing_date IS NOT NULL THEN
    RAISE EXCEPTION 'Legal file has progressed beyond internal preparation';
  END IF;

  IF v_profile.vehicle_custody IS DISTINCT FROM 'unknown'
     OR v_profile.vehicle_returned_at IS NOT NULL
     OR v_profile.vehicle_return_document_id IS NOT NULL THEN
    RAISE EXCEPTION 'Litigation profile already contains return evidence';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contracts AS other_contract
    WHERE other_contract.company_id = v_company_id
      AND other_contract.vehicle_id = v_vehicle_id
      AND other_contract.id <> v_contract_id
      AND other_contract.status::text IN ('active', 'under_legal_procedure')
      AND coalesce(other_contract.vehicle_returned, false) IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'Vehicle 8209 has another occupying contract';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contract_vehicle_returns AS vehicle_return
    WHERE vehicle_return.company_id = v_company_id
      AND vehicle_return.contract_id = v_contract_id
  ) THEN
    RAISE EXCEPTION 'A formal vehicle return record already exists for LTO2024276';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.audit_logs AS audit_log
    WHERE audit_log.company_id = v_company_id
      AND audit_log.resource_id = v_contract_id
      AND audit_log.action = 'record_lto2024276_vehicle_return'
  ) THEN
    RAISE EXCEPTION 'LTO2024276 return was already recorded';
  END IF;

  INSERT INTO public.audit_logs (
    id, company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, new_values, metadata, status, severity,
    user_id, user_email, user_name, notes
  ) VALUES (
    v_audit_id, v_company_id, 'record_lto2024276_vehicle_return',
    'contract', v_contract_id, 'LTO2024276',
    'تسجيل استرداد المركبة 8209 من العميل مع إبقائها محجوزة للموظف طارق تطواني واستمرار التحصيل القانوني',
    jsonb_build_object(
      'contract', to_jsonb(v_contract),
      'vehicle', to_jsonb(v_vehicle),
      'litigation_profile', to_jsonb(v_profile),
      'legal_case', to_jsonb(v_case),
      'review_task', to_jsonb(v_review_task)
    ),
    jsonb_build_object(
      'contract_status', 'under_legal_procedure',
      'legal_status', 'under_legal_action',
      'vehicle_returned', true,
      'contract_vehicle_status', 'reserved_employee',
      'vehicle_status', 'reserved_employee',
      'vehicle_custody', 'unknown',
      'vehicle_returned_at', v_return_date,
      'legal_return_evidence_status', 'awaiting_document',
      'court_filing_completed', false
    ),
    jsonb_build_object(
      'migration_key', v_migration_key,
      'case_id', v_case_id,
      'profile_id', v_profile_id,
      'activity_id', v_activity_id,
      'operation_id', v_operation_id,
      'followup_task_id', v_followup_task_id,
      'return_confirmation_source', 'explicit_user_instruction',
      'formal_return_document_registered', false
    ),
    'completed', 'high', v_actor_user_id,
    'khamis-1992@hotmail.com', 'خميس',
    'تاريخ الاسترداد سجل بتاريخ تأكيد الإدارة. لم يسجل محضر استرداد أو تقرير حالة؛ أُنشئت مهمة لاستكمالهما.'
  );

  -- Keep the financial/legal status open while ending physical occupancy.
  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  UPDATE public.contracts
  SET vehicle_returned = true,
      vehicle_status = 'reserved_employee',
      description = concat_ws(E'\n', nullif(description, ''),
        'تم استرداد المركبة فعلياً بتاريخ 31/08/2026 بناء على تأكيد الإدارة؛ يستمر الملف القانوني لتحصيل المستحقات.'),
      suspension_reason = 'تحت الإجراء القانوني — تم استرداد المركبة بتاريخ 31/08/2026',
      updated_at = now()
  WHERE id = v_contract_id
    AND company_id = v_company_id;
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  UPDATE public.vehicles
  SET notes = concat_ws(E'\n', nullif(notes, ''),
        'تم استرداد المركبة من عقد LTO2024276 بتاريخ 31/08/2026؛ الحيازة التشغيلية الحالية للموظف طارق تطواني، ويلزم استكمال محضر الاسترداد وفحص الحالة.'),
      updated_at = now()
  WHERE id = v_vehicle_id
    AND company_id = v_company_id;

  UPDATE public.legal_case_litigation_profile
  SET vehicle_returned_at = v_return_date,
      notes = concat_ws(E'\n', nullif(notes, ''),
        'تأكيد إداري بتاريخ 31/08/2026: تم استرداد المركبة تشغيلياً. بقي تصنيف الحيازة القانونية غير مؤكد إلى حين رفع محضر الاسترداد وتقرير الحالة وربطهما بالملف.'),
      updated_at = now()
  WHERE id = v_profile_id
    AND company_id = v_company_id;

  UPDATE public.legal_cases
  SET notes = concat_ws(E'\n', nullif(notes, ''),
        'تم استرداد المركبة فعلياً بتاريخ 31/08/2026. يستمر الملف لتحصيل المستحقات، ولا يوجد رفع قضائي مسجل.'),
      updated_at = now()
  WHERE id = v_case_id
    AND company_id = v_company_id;

  UPDATE public.tasks
  SET description = concat_ws(E'\n', nullif(description, ''),
        'تحديث 31/08/2026: تم استرداد المركبة 8209. أوقف احتساب الحيازة عند هذا التاريخ، واستكمل محضر الاسترداد وفحص الأضرار قبل اعتماد المذكرة.'),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'vehicle_returned', true,
        'vehicle_returned_at', v_return_date,
        'formal_return_document_registered', false
      ),
      updated_at = now()
  WHERE id = v_review_task.id
    AND company_id = v_company_id;

  INSERT INTO public.tasks (
    id, company_id, title, description, created_by, assigned_to,
    status, priority, due_date, category, tags, metadata
  ) VALUES (
    v_followup_task_id, v_company_id,
    'استكمال محضر استرداد وفحص المركبة 8209 — LTO2024276',
    'سجّل محضر الاسترداد الفعلي بتاريخ 31/08/2026، وحالة المركبة والعداد والوقود والمفاتيح والوثائق والأضرار والصور. ارفع المستند ثم اربطه بملف القضية قبل اعتماد المذكرة.',
    v_actor_profile_id, null, 'pending', 'urgent', now() + interval '1 day',
    'legal_workflow', ARRAY['legal', 'vehicle-return', 'evidence-required'],
    jsonb_build_object(
      'migration_key', v_migration_key,
      'workflow_key', 'vehicle-return-evidence:LTO2024276',
      'contract_id', v_contract_id,
      'vehicle_id', v_vehicle_id,
      'case_id', v_case_id,
      'profile_id', v_profile_id,
      'vehicle_returned_at', v_return_date,
      'court_filing_authorized', false
    )
  );

  INSERT INTO public.legal_case_activities (
    id, case_id, company_id, activity_type, activity_title,
    activity_description, old_values, new_values, created_by
  ) VALUES (
    v_activity_id, v_case_id, v_company_id, 'vehicle_returned',
    'استرداد المركبة 8209',
    'تم تسجيل الاسترداد بناء على تأكيد الإدارة، مع إبقاء الملف في التجهيز لاستكمال إثبات الاسترداد وفحص الأضرار وتحصيل المستحقات.',
    jsonb_build_object('vehicle_custody', v_profile.vehicle_custody, 'vehicle_returned_at', v_profile.vehicle_returned_at),
    jsonb_build_object('vehicle_custody', 'unknown', 'vehicle_returned_at', v_return_date, 'formal_return_document_registered', false),
    v_actor_user_id
  );

  INSERT INTO public.contract_operations_log (
    id, contract_id, company_id, operation_type, operation_details,
    old_values, new_values, notes, performed_by
  ) VALUES (
    v_operation_id, v_contract_id, v_company_id, 'vehicle_return',
    jsonb_build_object(
      'migration_key', v_migration_key,
      'vehicle_id', v_vehicle_id,
      'vehicle_plate', '8209',
      'return_date', v_return_date,
      'formal_return_document_registered', false
    ),
    jsonb_build_object('vehicle_returned', v_contract.vehicle_returned, 'contract_vehicle_status', v_contract.vehicle_status, 'vehicle_status', v_vehicle.status),
    jsonb_build_object('vehicle_returned', true, 'contract_vehicle_status', 'reserved_employee', 'vehicle_status', 'reserved_employee'),
    'تم استرداد المركبة من العميل وإبقاؤها في حيازة الموظف طارق تطواني؛ الملف القانوني مستمر لتحصيل الدين ويلزم استكمال محضر الاسترداد والفحص.',
    v_actor_user_id
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.contracts AS contract
    WHERE contract.id = v_contract_id
      AND contract.status::text = 'under_legal_procedure'
      AND contract.legal_status = 'under_legal_action'
      AND contract.vehicle_returned = true
      AND contract.vehicle_status = 'reserved_employee'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: contract return state';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles AS vehicle
    WHERE vehicle.id = v_vehicle_id
      AND vehicle.status::text = 'reserved_employee'
      AND vehicle.is_active = true
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: vehicle availability';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.legal_case_litigation_profile AS profile
    WHERE profile.id = v_profile_id
      AND profile.vehicle_custody = 'unknown'
      AND profile.vehicle_returned_at = v_return_date
      AND profile.vehicle_return_document_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: litigation return profile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tasks AS task
    WHERE task.id = v_followup_task_id
      AND task.status = 'pending'
      AND task.metadata ->> 'court_filing_authorized' = 'false'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: return evidence task';
  END IF;

  IF v_case.filing_date IS NOT NULL THEN
    RAISE EXCEPTION 'Postcondition failed: no court filing must be inferred';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    BEGIN
      ALTER TABLE public.contracts ENABLE TRIGGER USER;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RAISE;
END;
$migration$;
