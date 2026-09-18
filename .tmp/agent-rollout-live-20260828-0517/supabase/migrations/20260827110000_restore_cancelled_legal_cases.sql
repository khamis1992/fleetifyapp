ALTER TABLE public.legal_cases DISABLE TRIGGER trg_guard_legal_case_filing_readiness;
DO $restore$
DECLARE
  v_company constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_user constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_count integer;
  v_row record;
  v_old_suspension_reason text;
  v_vehicle_status text;
BEGIN
  SELECT count(*) INTO v_count FROM (
    SELECT DISTINCT ON (a.case_id) a.case_id
    FROM public.legal_case_activities a
    WHERE a.company_id=v_company AND a.activity_type='case_cancelled'
      AND a.created_by=v_user
      AND a.activity_description='سبب الإلغاء: Cancelled from legal case tracking'
      AND a.created_at >= '2026-08-26 20:00:00+00'::timestamptz
    ORDER BY a.case_id,a.created_at DESC
  ) target;
  IF v_count <> 27 THEN
    RAISE EXCEPTION 'Safety check failed: expected 27 cases, found %',v_count;
  END IF;

  IF EXISTS (
    WITH target AS (
      SELECT DISTINCT ON (a.case_id) a.case_id
      FROM public.legal_case_activities a
      WHERE a.company_id=v_company AND a.activity_type='case_cancelled'
        AND a.created_by=v_user
        AND a.activity_description='سبب الإلغاء: Cancelled from legal case tracking'
        AND a.created_at >= '2026-08-26 20:00:00+00'::timestamptz
      ORDER BY a.case_id,a.created_at DESC
    )
    SELECT 1 FROM target JOIN public.legal_cases lc ON lc.id=target.case_id
    WHERE lc.company_id IS DISTINCT FROM v_company
       OR lower(coalesce(lc.case_status,'')) NOT IN ('cancelled','canceled')
       OR lower(coalesce(lc.workflow_stage,'')) <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Safety check failed: target state changed';
  END IF;

  FOR v_row IN
    WITH target AS (
      SELECT DISTINCT ON (a.case_id) a.case_id,a.created_at cancelled_at
      FROM public.legal_case_activities a
      WHERE a.company_id=v_company AND a.activity_type='case_cancelled'
        AND a.created_by=v_user
        AND a.activity_description='سبب الإلغاء: Cancelled from legal case tracking'
        AND a.created_at >= '2026-08-26 20:00:00+00'::timestamptz
      ORDER BY a.case_id,a.created_at DESC
    )
    SELECT lc.id case_id,lc.case_number,lc.contract_id,target.cancelled_at,
      COALESCE(
        (SELECT a2.new_values->>'workflow_stage'
         FROM public.legal_case_activities a2
         WHERE a2.case_id=lc.id AND a2.created_at<target.cancelled_at
           AND a2.new_values->>'workflow_stage' IN
             ('preparation','filed','hearings','judgment_issued','appeal','enforcement','collection')
         ORDER BY a2.created_at DESC LIMIT 1),
        CASE WHEN EXISTS(SELECT 1 FROM public.legal_case_activities a3
          WHERE a3.case_id=lc.id AND a3.created_at<target.cancelled_at
            AND a3.activity_type='judgment_recorded') THEN 'judgment_issued' END,
        'preparation'
      ) target_stage
    FROM target JOIN public.legal_cases lc ON lc.id=target.case_id
    ORDER BY lc.case_number
  LOOP
    PERFORM public.reopen_legal_case_v1(
      v_company,v_row.case_id,v_row.target_stage,
      'استعادة القضية بعد عكس عملية الإلغاء التي نُفذت من شاشة متابعة القضايا',v_user
    );

    UPDATE public.legal_cases SET
      outcome_type=CASE WHEN outcome_type='withdrawn' AND outcome_date=v_row.cancelled_at::date THEN NULL ELSE outcome_type END,
      outcome_date=CASE WHEN outcome_type='withdrawn' AND outcome_date=v_row.cancelled_at::date THEN NULL ELSE outcome_date END,
      outcome_notes=NULLIF(BTRIM(regexp_replace(COALESCE(outcome_notes,''),
        E'(\\r?\\n)?Cancelled from legal case tracking\\s*$','')),''),updated_at=now()
    WHERE id=v_row.case_id AND company_id=v_company;

    INSERT INTO public.legal_case_activities(
      case_id,company_id,activity_type,activity_title,activity_description,new_values,created_by
    ) VALUES (
      v_row.case_id,v_company,'cancellation_reversed','عكس إلغاء القضية',
      'تم حذف آثار عملية الإلغاء الأخيرة مع الحفاظ على البيانات السابقة',
      jsonb_build_object('workflow_stage',v_row.target_stage,
        'case_status',CASE WHEN v_row.target_stage='preparation' THEN 'pending' ELSE 'active' END,
        'source','restore_cancelled_legal_cases_20260827'),
      '320f8030-ee98-4f9f-bab8-7341e80cd588'::uuid
    );

    IF v_row.contract_id IS NOT NULL THEN
      SELECT l.old_values->>'suspension_reason' INTO v_old_suspension_reason
      FROM public.contract_operations_log l
      WHERE l.contract_id=v_row.contract_id AND l.company_id=v_company
        AND l.performed_at BETWEEN v_row.cancelled_at-interval '1 second'
                               AND v_row.cancelled_at+interval '1 second'
        AND l.old_values->>'status'='under_legal_procedure'
        AND l.new_values->>'status'='active'
      ORDER BY l.performed_at DESC LIMIT 1;

      IF FOUND AND EXISTS(SELECT 1 FROM public.contracts c
        WHERE c.id=v_row.contract_id AND c.company_id=v_company AND c.status::text='active') THEN
        UPDATE public.contracts SET status='under_legal_procedure',
          suspension_reason=v_old_suspension_reason,updated_at=now()
        WHERE id=v_row.contract_id AND company_id=v_company AND status::text='active';

        INSERT INTO public.contract_operations_log(
          contract_id,company_id,operation_type,operation_details,performed_by,performed_at,
          old_values,new_values,notes
        ) VALUES (
          v_row.contract_id,v_company,'restore_legal_cancellation',
          jsonb_build_object('legal_case_id',v_row.case_id,'legal_case_number',v_row.case_number,
            'source','restore_cancelled_legal_cases_20260827'),v_user,now(),
          jsonb_build_object('status','active','suspension_reason',NULL),
          jsonb_build_object('status','under_legal_procedure',
            'suspension_reason',v_old_suspension_reason),
          'استعادة حالة العقد القانونية بعد عكس إلغاء القضية'
        );

        SELECT l.new_values->>'vehicle_status' INTO v_vehicle_status
        FROM public.contract_operations_log l
        WHERE l.contract_id=v_row.contract_id AND l.company_id=v_company
          AND l.operation_type='convert_to_legal'
          AND l.operation_details->>'legal_case_id'=v_row.case_id::text
        ORDER BY l.performed_at DESC LIMIT 1;
        IF v_vehicle_status IS NOT NULL AND EXISTS(
          SELECT 1 FROM unnest(enum_range(NULL::public.vehicle_status)) allowed(status)
          WHERE allowed.status::text=v_vehicle_status
        ) THEN
          UPDATE public.vehicles v SET status=v_vehicle_status::public.vehicle_status,updated_at=now()
          FROM public.contracts c WHERE c.id=v_row.contract_id AND c.company_id=v_company
            AND c.vehicle_id=v.id AND v.company_id=v_company;
        END IF;
      END IF;
    END IF;
  END LOOP;
END
$restore$;
ALTER TABLE public.legal_cases ENABLE TRIGGER trg_guard_legal_case_filing_readiness;
