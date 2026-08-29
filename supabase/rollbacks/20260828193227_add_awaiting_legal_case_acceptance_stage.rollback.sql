-- Roll back the court-acceptance stage without leaving rows outside the old
-- workflow constraint. Cases waiting for acceptance return to the filed stage.

UPDATE public.legal_cases
SET
  workflow_stage = 'filed',
  case_status = 'active',
  stage_updated_at = now(),
  updated_at = now()
WHERE workflow_stage = 'awaiting_acceptance';

ALTER TABLE public.legal_cases
  DROP CONSTRAINT IF EXISTS legal_cases_workflow_stage_check;

ALTER TABLE public.legal_cases
  ADD CONSTRAINT legal_cases_workflow_stage_check CHECK (
    workflow_stage IN (
      'preparation',
      'filed',
      'hearings',
      'reserved_for_judgment',
      'judgment_issued',
      'appeal',
      'enforcement',
      'collection',
      'closed',
      'cancelled'
    )
  );

CREATE OR REPLACE FUNCTION public.legal_workflow_sync_contract_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_stage text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_contract_id IS NULL THEN RETURN; END IF;
  UPDATE public.contracts SET
    legal_status = CASE p_stage
      WHEN 'preparation' THEN 'under_legal_action'
      WHEN 'filed' THEN 'legal_case_filed'
      WHEN 'hearings' THEN 'in_court'
      WHEN 'reserved_for_judgment' THEN 'in_court'
      WHEN 'judgment_issued' THEN 'judgment_issued'
      WHEN 'appeal' THEN 'in_court'
      WHEN 'enforcement' THEN 'execution_phase'
      WHEN 'collection' THEN 'execution_phase'
      WHEN 'closed' THEN 'closed'
      WHEN 'cancelled' THEN 'closed'
      ELSE legal_status
    END,
    updated_at = now()
  WHERE id = p_contract_id AND company_id = p_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_legal_case_workflow_v1(
  p_company_id uuid,
  p_case_id uuid,
  p_target_stage text,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.legal_cases%ROWTYPE;
  v_actor uuid;
  v_allowed boolean := false;
  v_legacy text;
  v_old_stage text;
BEGIN
  v_actor := public.legal_workflow_actor_profile_v1(p_company_id, p_actor_id);
  SELECT * INTO v_case FROM public.legal_cases WHERE id = p_case_id AND company_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legal case was not found' USING ERRCODE = 'P0001'; END IF;
  IF v_case.workflow_stage = p_target_stage THEN RETURN v_case; END IF;
  v_old_stage := v_case.workflow_stage;
  v_allowed := CASE v_case.workflow_stage
    WHEN 'preparation' THEN p_target_stage IN ('filed', 'cancelled')
    WHEN 'filed' THEN p_target_stage IN ('hearings', 'reserved_for_judgment', 'cancelled')
    WHEN 'hearings' THEN p_target_stage IN ('reserved_for_judgment', 'cancelled')
    WHEN 'reserved_for_judgment' THEN p_target_stage IN ('hearings', 'judgment_issued')
    WHEN 'judgment_issued' THEN p_target_stage IN ('appeal', 'enforcement', 'collection', 'closed')
    WHEN 'appeal' THEN p_target_stage IN ('judgment_issued', 'enforcement', 'collection', 'closed')
    WHEN 'enforcement' THEN p_target_stage IN ('collection', 'closed')
    WHEN 'collection' THEN p_target_stage = 'closed'
    ELSE false
  END;
  IF NOT v_allowed THEN RAISE EXCEPTION 'Invalid legal workflow transition from % to %', v_case.workflow_stage, p_target_stage USING ERRCODE = 'P0001'; END IF;
  IF p_target_stage IN ('cancelled', 'closed') AND NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL THEN RAISE EXCEPTION 'A reason is required for terminal transitions' USING ERRCODE = 'P0001'; END IF;
  v_legacy := CASE WHEN p_target_stage = 'preparation' THEN 'pending' WHEN p_target_stage IN ('closed', 'cancelled') THEN p_target_stage ELSE 'active' END;
  UPDATE public.legal_cases SET
    workflow_stage = p_target_stage,
    stage_updated_at = now(),
    case_status = v_legacy,
    filing_date = CASE WHEN p_target_stage = 'filed' THEN COALESCE(filing_date, CURRENT_DATE) ELSE filing_date END,
    closed_at = CASE WHEN p_target_stage = 'closed' THEN now() ELSE NULL END,
    closure_reason = CASE WHEN p_target_stage IN ('closed', 'cancelled') THEN BTRIM(p_reason) ELSE closure_reason END,
    updated_at = now()
  WHERE id = p_case_id RETURNING * INTO v_case;
  INSERT INTO public.legal_case_activities(case_id, company_id, activity_type, activity_title, activity_description, old_values, new_values, created_by)
  VALUES (p_case_id, p_company_id, 'workflow_transition', 'تغيير مرحلة القضية', COALESCE(NULLIF(BTRIM(p_reason), ''), 'انتقال معتمد ضمن سير العمل'), jsonb_build_object('workflow_stage', v_old_stage), jsonb_build_object('workflow_stage', p_target_stage), v_actor);
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id, v_case.contract_id, p_target_stage);
  RETURN v_case;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_legal_case_hearing_v1(
  p_company_id uuid,
  p_case_id uuid,
  p_hearing_date timestamptz,
  p_status text DEFAULT 'scheduled',
  p_decision text DEFAULT NULL,
  p_next_hearing_date timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_case_hearings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_case public.legal_cases%ROWTYPE;
  v_hearing public.legal_case_hearings%ROWTYPE;
BEGIN
  v_actor := public.legal_workflow_actor_profile_v1(p_company_id, p_actor_id);
  IF p_hearing_date IS NULL OR p_status NOT IN ('scheduled', 'completed', 'adjourned', 'cancelled') THEN RAISE EXCEPTION 'Valid hearing date and status are required'; END IF;
  SELECT * INTO v_case FROM public.legal_cases WHERE id = p_case_id AND company_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legal case was not found'; END IF;
  INSERT INTO public.legal_case_hearings(company_id, case_id, hearing_date, status, decision, next_hearing_date, notes, created_by)
  VALUES (p_company_id, p_case_id, p_hearing_date, p_status, NULLIF(BTRIM(COALESCE(p_decision, '')), ''), p_next_hearing_date, NULLIF(BTRIM(COALESCE(p_notes, '')), ''), v_actor) RETURNING * INTO v_hearing;
  UPDATE public.legal_cases SET workflow_stage = 'hearings', case_status = 'active', hearing_date = COALESCE(p_next_hearing_date, p_hearing_date), stage_updated_at = now(), updated_at = now() WHERE id = p_case_id;
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id, v_case.contract_id, 'hearings');
  IF COALESCE(p_next_hearing_date, CASE WHEN p_status = 'scheduled' THEN p_hearing_date END) IS NOT NULL THEN
    PERFORM public.legal_workflow_create_task_v1(p_company_id, p_case_id, 'hearing:' || v_hearing.id::text, 'متابعة جلسة ' || v_case.case_number, 'موعد جلسة القضية ومراجعة متطلباتها.', COALESCE(p_next_hearing_date, p_hearing_date) - interval '1 day', 'urgent', v_actor);
  END IF;
  INSERT INTO public.legal_case_activities(case_id, company_id, activity_type, activity_title, activity_description, new_values, created_by)
  VALUES (p_case_id, p_company_id, 'hearing_recorded', 'تسجيل جلسة', COALESCE(p_decision, 'تم تسجيل موعد الجلسة'), to_jsonb(v_hearing), v_actor);
  RETURN v_hearing;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_legal_case_v1(
  p_company_id uuid,
  p_case_id uuid,
  p_target_stage text,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_case public.legal_cases%ROWTYPE;
BEGIN
  v_actor := public.legal_workflow_actor_profile_v1(p_company_id, p_actor_id);
  IF auth.uid() IS NOT NULL AND NOT (public.is_company_admin(p_company_id) OR public.is_company_manager(p_company_id)) THEN RAISE EXCEPTION 'Manager permission is required to reopen a case' USING ERRCODE = '42501'; END IF;
  IF p_target_stage NOT IN ('preparation', 'filed', 'hearings', 'judgment_issued', 'appeal', 'enforcement', 'collection') OR length(BTRIM(COALESCE(p_reason, ''))) < 10 THEN RAISE EXCEPTION 'A valid target stage and detailed reason are required'; END IF;
  SELECT * INTO v_case FROM public.legal_cases WHERE id = p_case_id AND company_id = p_company_id FOR UPDATE;
  IF NOT FOUND OR v_case.workflow_stage NOT IN ('closed', 'cancelled') THEN RAISE EXCEPTION 'Only closed or cancelled cases can be reopened'; END IF;
  PERFORM set_config('app.legal_workflow_reopen', 'allowed', true);
  UPDATE public.legal_cases SET workflow_stage = p_target_stage, case_status = CASE WHEN p_target_stage = 'preparation' THEN 'pending' ELSE 'active' END, stage_updated_at = now(), closed_at = NULL, closure_reason = NULL, reopened_at = now(), reopened_by = v_actor, reopen_reason = BTRIM(p_reason), updated_at = now() WHERE id = p_case_id RETURNING * INTO v_case;
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id, v_case.contract_id, p_target_stage);
  INSERT INTO public.legal_case_activities(case_id, company_id, activity_type, activity_title, activity_description, new_values, created_by)
  VALUES (p_case_id, p_company_id, 'case_reopened', 'إعادة فتح القضية', BTRIM(p_reason), jsonb_build_object('workflow_stage', p_target_stage), v_actor);
  RETURN v_case;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_legal_workflow_daily_guard_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case record;
  v_actor uuid;
  v_checked integer := 0;
  v_id uuid;
