-- Preserve the resume_requested marker through the filing-job claim.
-- The claim RPC rewrote current_step to 'preflight' unconditionally, so a
-- resume queued after a human login was silently turned into a fresh
-- openNewCase run — which both duplicates drafts and breaks resume.

BEGIN;

DO $$
DECLARE
  v_def text;
  v_target text := 'current_step = ''preflight'',';
  v_replacement text := 'current_step = CASE WHEN job.current_step = ''resume_requested'' THEN ''resume_requested'' ELSE ''preflight'' END,';
BEGIN
  v_def := pg_get_functiondef(
    'public.claim_next_taqadi_filing_job_v1(text,text)'::regprocedure
  );

  IF (SELECT count(*) FROM regexp_matches(regexp_replace(v_def, '\s', '', 'g'), regexp_replace(v_target, '\s', '', 'g'), 'g')) <> 1 THEN
    RAISE EXCEPTION 'claim function shape unexpected; aborting for manual review';
  END IF;

  v_def := replace(v_def, v_target, v_replacement);
  EXECUTE v_def;
END;
$$;

COMMIT;;
