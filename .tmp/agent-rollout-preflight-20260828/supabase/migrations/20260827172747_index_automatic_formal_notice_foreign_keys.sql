BEGIN;

CREATE INDEX legal_notice_agent_customer_idx
  ON public.legal_notice_agent_jobs(customer_id);

CREATE INDEX legal_notice_agent_formal_notice_idx
  ON public.legal_notice_agent_jobs(formal_notice_id)
  WHERE formal_notice_id IS NOT NULL;

CREATE INDEX legal_notice_agent_proof_document_idx
  ON public.legal_notice_agent_jobs(proof_document_id)
  WHERE proof_document_id IS NOT NULL;

COMMIT;

;
