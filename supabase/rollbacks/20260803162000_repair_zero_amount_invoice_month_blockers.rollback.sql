BEGIN;

DROP FUNCTION IF EXISTS public.generate_invoice_for_contract_month(uuid, date);
DROP FUNCTION IF EXISTS public.system_generate_invoice_for_contract_month_core(uuid, date);
DROP FUNCTION IF EXISTS public.system_agent_resolve_invoice_month_findings(uuid, uuid, uuid, date);
DROP FUNCTION IF EXISTS public.system_invoice_has_single_balanced_posted_journal(uuid, uuid, numeric);

ALTER FUNCTION public.generate_invoice_for_contract_month_before_zero_repair(uuid, date)
  RENAME TO generate_invoice_for_contract_month;

REVOKE ALL ON FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_for_contract_month(uuid, date)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.generate_invoice_for_contract_month(uuid, date) IS
  'Atomically creates one finance-authorized canonical-month contract invoice; service-role and trusted postgres/supabase_admin sessions support automated reconciliation.';

COMMIT;
