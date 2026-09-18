-- Restores exact pre-migration definitions. No financial data is changed.
BEGIN;
DO $restore$
BEGIN
  EXECUTE replace(pg_get_functiondef('legal_claim_internal.legacy_breakdown_v3(uuid,uuid,date)'::regprocedure),
    'legal_claim_internal.legacy_breakdown_v3(','public.calculate_legal_claim_breakdown_v3(');
  EXECUTE replace(pg_get_functiondef('legal_claim_internal.legacy_statement_v4(uuid,uuid,date,text,uuid[])'::regprocedure),
    'legal_claim_internal.legacy_statement_v4(','public.calculate_legal_claim_statement_v4(');
END;
$restore$;
DROP FUNCTION legal_claim_internal.calculate_statement_rows_v5(uuid,uuid,date,text,uuid[]);
DROP FUNCTION legal_claim_internal.calculate_breakdown_rows_v5(uuid,uuid,date,jsonb,jsonb);
DROP FUNCTION legal_claim_internal.read_traffic_obligations_v5(uuid,uuid,date);
DROP FUNCTION legal_claim_internal.legacy_statement_v4(uuid,uuid,date,text,uuid[]);
DROP FUNCTION legal_claim_internal.legacy_breakdown_v3(uuid,uuid,date);
DROP SCHEMA legal_claim_internal;
COMMIT;
