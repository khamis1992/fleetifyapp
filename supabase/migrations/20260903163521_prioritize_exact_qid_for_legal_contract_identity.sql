-- Exact QID evidence can resolve a signed contract only when the contract did
-- not yield an authoritative tenant name. A matching attached ID card must not
-- overrule a different tenant named in the contract itself. Preserve a
-- reversible audit snapshot before repairing the narrow no-name cases.

WITH candidates AS (
  SELECT
    document.id,
    document.company_id,
    document.legal_identity_match_status,
    document.legal_identity_match_reason,
    document.legal_identity_checked_at
  FROM public.contract_documents document
  WHERE document.document_type IN ('signed_contract', 'signed_contract_image')
    AND document.legal_evidence_state = 'active'
    AND document.legal_identity_match_status <> 'matched'
    AND NULLIF(btrim(COALESCE(document.legal_identity_extracted_name, '')), '') IS NULL
    AND LENGTH(pg_catalog.regexp_replace(COALESCE(document.legal_identity_expected_id, ''), '[^0-9]', '', 'g')) = 11
    AND pg_catalog.regexp_replace(COALESCE(document.legal_identity_expected_id, ''), '[^0-9]', '', 'g')
      = pg_catalog.regexp_replace(COALESCE(document.legal_identity_extracted_id, ''), '[^0-9]', '', 'g')
)
INSERT INTO public.audit_logs (
  company_id,
  action,
  resource_type,
  resource_id,
  entity_name,
  changes_summary,
  old_values,
  new_values,
  severity,
  status,
  metadata
)
SELECT
  candidate.company_id,
  'repair_exact_qid_contract_identity_20260903163521',
  'contract_document',
  candidate.id,
  'contract_documents',
  'Reclassified signed-contract identity evidence after an exact 11-digit QID match overruled noisy OCR name text.',
  pg_catalog.jsonb_build_object(
    'legal_identity_match_status', candidate.legal_identity_match_status,
    'legal_identity_match_reason', candidate.legal_identity_match_reason,
    'legal_identity_checked_at', candidate.legal_identity_checked_at
  ),
  pg_catalog.jsonb_build_object(
    'legal_identity_match_status', 'matched',
    'legal_identity_match_reason', 'The identity number in the signed contract matches the defendant.'
  ),
  'info',
  'completed',
  pg_catalog.jsonb_build_object('migration', '20260903163521')
FROM candidates candidate;

UPDATE public.contract_documents document
SET
  legal_identity_match_status = 'matched',
  legal_identity_match_reason = 'The identity number in the signed contract matches the defendant.',
  legal_identity_checked_at = pg_catalog.now(),
  updated_at = pg_catalog.now()
WHERE document.document_type IN ('signed_contract', 'signed_contract_image')
  AND document.legal_evidence_state = 'active'
  AND document.legal_identity_match_status <> 'matched'
  AND NULLIF(btrim(COALESCE(document.legal_identity_extracted_name, '')), '') IS NULL
  AND LENGTH(pg_catalog.regexp_replace(COALESCE(document.legal_identity_expected_id, ''), '[^0-9]', '', 'g')) = 11
  AND pg_catalog.regexp_replace(COALESCE(document.legal_identity_expected_id, ''), '[^0-9]', '', 'g')
    = pg_catalog.regexp_replace(COALESCE(document.legal_identity_extracted_id, ''), '[^0-9]', '', 'g');
