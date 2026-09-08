BEGIN;
DO $restore$
BEGIN
  EXECUTE replace(pg_get_functiondef('legal_memo_calc_private.before_service_period_read_statement(uuid,uuid,date,text,uuid[])'::regprocedure),
    'legal_memo_calc_private.before_service_period_read_statement(', 'legal_memo_calc_private.read_statement(');
END;
$restore$;
DROP FUNCTION legal_memo_calc_private.before_service_period_read_statement(uuid,uuid,date,text,uuid[]);
DROP FUNCTION legal_memo_calc_private.invoice_service_period(uuid,uuid,uuid,date);
COMMIT;
