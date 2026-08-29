-- Rollback for 20260826142609_legal_evidence_automation_proposals.sql

DROP TABLE IF EXISTS public.legal_case_evidence_proposals;
DROP FUNCTION IF EXISTS public.update_legal_evidence_proposal_updated_at();
