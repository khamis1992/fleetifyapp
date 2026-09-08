BEGIN;
DO $restore$
BEGIN
 EXECUTE replace(pg_get_functiondef('legal_memo_calc_private.before_bounded_retirement_read_traffic(uuid,uuid,date)'::regprocedure),
 'legal_memo_calc_private.before_bounded_retirement_read_traffic(', 'legal_memo_calc_private.read_traffic(');
END;
$restore$;
DROP FUNCTION legal_memo_calc_private.before_bounded_retirement_read_traffic(uuid,uuid,date);
COMMIT;
