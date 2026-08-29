DROP INDEX IF EXISTS public.idx_legal_filing_repair_audit_contract_id;
GRANT EXECUTE ON FUNCTION public.guard_legal_case_filing_readiness_v1()
  TO PUBLIC;