BEGIN
  FOR v_case IN SELECT * FROM public.legal_cases WHERE workflow_stage NOT IN ('closed', 'cancelled') LOOP
    SELECT id INTO v_actor
    FROM public.profiles
    WHERE company_id = v_case.company_id
      AND (id = v_case.created_by OR user_id = v_case.created_by)
    ORDER BY CASE WHEN id = v_case.created_by THEN 0 ELSE 1 END
    LIMIT 1;
    v_actor := COALESCE(v_actor, (SELECT id FROM public.profiles WHERE company_id = v_case.company_id ORDER BY created_at LIMIT 1));

    IF v_case.workflow_stage = 'preparation' AND v_case.stage_updated_at < now() - interval '3 days' THEN
      v_id := public.legal_workflow_create_task_v1(v_case.company_id, v_case.id, 'prepare:' || v_case.id::text, 'استكمال تجهيز ' || v_case.case_number, 'ملف القضية لم ينتقل إلى الرفع خلال ثلاثة أيام.', now() + interval '1 day', 'high', v_actor);
      IF v_id IS NOT NULL THEN v_checked := v_checked + 1; END IF;
    END IF;
    IF v_case.workflow_stage = 'filed'
       AND NOT EXISTS (SELECT 1 FROM public.legal_case_hearings h WHERE h.case_id = v_case.id AND h.status = 'scheduled') THEN
      v_id := public.legal_workflow_create_task_v1(v_case.company_id, v_case.id, 'schedule-hearing:' || v_case.id::text, 'تحديد جلسة ' || v_case.case_number, 'تم رفع الدعوى ولم يسجل موعد جلسة.', now() + interval '1 day', 'urgent', v_actor);
      IF v_id IS NOT NULL THEN v_checked := v_checked + 1; END IF;
    END IF;
    IF v_case.workflow_stage = 'hearings'
       AND NOT EXISTS (SELECT 1 FROM public.legal_case_hearings h WHERE h.case_id = v_case.id AND h.status = 'scheduled' AND h.hearing_date >= now()) THEN
      v_id := public.legal_workflow_create_task_v1(v_case.company_id, v_case.id, 'hearing-result:' || v_case.id::text, 'تحديث نتيجة جلسات ' || v_case.case_number, 'لا توجد جلسة قادمة؛ سجل النتيجة أو المرحلة التالية.', now() + interval '1 day', 'high', v_actor);
      IF v_id IS NOT NULL THEN v_checked := v_checked + 1; END IF;
    END IF;
    IF v_case.hearing_date IS NOT NULL AND v_case.hearing_date <= now() + interval '3 days' THEN
      v_id := public.legal_workflow_create_task_v1(v_case.company_id, v_case.id, 'daily-hearing:' || v_case.id::text || ':' || v_case.hearing_date::date::text, 'جلسة قريبة: ' || v_case.case_number, 'مراجعة ملف الجلسة والطلبات قبل الموعد.', v_case.hearing_date - interval '1 day', 'urgent', v_actor);
      IF v_id IS NOT NULL THEN v_checked := v_checked + 1; END IF;
    END IF;
    IF v_case.workflow_stage = 'reserved_for_judgment' AND v_case.stage_updated_at < now() - interval '7 days' THEN
      v_id := public.legal_workflow_create_task_v1(v_case.company_id, v_case.id, 'judgment-followup:' || v_case.id::text, 'متابعة حكم ' || v_case.case_number, 'القضية محجوزة للحكم ولم تسجل النتيجة.', now() + interval '1 day', 'urgent', v_actor);
      IF v_id IS NOT NULL THEN v_checked := v_checked + 1; END IF;
    END IF;
    IF v_case.appeal_deadline IS NOT NULL AND v_case.appeal_deadline <= CURRENT_DATE + 7 AND v_case.workflow_stage = 'judgment_issued' THEN
      v_id := public.legal_workflow_create_task_v1(v_case.company_id, v_case.id, 'daily-appeal:' || v_case.id::text || ':' || v_case.appeal_deadline::text, 'مهلة استئناف: ' || v_case.case_number, 'يجب تسجيل قرار الاستئناف قبل انتهاء المهلة.', v_case.appeal_deadline::timestamptz - interval '2 days', 'urgent', v_actor);
      IF v_id IS NOT NULL THEN v_checked := v_checked + 1; END IF;
    END IF;
    IF v_case.workflow_stage = 'judgment_issued' AND v_case.appeal_deadline IS NULL THEN
      v_id := public.legal_workflow_create_task_v1(v_case.company_id, v_case.id, 'post-judgment:' || v_case.id::text, 'تحديد إجراء ما بعد الحكم ' || v_case.case_number, 'حدد الاستئناف أو التنفيذ أو التحصيل أو الإغلاق النهائي.', now() + interval '1 day', 'urgent', v_actor);
      IF v_id IS NOT NULL THEN v_checked := v_checked + 1; END IF;
    END IF;
    IF v_case.workflow_stage = 'enforcement' THEN
      v_id := public.legal_workflow_create_task_v1(v_case.company_id, v_case.id, 'daily-enforcement:' || v_case.id::text, 'متابعة التنفيذ: ' || v_case.case_number, 'راجع آخر إجراء في ملف التنفيذ وحدد الإجراء القادم.', now() + interval '2 days', 'high', v_actor);
      IF v_id IS NOT NULL THEN v_checked := v_checked + 1; END IF;
    END IF;
    IF v_case.workflow_stage IN ('judgment_issued', 'enforcement', 'collection')
       AND COALESCE(v_case.outcome_amount, 0) > 0
       AND COALESCE(v_case.outcome_payment_status, 'pending') NOT IN ('paid', 'received') THEN
      v_id := public.legal_workflow_create_task_v1(v_case.company_id, v_case.id, 'daily-collection:' || v_case.id::text, 'متابعة تحصيل الحكم: ' || v_case.case_number, 'الحكم المالي لم تتم تسويته بالكامل.', now() + interval '1 day', 'high', v_actor);
      IF v_id IS NOT NULL THEN v_checked := v_checked + 1; END IF;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('followups_checked', v_checked, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.legal_workflow_sync_contract_v1(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_legal_workflow_daily_guard_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_legal_case_workflow_v1(uuid, uuid, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_legal_case_hearing_v1(uuid, uuid, timestamptz, text, text, timestamptz, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reopen_legal_case_v1(uuid, uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_legal_case_workflow_v1(uuid, uuid, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_legal_case_hearing_v1(uuid, uuid, timestamptz, text, text, timestamptz, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reopen_legal_case_v1(uuid, uuid, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.run_legal_workflow_daily_guard_v1() TO service_role;
