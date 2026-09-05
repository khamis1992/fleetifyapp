WITH repairs AS (
  SELECT DISTINCT ON (log.resource_id)
    log.resource_id::uuid AS document_id,
    log.old_values
  FROM public.audit_logs log
  WHERE log.action = 'repair_exact_qid_contract_identity_20260903163521'
    AND log.resource_type = 'contract_document'
  ORDER BY log.resource_id, log.created_at DESC
)
UPDATE public.contract_documents document
SET
  legal_identity_match_status = repairs.old_values ->> 'legal_identity_match_status',
  legal_identity_match_reason = repairs.old_values ->> 'legal_identity_match_reason',
  legal_identity_checked_at = NULLIF(repairs.old_values ->> 'legal_identity_checked_at', '')::timestamptz,
  updated_at = pg_catalog.now()
FROM repairs
WHERE document.id = repairs.document_id;

DELETE FROM public.audit_logs
WHERE action = 'repair_exact_qid_contract_identity_20260903163521'
  AND resource_type = 'contract_document';
