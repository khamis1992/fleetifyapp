-- Trigger helpers are not public RPCs. PostgreSQL invokes this function from
-- the trigger without requiring end-user EXECUTE privileges.
REVOKE ALL ON FUNCTION public.guard_legal_case_filing_readiness_v1()
  FROM PUBLIC, anon, authenticated;

-- Cover the standalone contract foreign key used during contract deletion and
-- audit lookups; the existing company-first composite index is insufficient.
CREATE INDEX IF NOT EXISTS idx_legal_filing_repair_audit_contract_id
  ON public.legal_filing_repair_audit(contract_id);

;
