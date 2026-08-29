BEGIN;

SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname IN (
  'generate-monthly-invoices',
  'monthly-vehicle-depreciation',
  'process-payment-reminders',
  'traffic-mail-ingest-v1'
);

UPDATE public.agent_invocation_registry
SET enabled = false, updated_at = now()
WHERE agent_id IN (
  'system-audit-orchestrator',
  'generate-monthly-invoices',
  'monthly-vehicle-depreciation',
  'payment-reminder-agent',
  'traffic-mail-ingest'
);

DROP FUNCTION IF EXISTS public.invoke_traffic_mail_ingest_v2();

-- The legacy shared-secret schedulers and report senders are intentionally not
-- reactivated by rollback. A rollback pauses these writers rather than
-- restoring a known insecure or duplicate-delivery path.

DROP FUNCTION IF EXISTS public.get_agent_safety_data_health_v1();
DROP TABLE IF EXISTS public.outbound_whatsapp_commands;
DROP TRIGGER IF EXISTS trg_reject_browser_whatsapp_credentials ON public.whatsapp_settings;
DROP FUNCTION IF EXISTS public.reject_browser_whatsapp_credentials_v1();
DROP FUNCTION IF EXISTS public.apply_customer_merge_proposal_v1(uuid,uuid);
DROP FUNCTION IF EXISTS public.apply_customer_id_scan_proposal_v1(uuid,uuid);
DROP FUNCTION IF EXISTS public.begin_trusted_agent_invocation_v1(text,uuid,text,uuid);

SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname IN (
  'expire-unverified-signed-contracts-v1',
  'escalate-missing-contract-pdf-v1',
  'timeout-stale-agent-executions-v1'
);

DROP TRIGGER IF EXISTS trg_track_missing_contract_pdf_mismatch ON public.contract_documents;
DROP FUNCTION IF EXISTS public.track_missing_contract_pdf_mismatch_v1();
DROP FUNCTION IF EXISTS public.escalate_stale_missing_contract_pdf_requests_v1(uuid,integer);

ALTER TABLE public.missing_contract_pdf_requests
  DROP COLUMN IF EXISTS review_cooldown_until,
  DROP COLUMN IF EXISTS mismatch_upload_count,
  DROP COLUMN IF EXISTS escalation_count,
  DROP COLUMN IF EXISTS escalation_closed_at,
  DROP COLUMN IF EXISTS last_escalated_at,
  DROP COLUMN IF EXISTS first_escalated_at,
  DROP COLUMN IF EXISTS escalation_due_at;

DROP FUNCTION IF EXISTS public.consume_missing_contract_pdf_upload_token_v1(text,text,uuid);
DROP FUNCTION IF EXISTS public.release_missing_contract_pdf_upload_token_claim_v1(text,text);
DROP FUNCTION IF EXISTS public.claim_missing_contract_pdf_upload_token_v1(text,text);
DROP FUNCTION IF EXISTS public.resolve_missing_contract_pdf_upload_token_v1(text);
DROP FUNCTION IF EXISTS public.issue_missing_contract_pdf_upload_token_v1(uuid,interval);
DROP TABLE IF EXISTS public.missing_contract_pdf_upload_tokens;

DROP FUNCTION IF EXISTS public.validate_taqadi_filing_payload_v1(uuid,uuid,jsonb);
ALTER FUNCTION public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb)
  RENAME TO validate_taqadi_filing_payload_v1;

DROP TRIGGER IF EXISTS trg_guard_lawsuit_preparation_source_document ON public.lawsuit_preparations;
DROP FUNCTION IF EXISTS public.guard_lawsuit_preparation_source_document_v1();
ALTER TABLE public.lawsuit_preparations
  DROP CONSTRAINT IF EXISTS lawsuit_preparations_direct_source_document_fkey,
  DROP COLUMN IF EXISTS source_document_id;

DROP FUNCTION IF EXISTS public.convert_contract_to_legal_v1(
  uuid,uuid,text,text,text,boolean,uuid
);
ALTER FUNCTION public.convert_contract_to_legal_v1_pre_failure_containment(
  uuid,uuid,text,text,text,boolean,uuid
) RENAME TO convert_contract_to_legal_v1;

DROP FUNCTION IF EXISTS public.complete_legal_transfer_readiness_v1(uuid,uuid,jsonb,uuid);
ALTER FUNCTION public.complete_legal_transfer_readiness_v1_pre_failure_containment(uuid,uuid,jsonb,uuid)
  RENAME TO complete_legal_transfer_readiness_v1;

