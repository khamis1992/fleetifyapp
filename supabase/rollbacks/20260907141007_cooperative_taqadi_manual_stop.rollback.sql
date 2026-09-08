-- Keep the stop command available for in-flight stop requests. Disabling the UI
-- feature is safe; removing the worker acknowledgement while requests exist is not.
BEGIN;
DO $rollback$
DECLARE original text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.taqadi_filing_jobs WHERE error_code='MANUAL_STOP_REQUESTED') THEN
    RAISE EXCEPTION 'Acknowledge pending stop requests before rollback';
  END IF;
  original := pg_get_functiondef('public.update_taqadi_filing_job_v1(uuid,text,text,text,integer,text,jsonb,text,text)'::regprocedure);
  EXECUTE replace(original,E'\n    AND job.error_code IS DISTINCT FROM ''MANUAL_STOP_REQUESTED''','');
END;
$rollback$;
-- Leave the read-only check callable for already deployed worker binaries.
CREATE OR REPLACE FUNCTION public.cancel_taqadi_filing_job_v1(p_company_id uuid,p_job_id uuid,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE v_job public.taqadi_filing_jobs%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501';
  END IF;
  UPDATE public.taqadi_filing_jobs SET status='cancelled',current_step='cancelled',error_message=p_reason,completed_at=now(),updated_at=now()
  WHERE id=p_job_id AND company_id=p_company_id AND status IN ('queued','waiting_login','needs_human','failed')
    AND COALESCE(error_code,'') NOT LIKE 'SUBMISSION_UNCERTAIN%'
  RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'This filing job cannot be cancelled at its current step'; END IF;
  INSERT INTO public.taqadi_filing_job_events(company_id,job_id,event_type,step,status,message)
  VALUES(p_company_id,p_job_id,'cancelled','cancelled','cancelled',COALESCE(p_reason,'تم إيقاف العملية'));
  RETURN to_jsonb(v_job);
END;
$function$;
COMMIT;
