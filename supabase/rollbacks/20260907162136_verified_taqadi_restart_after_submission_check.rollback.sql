BEGIN;
DROP FUNCTION IF EXISTS public.restart_verified_unsubmitted_taqadi_job_v1(uuid,uuid,jsonb,timestamptz,boolean,text,uuid);
DO $patch$
DECLARE original text; anchor text := 'v_job.error_code LIKE ''SUBMISSION_UNCERTAIN%''';
BEGIN
  original := pg_get_functiondef('public.restart_taqadi_filing_job_v2(uuid,uuid,jsonb)'::regprocedure);
  IF position(anchor IN original) = 0 THEN RAISE EXCEPTION 'Restart guard changed; review the rollback'; END IF;
  EXECUTE replace(original, anchor, 'v_job.error_code = ''SUBMISSION_UNCERTAIN''');
END;
$patch$;
-- Keep verification events and queued work; rollback never undoes a filing.
COMMIT;
