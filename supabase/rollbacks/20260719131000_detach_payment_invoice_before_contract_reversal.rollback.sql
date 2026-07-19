DROP FUNCTION IF EXISTS public.delete_contract_with_financial_reversals_v2(
  uuid, uuid, text, text, text, uuid
);

ALTER FUNCTION public.delete_contract_with_financial_reversals_v2_core(
  uuid, uuid, text, text, text, uuid
) RENAME TO delete_contract_with_financial_reversals_v2;

GRANT EXECUTE ON FUNCTION public.delete_contract_with_financial_reversals_v2(
  uuid, uuid, text, text, text, uuid
) TO authenticated, service_role;
