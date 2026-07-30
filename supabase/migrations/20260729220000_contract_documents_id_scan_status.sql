-- ============================================================
-- Add id_scan_status to contract_documents
-- ============================================================
-- The contract-id-scanner edge function tracks its per-document
-- scan state here, SEPARATE from ai_match_status (which belongs to
-- the AI document-matching feature and has a restrictive CHECK
-- constraint: pending/matched/not_matched/manual_override/review_required).
-- ============================================================

ALTER TABLE public.contract_documents
  ADD COLUMN IF NOT EXISTS id_scan_status text NOT NULL DEFAULT 'pending'
  CHECK (id_scan_status IN ('pending', 'proposal_created', 'no_id_card', 'no_changes', 'failed'));

COMMENT ON COLUMN public.contract_documents.id_scan_status IS
  'ID-card scan state set by the contract-id-scanner edge function: pending | proposal_created | no_id_card | no_changes | failed';

CREATE INDEX IF NOT EXISTS contract_documents_id_scan_pending_idx
  ON public.contract_documents (id_scan_status)
  WHERE id_scan_status = 'pending';
