BEGIN;

DROP FUNCTION IF EXISTS public.apply_autonomous_contract_reconciliation_v1(uuid,jsonb);
ALTER FUNCTION public.apply_autonomous_contract_reconciliation_core_v1(uuid,jsonb)
  RENAME TO apply_autonomous_contract_reconciliation_v1;

REVOKE ALL ON FUNCTION public.apply_autonomous_contract_reconciliation_v1(uuid,jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_autonomous_contract_reconciliation_v1(uuid,jsonb)
TO service_role;

COMMIT;
