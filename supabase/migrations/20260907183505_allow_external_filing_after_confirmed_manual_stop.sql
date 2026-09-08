BEGIN;

-- An acknowledged stop is a completed handoff. Revoke worker ownership so
-- delayed progress writes cannot resume it after the operator takes over.
DO $patch$
DECLARE original text; anchor text;
BEGIN
  original := pg_get_functiondef('public.check_taqadi_filing_control_v1(uuid,text,boolean)'::regprocedure);
  anchor := 'completed_at=now(),updated_at=now()';
  IF position(anchor IN original)=0 THEN RAISE EXCEPTION 'Manual stop acknowledgement changed'; END IF;
  EXECUTE replace(original,anchor,'completed_at=now(),updated_at=now(),locked_by=NULL,locked_at=NULL,heartbeat_at=NULL');

  original := pg_get_functiondef('public.record_external_legal_filing_v1(uuid,uuid,text,date)'::regprocedure);
  anchor := 'AND status NOT IN (''failed'',''cancelled'',''filed'')';
  IF position(anchor IN original)=0 THEN RAISE EXCEPTION 'External filing guard changed'; END IF;
  EXECUTE replace(original,anchor,anchor || E'\n   AND NOT COALESCE((status=''needs_human'' AND error_code=''MANUALLY_STOPPED''\n     AND current_step=''manual_stop'' AND locked_by IS NULL AND locked_at IS NULL),false)');
END;
$patch$;

-- Repair ownership left by the previous acknowledgement implementation, only
-- when the trusted worker's stopped event proves that it already returned.
WITH released AS (
  UPDATE public.taqadi_filing_jobs job SET locked_by=NULL,locked_at=NULL,heartbeat_at=NULL,updated_at=now()
  WHERE job.status='needs_human' AND job.error_code='MANUALLY_STOPPED' AND job.current_step='manual_stop'
    AND (job.locked_by IS NOT NULL OR job.locked_at IS NOT NULL)
    AND EXISTS(SELECT 1 FROM public.taqadi_filing_job_events event
      WHERE event.company_id=job.company_id AND event.job_id=job.id
        AND event.event_type='stopped' AND event.step='manual_stop' AND event.status='needs_human')
  RETURNING job.id,job.company_id,job.status
)
INSERT INTO public.taqadi_filing_job_events(company_id,job_id,event_type,step,status,message)
SELECT company_id,id,'manual_stop_lock_released','manual_stop',status,
  'تم تحرير قفل الوكيل بعد تأكيد توقفه؛ أصبح توثيق الإيداع اليدوي متاحًا' FROM released;

COMMIT;
