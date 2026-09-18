BEGIN;
DO $restore$
BEGIN
  EXECUTE replace(pg_get_functiondef('legal_memo_calc_private.before_contact_worker_approval(uuid,text,jsonb)'::regprocedure),
    'legal_memo_calc_private.before_contact_worker_approval(', 'public.approve_taqadi_reviewed_legal_file_v1(');
  EXECUTE replace(pg_get_functiondef('legal_memo_calc_private.before_contact_filing_block(uuid,uuid,numeric)'::regprocedure),
    'legal_memo_calc_private.before_contact_filing_block(', 'public.legal_case_filing_block_reason_v1(');
END;
$restore$;
DROP FUNCTION legal_memo_calc_private.before_contact_worker_approval(uuid,text,jsonb);
DROP FUNCTION legal_memo_calc_private.before_contact_filing_block(uuid,uuid,numeric);
COMMIT;
