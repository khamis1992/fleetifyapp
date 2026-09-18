-- Generic document deletion must not silently erase evidence links. The two
-- direct signed-contract sources (preparations/jobs) already use RESTRICT.
-- Keep these existing nullable references and their names; change only the
-- delete action. No records are rewritten and no client privileges are added.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.legal_case_damage_costs
  DROP CONSTRAINT legal_case_damage_costs_evidence_document_id_fkey,
  ADD CONSTRAINT legal_case_damage_costs_evidence_document_id_fkey
    FOREIGN KEY (evidence_document_id) REFERENCES public.contract_documents(id) ON DELETE RESTRICT;

ALTER TABLE public.legal_case_evidence_proposals
  DROP CONSTRAINT legal_case_evidence_proposals_source_document_id_fkey,
  ADD CONSTRAINT legal_case_evidence_proposals_source_document_id_fkey
    FOREIGN KEY (source_document_id) REFERENCES public.contract_documents(id) ON DELETE RESTRICT;

ALTER TABLE public.legal_case_formal_notices
  DROP CONSTRAINT legal_case_formal_notices_proof_document_id_fkey,
  ADD CONSTRAINT legal_case_formal_notices_proof_document_id_fkey
    FOREIGN KEY (proof_document_id) REFERENCES public.contract_documents(id) ON DELETE RESTRICT;

ALTER TABLE public.legal_case_litigation_profile
  DROP CONSTRAINT legal_case_litigation_profile_contractual_compensation_doc_fkey,
  ADD CONSTRAINT legal_case_litigation_profile_contractual_compensation_doc_fkey
    FOREIGN KEY (contractual_compensation_document_id) REFERENCES public.contract_documents(id) ON DELETE RESTRICT,
  DROP CONSTRAINT legal_case_litigation_profile_defendant_contact_document_i_fkey,
  ADD CONSTRAINT legal_case_litigation_profile_defendant_contact_document_i_fkey
    FOREIGN KEY (defendant_contact_document_id) REFERENCES public.contract_documents(id) ON DELETE RESTRICT,
  DROP CONSTRAINT legal_case_litigation_profile_delivery_handover_document_i_fkey,
  ADD CONSTRAINT legal_case_litigation_profile_delivery_handover_document_i_fkey
    FOREIGN KEY (delivery_handover_document_id) REFERENCES public.contract_documents(id) ON DELETE RESTRICT,
  DROP CONSTRAINT legal_case_litigation_profile_notice_exception_document_id_fkey,
  ADD CONSTRAINT legal_case_litigation_profile_notice_exception_document_id_fkey
    FOREIGN KEY (notice_exception_document_id) REFERENCES public.contract_documents(id) ON DELETE RESTRICT,
  DROP CONSTRAINT legal_case_litigation_profile_retention_rate_source_docume_fkey,
  ADD CONSTRAINT legal_case_litigation_profile_retention_rate_source_docume_fkey
    FOREIGN KEY (retention_rate_source_document_id) REFERENCES public.contract_documents(id) ON DELETE RESTRICT,
  DROP CONSTRAINT legal_case_litigation_profile_termination_supporting_docum_fkey,
  ADD CONSTRAINT legal_case_litigation_profile_termination_supporting_docum_fkey
    FOREIGN KEY (termination_supporting_document_id) REFERENCES public.contract_documents(id) ON DELETE RESTRICT,
  DROP CONSTRAINT legal_case_litigation_profile_vehicle_return_document_id_fkey,
  ADD CONSTRAINT legal_case_litigation_profile_vehicle_return_document_id_fkey
    FOREIGN KEY (vehicle_return_document_id) REFERENCES public.contract_documents(id) ON DELETE RESTRICT;

ALTER TABLE public.legal_notice_agent_jobs
  DROP CONSTRAINT legal_notice_agent_jobs_proof_document_id_fkey,
  ADD CONSTRAINT legal_notice_agent_jobs_proof_document_id_fkey
    FOREIGN KEY (proof_document_id) REFERENCES public.contract_documents(id) ON DELETE RESTRICT;

COMMIT;
