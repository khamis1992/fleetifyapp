BEGIN;
CREATE OR REPLACE FUNCTION public.cancel_taqadi_filing_job_v1(p_company_id uuid,p_job_id uuid,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE v_job public.taqadi_filing_jobs%ROWTYPE; v_immediate boolean;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_job FROM public.taqadi_filing_jobs
  WHERE id=p_job_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Filing job was not found'; END IF;
  IF v_job.status='cancelled' OR v_job.error_code IN ('MANUAL_STOP_REQUESTED','MANUALLY_STOPPED') THEN RETURN to_jsonb(v_job); END IF;
  IF v_job.status='filed' OR v_job.current_step='receipt_sync_pending'
     OR v_job.error_code LIKE 'SUBMISSION_UNCERTAIN%' OR v_job.result IS NOT NULL THEN
    RAISE EXCEPTION 'يوجد إيصال أو اعتماد يحتاج تحققًا؛ لا يمكن إلغاء الإيداع أو إعادة إرساله من هذا الزر';
  END IF;
  v_immediate := v_job.status IN ('queued','needs_human','failed');
  UPDATE public.taqadi_filing_jobs SET
    status=CASE WHEN v_immediate THEN 'cancelled' ELSE status END,
    current_step=CASE WHEN v_immediate THEN 'cancelled' ELSE current_step END,
    error_code=CASE WHEN v_immediate THEN error_code ELSE 'MANUAL_STOP_REQUESTED' END,
    error_message=COALESCE(NULLIF(BTRIM(p_reason),''),'طلب المستخدم إيقاف الوكيل'),
    completed_at=CASE WHEN v_immediate THEN now() ELSE completed_at END, updated_at=now()
  WHERE id=v_job.id RETURNING * INTO v_job;
  INSERT INTO public.taqadi_filing_job_events(company_id,job_id,event_type,step,status,message)
  VALUES (p_company_id,p_job_id,CASE WHEN v_immediate THEN 'cancelled' ELSE 'stop_requested' END,
    v_job.current_step,v_job.status,CASE WHEN v_immediate THEN 'تم إيقاف العملية' ELSE 'طُلب إيقاف الوكيل؛ بانتظار تأكيد توقفه عند نقطة آمنة' END);
  RETURN to_jsonb(v_job);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_taqadi_filing_control_v1(p_job_id uuid,p_worker_id text,p_acknowledge boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE v_job public.taqadi_filing_jobs%ROWTYPE; v_submitting boolean;
BEGIN
  IF COALESCE(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Only a trusted worker may acknowledge stopping' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_job FROM public.taqadi_filing_jobs WHERE id=p_job_id AND locked_by=BTRIM(p_worker_id) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Filing job lock was lost'; END IF;
  IF v_job.error_code IS DISTINCT FROM 'MANUAL_STOP_REQUESTED' THEN
    RETURN jsonb_build_object('stopRequested',false,'status',v_job.status);
  END IF;
  IF p_acknowledge THEN
    v_submitting := v_job.status='submitting';
    UPDATE public.taqadi_filing_jobs SET status='needs_human',current_step='manual_stop',
      error_code=CASE WHEN v_submitting THEN 'SUBMISSION_UNCERTAIN' ELSE 'MANUALLY_STOPPED' END,
      error_message=CASE WHEN v_submitting THEN 'توقف الوكيل أثناء الاعتماد. تحقق من الطلب الموجود في تقاضي قبل أي متابعة؛ لم تتم إعادة الإرسال.'
        ELSE 'توقف الوكيل بناءً على طلبك. يمكنك متابعة المسودة الموجودة في تقاضي.' END,
      completed_at=now(),updated_at=now()
    WHERE id=v_job.id RETURNING * INTO v_job;
    INSERT INTO public.taqadi_filing_job_events(company_id,job_id,event_type,step,status,message)
    VALUES(v_job.company_id,v_job.id,'stopped','manual_stop',v_job.status,v_job.error_message);
  END IF;
  RETURN jsonb_build_object('stopRequested',true,'acknowledged',p_acknowledge,'status',v_job.status);
END;
$function$;
REVOKE ALL ON FUNCTION public.check_taqadi_filing_control_v1(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.check_taqadi_filing_control_v1(uuid,text,boolean) TO service_role;

DO $patch$
DECLARE original text; anchor text; target regprocedure;
BEGIN
  original := pg_get_functiondef('public.update_taqadi_filing_job_v1(uuid,text,text,text,integer,text,jsonb,text,text)'::regprocedure);
  anchor := 'AND job.status NOT IN (''filed'', ''cancelled'')';
  IF position(anchor IN original)=0 THEN RAISE EXCEPTION 'Worker progress function changed'; END IF;
  EXECUTE replace(original,anchor,anchor || E'\n    AND job.error_code IS DISTINCT FROM ''MANUAL_STOP_REQUESTED''');
  FOR target IN SELECT p.oid::regprocedure FROM pg_proc p
    WHERE p.pronamespace='public'::regnamespace AND p.proname IN
      ('resume_taqadi_filing_job_v1','retry_taqadi_filing_job_v1','refresh_taqadi_filing_job_payload_v1')
  LOOP
    original := pg_get_functiondef(target);
    EXECUTE replace(original,'v_job.error_code = ''SUBMISSION_UNCERTAIN''',
      'v_job.error_code LIKE ''SUBMISSION_UNCERTAIN%''');
  END LOOP;
END;
$patch$;
COMMIT;
