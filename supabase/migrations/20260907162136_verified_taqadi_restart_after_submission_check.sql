-- A human-verified restart is distinct from an automatic retry: retain evidence,
-- require a fresh job version, and perform validation and requeue atomically.
BEGIN;
CREATE OR REPLACE FUNCTION public.restart_verified_unsubmitted_taqadi_job_v1(
  p_company_id uuid,
  p_job_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz,
  p_confirmed_not_submitted boolean,
  p_verification_note text,
  p_request_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_job public.taqadi_filing_jobs%ROWTYPE;
  v_case public.legal_cases%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_actor IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'لا تملك صلاحية الوصول إلى شركة هذه العملية' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_job FROM public.taqadi_filing_jobs
  WHERE id = p_job_id AND company_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'لم يتم العثور على عملية الرفع'; END IF;
  IF NOT COALESCE(public.can_prepare_contract_for_legal_v1(p_company_id, v_job.contract_id), false) THEN
    RAISE EXCEPTION 'لا تملك صلاحية تجهيز هذه الدعوى' USING ERRCODE = '42501';
  END IF;
  IF p_confirmed_not_submitted IS DISTINCT FROM true
    OR p_request_id IS NULL
    OR length(btrim(coalesce(p_verification_note, ''))) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'أكد مراجعة تقاضي وعدم إيداع الطلب، وسجل نتيجة التحقق في 10 أحرف على الأقل';
  END IF;

  -- Repeating an acknowledged command must not enqueue a second attempt, even
  -- when the response was lost or the worker has already claimed the first one.
  IF EXISTS (
    SELECT 1 FROM public.taqadi_filing_job_events
    WHERE company_id = p_company_id AND job_id = p_job_id
      AND event_type = 'submission_verified_unsubmitted'
      AND details ->> 'requestId' = p_request_id::text
  ) THEN RETURN to_jsonb(v_job); END IF;
  IF p_expected_updated_at IS NULL OR v_job.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'تغيرت حالة العملية منذ فتح نافذة الإعادة؛ حدّث الحالة وراجعها مجددًا';
  END IF;
  IF v_job.status NOT IN ('needs_human', 'failed')
    OR coalesce(v_job.error_code, '') NOT LIKE 'SUBMISSION_UNCERTAIN%' THEN
    RAISE EXCEPTION 'هذه العملية ليست متوقفة بانتظار التحقق من نتيجة الاعتماد';
  END IF;
  IF v_job.result IS NOT NULL OR v_job.current_step = 'receipt_sync_pending' THEN
    RAISE EXCEPTION 'يوجد إيصال أو إيداع بانتظار المزامنة؛ استكمل تسجيله دون إعادة الإرسال';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.taqadi_automation_workers
    WHERE current_job_id = p_job_id AND status IN ('busy', 'waiting_login')
      AND heartbeat_at > now() - interval '90 seconds'
  ) THEN RAISE EXCEPTION 'الوكيل ما زال يعمل على هذه العملية؛ انتظر تأكيد توقفه'; END IF;

  SELECT * INTO v_case FROM public.legal_cases
  WHERE id = v_job.legal_case_id AND company_id = p_company_id
    AND contract_id = v_job.contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'لم يتم العثور على القضية المرتبطة بالعقد'; END IF;
  IF coalesce(v_case.workflow_stage, '') <> 'preparation'
    OR v_case.case_status IN ('closed', 'cancelled')
    OR nullif(btrim(v_case.case_reference), '') IS NOT NULL
    OR v_case.filing_date IS NOT NULL THEN
    RAISE EXCEPTION 'القضية مسجلة أو تجاوزت التجهيز؛ راجع بيانات الإيداع بدل إعادة الإرسال';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.taqadi_filing_jobs other
    WHERE other.company_id = p_company_id AND other.legal_case_id = v_case.id AND other.id <> p_job_id
      AND (other.status NOT IN ('failed', 'cancelled') OR other.result IS NOT NULL
        OR other.error_code LIKE 'SUBMISSION_UNCERTAIN%' OR other.current_step = 'receipt_sync_pending')
  ) THEN RAISE EXCEPTION 'توجد عملية أخرى لهذه القضية؛ راجعها قبل إعادة البدء'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.taqadi_filing_artifacts artifact
    JOIN public.taqadi_filing_jobs job ON job.id = artifact.job_id AND job.company_id = artifact.company_id
    WHERE job.company_id = p_company_id AND job.legal_case_id = v_case.id
      AND artifact.artifact_type IN ('receipt', 'submission_summary')
  ) OR EXISTS (
    SELECT 1 FROM public.lawsuit_preparations preparation
    WHERE preparation.company_id = p_company_id AND preparation.legal_case_id = v_case.id
      AND (nullif(btrim(preparation.taqadi_reference_number), '') IS NOT NULL
        OR nullif(btrim(preparation.taqadi_case_number), '') IS NOT NULL
        OR preparation.submitted_at IS NOT NULL OR preparation.registered_at IS NOT NULL
        OR preparation.status IN ('submitted', 'registered'))
  ) THEN RAISE EXCEPTION 'يوجد إيصال أو مرجع محفوظ لهذه الدعوى؛ راجع تسجيل الإيداع قبل أي إعادة'; END IF;

  -- Clearing uncertainty is allowed only inside this audited transaction. If
  -- the existing source/identity/package validation fails, all changes roll back.
  UPDATE public.taqadi_filing_jobs
  SET error_code = NULL, error_message = NULL, attempt_count = 0
  WHERE id = p_job_id AND company_id = p_company_id;
  v_result := public.restart_taqadi_filing_job_v2(p_company_id, p_job_id, p_payload);
  INSERT INTO public.taqadi_filing_job_events(company_id, job_id, event_type, step, status, message, details)
  VALUES (p_company_id, p_job_id, 'submission_verified_unsubmitted', 'queued', 'queued',
    'أكد المستخدم مراجعة تقاضي وعدم الإيداع؛ أُعيدت العملية من البداية بحزمة محدثة',
    jsonb_build_object('requestId', p_request_id, 'verifiedBy', v_actor, 'verifiedAt', now(),
      'verificationNote', btrim(p_verification_note), 'confirmedNotSubmitted', true,
      'previousStatus', v_job.status, 'previousStep', v_job.current_step,
      'previousErrorCode', v_job.error_code, 'previousErrorMessage', v_job.error_message,
      'previousAttemptCount', v_job.attempt_count, 'previousUpdatedAt', v_job.updated_at));
  RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.restart_verified_unsubmitted_taqadi_job_v1(uuid,uuid,jsonb,timestamptz,boolean,text,uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.restart_verified_unsubmitted_taqadi_job_v1(uuid,uuid,jsonb,timestamptz,boolean,text,uuid)
  TO authenticated;

-- All uncertainty variants must use the verified command, including recovery
-- after worker restart. Keep the deployed restart implementation intact.
DO $patch$
DECLARE original text; anchor text := 'v_job.error_code = ''SUBMISSION_UNCERTAIN''';
BEGIN
  original := pg_get_functiondef('public.restart_taqadi_filing_job_v2(uuid,uuid,jsonb)'::regprocedure);
  IF position(anchor IN original) = 0 THEN RAISE EXCEPTION 'Restart guard changed; review the migration'; END IF;
  EXECUTE replace(original, anchor, 'v_job.error_code LIKE ''SUBMISSION_UNCERTAIN%''');
END;
$patch$;
COMMIT;
