-- Preserve synchronized case values and their audit records.
BEGIN;
DO $patch$
DECLARE original text; addition text;
BEGIN
  original := pg_get_functiondef('public.approve_taqadi_reviewed_legal_file_v1(uuid,text,jsonb)'::regprocedure);
  addition := E'  PERFORM public.sync_taqadi_approved_case_value_v1(v_job.id, p_worker_id);\n  IF public.legal_case_filing_block_reason_v1(v_job.company_id, v_job.legal_case_id, v_payload_claim) IS NOT NULL THEN\n    RAISE EXCEPTION ''The approved case did not pass the final filing readiness check'';\n  END IF;\n\n';
  IF position(addition IN original) = 0 THEN RAISE EXCEPTION 'Approval patch changed'; END IF;
  EXECUTE replace(original, addition, '');
  original := pg_get_functiondef('public.complete_taqadi_filing_job_v1(uuid,text,text,text,numeric,jsonb)'::regprocedure);
  addition := E'\n    PERFORM public.sync_taqadi_approved_case_value_v1(v_job.id, p_worker_id);\n';
  IF position(addition IN original) = 0 THEN RAISE EXCEPTION 'Completion patch changed'; END IF;
  EXECUTE replace(original, addition, '');
END;
$patch$;
DROP FUNCTION public.sync_taqadi_approved_case_value_v1(uuid,text);
COMMIT;
