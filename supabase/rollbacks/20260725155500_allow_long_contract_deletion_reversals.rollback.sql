ALTER FUNCTION public.delete_contract_with_financial_reversals_v2(
  uuid, uuid, text, text, text, uuid
) RESET statement_timeout;

ALTER FUNCTION public.delete_contract_with_financial_reversals_v2_core(
  uuid, uuid, text, text, text, uuid
) RESET statement_timeout;

ALTER FUNCTION public.delete_contract_with_company_violations_v1(
  uuid, uuid, text, text, uuid
) RESET statement_timeout;

ALTER FUNCTION public.diagnose_contract_permanent_deletion_v1(
  uuid, uuid, uuid
) RESET statement_timeout;
