BEGIN;

DROP INDEX IF EXISTS public.legal_notice_agent_proof_document_idx;
DROP INDEX IF EXISTS public.legal_notice_agent_formal_notice_idx;
DROP INDEX IF EXISTS public.legal_notice_agent_customer_idx;

COMMIT;
