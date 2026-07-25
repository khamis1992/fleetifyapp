-- Large historical contracts can contain dozens of posted invoice journals.
-- Keep the wider timeout scoped to the administrator-only permanent deletion
-- call instead of changing the database or API timeout globally.

ALTER FUNCTION public.delete_contract_with_financial_reversals_v2(
  uuid, uuid, text, text, text, uuid
) SET statement_timeout = '120s';

ALTER FUNCTION public.delete_contract_with_financial_reversals_v2_core(
  uuid, uuid, text, text, text, uuid
) SET statement_timeout = '120s';

ALTER FUNCTION public.delete_contract_with_company_violations_v1(
  uuid, uuid, text, text, uuid
) SET statement_timeout = '120s';

ALTER FUNCTION public.diagnose_contract_permanent_deletion_v1(
  uuid, uuid, uuid
) SET statement_timeout = '120s';

COMMENT ON FUNCTION public.delete_contract_with_financial_reversals_v2(
  uuid, uuid, text, text, text, uuid
) IS
'Atomically reverses historical contract finance records and permanently deletes the contract, with a function-scoped timeout for large contracts.';
