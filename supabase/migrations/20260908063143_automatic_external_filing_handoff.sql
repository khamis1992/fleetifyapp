BEGIN;

-- One user attestation coordinates stopping and recording. Active browser work
-- must acknowledge its cooperative stop in a separate transaction first.
CREATE FUNCTION taqadi_private.record_external_legal_filing_v2(
  p_company_id uuid, p_case_id uuid, p_reference text, p_filing_date date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_case public.legal_cases; v_job public.taqadi_filing_jobs;
  v_ref text := btrim(p_reference); v_receipt text; v_waiting boolean := false;
  v_receipt_pending boolean := false;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'غير مصرح بتسجيل الإيداع' USING ERRCODE='42501';
  END IF;
  IF public.legal_workflow_actor_profile_v1(p_company_id,NULL) IS NULL THEN
    RAISE EXCEPTION 'تعذر تحديد الموظف المسؤول';
  END IF;
  IF v_ref IS NULL OR length(v_ref) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'أدخل رقم طلب الإيداع الصحيح'; END IF;
  IF p_filing_date IS NULL OR p_filing_date > (now() AT TIME ZONE 'Asia/Qatar')::date THEN
    RAISE EXCEPTION 'أدخل تاريخ الإيداع الفعلي دون تاريخ مستقبلي';
  END IF;
  SELECT * INTO v_case FROM public.legal_cases
  WHERE company_id=p_company_id AND id=p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'القضية غير موجودة'; END IF;
  IF v_case.workflow_stage='awaiting_acceptance' AND v_case.case_reference=v_ref AND v_case.filing_date=p_filing_date THEN
    RETURN jsonb_build_object('state','recorded','legalCase',to_jsonb(v_case));
  END IF;
  IF v_case.workflow_stage NOT IN ('preparation','filed') THEN RAISE EXCEPTION 'لا يمكن تسجيل الإيداع في المرحلة الحالية'; END IF;
  IF nullif(btrim(v_case.case_reference),'') IS NOT NULL AND v_case.case_reference<>v_ref THEN
    RAISE EXCEPTION 'يوجد مرجع إيداع مختلف مسجل؛ راجع بيانات القضية';
  END IF;

  PERFORM id FROM public.taqadi_filing_jobs
  WHERE company_id=p_company_id AND legal_case_id=p_case_id ORDER BY id FOR UPDATE;
  -- Validate all receipt evidence before changing any task. A real receipt is
  -- never replaced by an attestation, even on an old failed/cancelled job.
  FOR v_job IN SELECT * FROM public.taqadi_filing_jobs
    WHERE company_id=p_company_id AND legal_case_id=p_case_id ORDER BY id
  LOOP
    IF v_job.result IS NOT NULL THEN
      v_receipt := COALESCE(NULLIF(btrim(v_job.result->>'referenceNumber'),''),NULLIF(btrim(v_job.result->>'caseNumber'),''));
      IF v_receipt IS NULL OR v_receipt<>v_ref THEN
        RAISE EXCEPTION 'يوجد إيصال محفوظ لا يطابق رقم الطلب المدخل؛ راجع الإيصال قبل التسجيل';
      END IF;
      IF v_job.status NOT IN ('filed','cancelled','failed') THEN v_receipt_pending := true; END IF;
    END IF;
    IF v_job.current_step='receipt_sync_pending' AND v_job.status<>'filed' THEN v_receipt_pending := true; END IF;
  END LOOP;
  IF v_receipt_pending THEN RETURN jsonb_build_object('state','waiting_for_receipt'); END IF;

  FOR v_job IN SELECT * FROM public.taqadi_filing_jobs
    WHERE company_id=p_company_id AND legal_case_id=p_case_id
      AND status NOT IN ('queued','needs_human','failed','cancelled','filed') ORDER BY id
  LOOP
    v_waiting := true;
    IF v_job.error_code IS DISTINCT FROM 'MANUAL_STOP_REQUESTED' THEN
      UPDATE public.taqadi_filing_jobs SET error_code='MANUAL_STOP_REQUESTED',
        error_message='طلب الموظف إيقاف الوكيل تلقائيًا لتوثيق الإيداع الموجود في تقاضي',updated_at=now()
      WHERE company_id=p_company_id AND id=v_job.id;
      INSERT INTO public.taqadi_filing_job_events(company_id,job_id,event_type,step,status,message,details)
      VALUES(p_company_id,v_job.id,'stop_requested',v_job.current_step,v_job.status,
        'طُلب إيقاف الوكيل تلقائيًا قبل توثيق الإيداع؛ بانتظار تأكيد العامل',
        jsonb_build_object('source','external_filing_handoff','reference',v_ref,'filingDate',p_filing_date,
          'actorUserId',auth.uid(),'previousErrorCode',v_job.error_code));
    END IF;
  END LOOP;
  -- Return normally to commit stop requests. No database sleep or held lock
  -- while the browser worker finishes its current action.
  IF v_waiting THEN RETURN jsonb_build_object('state','waiting_for_stop'); END IF;

  FOR v_job IN SELECT * FROM public.taqadi_filing_jobs
    WHERE company_id=p_company_id AND legal_case_id=p_case_id
      AND status IN ('queued','needs_human','failed') AND result IS NULL ORDER BY id
  LOOP
    -- needs_human (including SUBMISSION_UNCERTAIN) is already a worker pause.
    -- Resolve it with the explicit historical filing attestation, not a fake
    -- worker acknowledgement or an instruction to submit again.
    UPDATE public.taqadi_filing_jobs SET status='cancelled',current_step='external_filing_recorded',
      error_code='EXTERNAL_FILING_RECORDED',error_message='أُقفلت مهمة الوكيل بعد توثيق الموظف الإيداع الموجود في تقاضي',
      locked_by=NULL,locked_at=NULL,heartbeat_at=NULL,completed_at=now(),updated_at=now()
    WHERE company_id=p_company_id AND id=v_job.id;
    INSERT INTO public.taqadi_filing_job_events(company_id,job_id,event_type,step,status,message,details)
    VALUES(p_company_id,v_job.id,'external_filing_handoff','external_filing_recorded','cancelled',
      'تم إنهاء مهمة الوكيل وتوثيق الإيداع القائم دون إعادة إرساله',
      jsonb_build_object('source','external_filing_attestation','reference',v_ref,'filingDate',p_filing_date,
        'actorUserId',auth.uid(),'previousStatus',v_job.status,'previousStep',v_job.current_step,
        'previousErrorCode',v_job.error_code,'previousErrorMessage',v_job.error_message,'previousWorker',v_job.locked_by));
  END LOOP;
  -- Reuse the audited case, preparation and contract transaction. Any failure
  -- rolls back task retirement as well. Its original active-task guard remains.
  v_case := public.record_external_legal_filing_v1(p_company_id,p_case_id,v_ref,p_filing_date);
  RETURN jsonb_build_object('state','recorded','legalCase',to_jsonb(v_case));
END;
$function$;
REVOKE ALL ON FUNCTION taqadi_private.record_external_legal_filing_v2(uuid,uuid,text,date) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION taqadi_private.record_external_legal_filing_v2(uuid,uuid,text,date) TO authenticated;

CREATE FUNCTION public.record_external_legal_filing_v2(p_company_id uuid,p_case_id uuid,p_reference text,p_filing_date date)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$
  SELECT taqadi_private.record_external_legal_filing_v2(p_company_id,p_case_id,p_reference,p_filing_date);
$function$;
REVOKE ALL ON FUNCTION public.record_external_legal_filing_v2(uuid,uuid,text,date) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.record_external_legal_filing_v2(uuid,uuid,text,date) TO authenticated;
COMMIT;
