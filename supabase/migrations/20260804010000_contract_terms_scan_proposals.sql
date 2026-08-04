-- Proposals produced by the contract-terms-scanner agent: it reads the signed
-- contract document (the source of truth), extracts the written rent terms,
-- and proposes corrections when the stored contract disagrees. Nothing is
-- applied automatically; finance approves or rejects each proposal.

BEGIN;

CREATE TABLE IF NOT EXISTS public.contract_terms_scan_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  contract_document_id uuid REFERENCES public.contract_documents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  extracted_terms jsonb NOT NULL,
  current_terms jsonb NOT NULL,
  proposed_changes jsonb NOT NULL,
  raw_text text,
  overall_confidence numeric,
  decided_by uuid,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_terms_scan_proposals_status_valid
    CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_contract_terms_scan_proposals_company_status
  ON public.contract_terms_scan_proposals(company_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_terms_scan_pending_document
  ON public.contract_terms_scan_proposals(contract_document_id)
  WHERE status = 'pending' AND contract_document_id IS NOT NULL;

ALTER TABLE public.contract_terms_scan_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_terms_scan_proposals_company_read
  ON public.contract_terms_scan_proposals
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id());

REVOKE ALL ON TABLE public.contract_terms_scan_proposals FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.contract_terms_scan_proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.contract_terms_scan_proposals TO service_role;

COMMENT ON TABLE public.contract_terms_scan_proposals IS
  'Signed-contract OCR/LLM rent-terms proposals; the written contract is the source of truth and every correction requires human approval.';

COMMIT;
