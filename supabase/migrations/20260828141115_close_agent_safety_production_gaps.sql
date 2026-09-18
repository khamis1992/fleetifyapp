-- Closes the two production acceptance gaps discovered after the safety-kernel
-- rollout: ambiguous legacy contract evidence and missing direct evidence links
-- on the durable Taqadi filing queue.

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.taqadi_filing_jobs') IS NULL
     OR to_regclass('public.lawsuit_preparations') IS NULL
     OR to_regclass('public.contract_documents') IS NULL
     OR to_regprocedure('public.enqueue_missing_contract_pdf_request_v1(uuid,uuid,text,uuid)') IS NULL
  THEN
    RAISE EXCEPTION 'Required legal filing and missing-PDF controls are unavailable';
  END IF;
END;
$preflight$;

ALTER TABLE public.taqadi_filing_jobs
  ADD COLUMN IF NOT EXISTS lawsuit_preparation_id uuid,
  ADD COLUMN IF NOT EXISTS source_document_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS lawsuit_preparations_company_contract_id_key
  ON public.lawsuit_preparations(company_id, contract_id, id);

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'taqadi_filing_jobs_lawsuit_preparation_scope_fkey'
      AND conrelid = 'public.taqadi_filing_jobs'::regclass
  ) THEN
    ALTER TABLE public.taqadi_filing_jobs
      ADD CONSTRAINT taqadi_filing_jobs_lawsuit_preparation_scope_fkey
      FOREIGN KEY (company_id, contract_id, lawsuit_preparation_id)
      REFERENCES public.lawsuit_preparations(company_id, contract_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'taqadi_filing_jobs_source_document_scope_fkey'
      AND conrelid = 'public.taqadi_filing_jobs'::regclass
  ) THEN
    ALTER TABLE public.taqadi_filing_jobs
      ADD CONSTRAINT taqadi_filing_jobs_source_document_scope_fkey
      FOREIGN KEY (company_id, contract_id, source_document_id)
      REFERENCES public.contract_documents(company_id, contract_id, id)
      ON DELETE RESTRICT;
  END IF;
END;
$constraints$;

-- Populate legacy links only when the relationship can be proven directly.
UPDATE public.taqadi_filing_jobs job
SET lawsuit_preparation_id = (
  SELECT preparation.id
  FROM public.lawsuit_preparations preparation
  WHERE preparation.company_id = job.company_id
    AND preparation.contract_id = job.contract_id
    AND preparation.legal_case_id = job.legal_case_id
  ORDER BY preparation.updated_at DESC NULLS LAST,
           preparation.created_at DESC NULLS LAST,
           preparation.id DESC
  LIMIT 1
)
WHERE job.lawsuit_preparation_id IS NULL;

UPDATE public.taqadi_filing_jobs job
SET source_document_id = (
  SELECT CASE
    WHEN COALESCE(payload_document ->> 'sourceDocumentId', '')
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    THEN (payload_document ->> 'sourceDocumentId')::uuid
    ELSE NULL
  END AS document_id
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(job.payload -> 'documents') = 'array'
      THEN job.payload -> 'documents'
      ELSE '[]'::jsonb
    END
  ) payload_document
  JOIN public.contract_documents document
    ON document.id = CASE
      WHEN COALESCE(payload_document ->> 'sourceDocumentId', '')
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (payload_document ->> 'sourceDocumentId')::uuid
      ELSE NULL
    END
   AND document.company_id = job.company_id
   AND document.contract_id = job.contract_id
   AND document.document_type IN ('signed_contract', 'signed_contract_image')
   AND document.legal_identity_match_status = 'matched'
   AND document.legal_evidence_state = 'active'
  WHERE payload_document ->> 'key' = 'contract'
    AND COALESCE(payload_document ->> 'sourceDocumentId', '')
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  LIMIT 1
)
WHERE job.source_document_id IS NULL;

CREATE OR REPLACE FUNCTION public.hydrate_and_guard_taqadi_filing_links_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_payload_source uuid;
  v_preparation_id uuid;