DROP FUNCTION IF EXISTS public.get_legal_transfer_readiness_v1(uuid,uuid);
ALTER FUNCTION public.get_legal_transfer_readiness_v1_pre_failure_containment(uuid,uuid)
  RENAME TO get_legal_transfer_readiness_v1;

DROP FUNCTION IF EXISTS public.get_direct_signed_contract_evidence_state_v1(uuid,uuid);
DROP FUNCTION IF EXISTS public.expire_unverified_signed_contracts_v1(uuid,integer);
DROP TRIGGER IF EXISTS trg_guard_contract_document_lifecycle ON public.contract_documents;
DROP FUNCTION IF EXISTS public.guard_contract_document_lifecycle_v1();

DROP POLICY IF EXISTS "Users can update contract documents in their company"
ON storage.objects;
CREATE POLICY "Users can update contract documents in their company"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public.contract_documents document
    JOIN public.contracts contract ON contract.id = document.contract_id
    WHERE document.file_path = storage.objects.name
      AND contract.company_id = public.get_user_company(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete contract documents in their company"
ON storage.objects;
CREATE POLICY "Users can delete contract documents in their company"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public.contract_documents document
    JOIN public.contracts contract ON contract.id = document.contract_id
    WHERE document.file_path = storage.objects.name
      AND contract.company_id = public.get_user_company(auth.uid())
  )
);

UPDATE public.contract_documents
SET legal_identity_match_status = 'unverified'
WHERE legal_identity_match_status = 'expired_unverified';

ALTER TABLE public.contract_documents
  DROP CONSTRAINT IF EXISTS contract_documents_legal_identity_match_status_check;
ALTER TABLE public.contract_documents
  ADD CONSTRAINT contract_documents_legal_identity_match_status_check
  CHECK (legal_identity_match_status IN ('pending', 'matched', 'mismatch', 'unverified', 'failed'));

ALTER TABLE public.contract_documents
  DROP COLUMN IF EXISTS ocr_review_reason,
  DROP COLUMN IF EXISTS ocr_quality_score,
  DROP COLUMN IF EXISTS superseded_by_document_id,
  DROP COLUMN IF EXISTS legal_evidence_state,
  DROP COLUMN IF EXISTS legal_identity_expires_at;
DROP INDEX IF EXISTS public.contract_documents_company_contract_id_key;
DROP INDEX IF EXISTS public.contract_documents_active_legal_evidence_idx;
DROP INDEX IF EXISTS public.contract_documents_identity_expiry_idx;

DROP TRIGGER IF EXISTS trg_guard_system_agent_finding_budget ON public.system_agent_findings;
DROP FUNCTION IF EXISTS public.guard_system_agent_finding_budget_v1();
DROP TRIGGER IF EXISTS trg_guard_system_agent_repair_budget ON public.system_agent_repairs;
DROP FUNCTION IF EXISTS public.guard_system_agent_repair_budget_v1();
DROP TRIGGER IF EXISTS trg_agent_execution_run_from_safety_event ON public.agent_safety_events;
DROP FUNCTION IF EXISTS public.guard_agent_execution_run_from_safety_event_v1();
DROP FUNCTION IF EXISTS public.process_vehicle_depreciation_monthly_agent_v1(uuid,date,text,integer);
DROP FUNCTION IF EXISTS public.finalize_user_account_creation_v1(uuid,uuid,uuid,text,text,text,text,text,text[]);
DROP FUNCTION IF EXISTS public.transfer_user_to_company(uuid,uuid,uuid,text[],text,jsonb);
DROP FUNCTION IF EXISTS public.finish_agent_execution_v1(uuid,text,text,boolean,jsonb,text);
DROP FUNCTION IF EXISTS public.timeout_stale_agent_executions_v1(uuid,integer);
DROP FUNCTION IF EXISTS public.record_agent_mutation_v1(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb,boolean);
DROP TABLE IF EXISTS public.agent_execution_mutations;
DROP TABLE IF EXISTS public.agent_execution_runs;

ALTER TABLE public.agent_safety_policies
  DROP COLUMN IF EXISTS execution_ledger_enabled,
  DROP COLUMN IF EXISTS data_classification,
  DROP COLUMN IF EXISTS escalation_after,
  DROP COLUMN IF EXISTS requires_postcondition,
  DROP COLUMN IF EXISTS requires_before_after,
  DROP COLUMN IF EXISTS max_attempts,
  DROP COLUMN IF EXISTS max_findings_per_run,
  DROP COLUMN IF EXISTS max_mutations_per_run;

COMMIT;
