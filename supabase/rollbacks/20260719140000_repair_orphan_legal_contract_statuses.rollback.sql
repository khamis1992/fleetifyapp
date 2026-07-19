DROP TRIGGER IF EXISTS enforce_contract_legal_case_evidence
  ON public.contracts;

DROP FUNCTION IF EXISTS public.enforce_contract_legal_case_evidence_v1();

-- The repaired contract statuses are intentionally retained. Restoring an
-- unsupported legal status would recreate invalid business data. If a
-- contract must enter legal procedure again, use the official legal-case flow.