BEGIN
  IF NEW.lawsuit_preparation_id IS NULL THEN
    SELECT preparation.id
    INTO v_preparation_id
    FROM public.lawsuit_preparations preparation
    WHERE preparation.company_id = NEW.company_id
      AND preparation.contract_id = NEW.contract_id
      AND preparation.legal_case_id = NEW.legal_case_id
    ORDER BY preparation.updated_at DESC NULLS LAST,
             preparation.created_at DESC NULLS LAST,
             preparation.id DESC
    LIMIT 1;
    NEW.lawsuit_preparation_id := v_preparation_id;
  END IF;

  SELECT CASE
    WHEN COALESCE(payload_document ->> 'sourceDocumentId', '')
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    THEN (payload_document ->> 'sourceDocumentId')::uuid
    ELSE NULL
  END
  INTO v_payload_source
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(NEW.payload -> 'documents') = 'array'
      THEN NEW.payload -> 'documents'
      ELSE '[]'::jsonb
    END
  ) payload_document
  WHERE payload_document ->> 'key' = 'contract'
    AND COALESCE(payload_document ->> 'sourceDocumentId', '')
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  LIMIT 1;

  IF NEW.source_document_id IS NULL THEN
    NEW.source_document_id := v_payload_source;
  ELSIF v_payload_source IS DISTINCT FROM NEW.source_document_id THEN
    RAISE EXCEPTION 'TAQADI_PAYLOAD_SOURCE_DOCUMENT_MISMATCH' USING ERRCODE = '23514';
  END IF;

  IF NEW.lawsuit_preparation_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.lawsuit_preparations preparation
    WHERE preparation.id = NEW.lawsuit_preparation_id
      AND preparation.company_id = NEW.company_id
      AND preparation.contract_id = NEW.contract_id
      AND preparation.legal_case_id = NEW.legal_case_id
  ) THEN
    RAISE EXCEPTION 'TAQADI_LAWSUIT_PREPARATION_LINK_REQUIRED' USING ERRCODE = '23514';
  END IF;

  IF NEW.source_document_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.id = NEW.source_document_id
      AND document.company_id = NEW.company_id
      AND document.contract_id = NEW.contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active'
      AND NULLIF(pg_catalog.btrim(document.file_path), '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'TAQADI_DIRECT_ACTIVE_MATCHED_SOURCE_REQUIRED' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_hydrate_and_guard_taqadi_filing_links
ON public.taqadi_filing_jobs;
CREATE TRIGGER trg_hydrate_and_guard_taqadi_filing_links
BEFORE INSERT OR UPDATE OF company_id, contract_id, legal_case_id,
  lawsuit_preparation_id, source_document_id, payload
ON public.taqadi_filing_jobs
FOR EACH ROW EXECUTE FUNCTION public.hydrate_and_guard_taqadi_filing_links_v1();

REVOKE ALL ON FUNCTION public.hydrate_and_guard_taqadi_filing_links_v1()
FROM PUBLIC, anon, authenticated;

-- Existing conflicts cannot be resolved by filename, plate, upload time or
-- name-only OCR. Quarantine every ambiguous candidate and request a fresh,
-- directly verified copy instead of selecting one by guesswork.
DO $quarantine$
DECLARE
  v_conflict record;
BEGIN
  FOR v_conflict IN
    SELECT document.company_id, document.contract_id
    FROM public.contract_documents document
    WHERE document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active'
    GROUP BY document.company_id, document.contract_id
    HAVING count(*) > 1
  LOOP
    UPDATE public.contract_documents document
    SET legal_evidence_state = 'quarantined',
        ocr_review_reason = concat_ws(
          '; ',
          NULLIF(document.ocr_review_reason, ''),
          'AMBIGUOUS_MULTIPLE_ACTIVE_MATCHED_DOCUMENTS'
        ),
        updated_at = now()
    WHERE document.company_id = v_conflict.company_id
      AND document.contract_id = v_conflict.contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active';

    PERFORM public.enqueue_missing_contract_pdf_request_v1(
      v_conflict.company_id,
      v_conflict.contract_id,
      'identity_mismatch',
      NULL
    );
  END LOOP;
END;
$quarantine$;

COMMENT ON COLUMN public.taqadi_filing_jobs.lawsuit_preparation_id IS
  'Direct company/contract-scoped preparation frozen for this filing job.';
COMMENT ON COLUMN public.taqadi_filing_jobs.source_document_id IS
  'Direct active identity-matched signed-contract evidence frozen for this filing job.';

COMMIT;
