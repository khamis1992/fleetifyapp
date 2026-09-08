BEGIN;
DO $restore$
BEGIN
 EXECUTE replace(pg_get_functiondef('legal_memo_calc_private.before_statement_readiness(uuid,uuid)'::regprocedure),
 'legal_memo_calc_private.before_statement_readiness(', 'public.get_legal_transfer_readiness_v2(');
END;
$restore$;
DROP FUNCTION legal_memo_calc_private.before_statement_readiness(uuid,uuid);
DROP FUNCTION legal_memo_calc_private.readiness_financials(uuid,uuid,date);
COMMIT;
