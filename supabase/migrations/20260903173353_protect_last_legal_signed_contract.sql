-- A legal case must never lose its final signed-contract evidence through the
-- generic document delete endpoint. Uploading a verified replacement first
-- keeps the normal correction workflow available.

BEGIN;

CREATE OR REPLACE FUNCTION public.protect_last_legal_signed_contract_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_contract record;
  v_replacement record;
  v_link_id uuid;
  v_has_open_legal_case boolean := false;
  v_has_replacement boolean := false;
  v_removes_signed_evidence boolean := false;
BEGIN
  IF lower(COALESCE(OLD.document_type, '')) NOT IN (
    'signed_contract',
    'signed_contract_image'
  ) THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_removes_signed_evidence := true;
  ELSE
    v_removes_signed_evidence :=
      NEW.company_id IS DISTINCT FROM OLD.company_id
      OR NEW.contract_id IS DISTINCT FROM OLD.contract_id
      OR lower(COALESCE(NEW.document_type, '')) NOT IN (
        'signed_contract',
        'signed_contract_image'
      )
      OR NEW.file_path IS DISTINCT FROM OLD.file_path;
  END IF;

  IF NOT v_removes_signed_evidence THEN
    RETURN NEW;
  END IF;

  -- DELETE already owns OLD's row lock. Do not wait on a second document or
  -- parent: another deletion may own that row and need this one. NOWAIT makes
  -- the losing operation retryable instead of relying on a stale EXISTS read.
  -- A confirmed alias is evidence for its canonical contract as well.
  PERFORM link.id
  FROM public.contract_document_canonical_links link
  WHERE link.document_id = OLD.id
    AND link.company_id = OLD.company_id
    AND link.source_contract_id = OLD.contract_id
    AND link.link_status = 'confirmed'
  FOR SHARE NOWAIT;

  FOR v_contract IN
    SELECT contract.id, lower(COALESCE(contract.status::text, '')) AS status
    FROM public.contracts contract
    WHERE contract.company_id = OLD.company_id
      AND (contract.id = OLD.contract_id OR EXISTS (
        SELECT 1 FROM public.contract_document_canonical_links link
        WHERE link.document_id = OLD.id
          AND link.company_id = OLD.company_id
          AND link.source_contract_id = OLD.contract_id
          AND link.canonical_contract_id = contract.id
          AND link.link_status = 'confirmed'
      ))
    ORDER BY contract.id
    FOR NO KEY UPDATE NOWAIT
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.legal_cases legal_case
      WHERE legal_case.company_id = OLD.company_id
        AND legal_case.contract_id = v_contract.id
        -- Unknown or new nonterminal states must not silently bypass protection.
        AND lower(COALESCE(legal_case.case_status, '')) NOT IN ('closed', 'cancelled')
    ) INTO v_has_open_legal_case;

    IF v_contract.status <> 'under_legal_procedure' AND NOT v_has_open_legal_case THEN
      CONTINUE;
    END IF;

    v_has_replacement := false;
    FOR v_replacement IN
      SELECT replacement.id, replacement.contract_id
      FROM public.contract_documents replacement
      WHERE replacement.company_id = OLD.company_id
        AND replacement.id <> OLD.id
        AND replacement.document_type IN ('signed_contract', 'signed_contract_image')
        AND replacement.legal_identity_match_status = 'matched'
        AND replacement.legal_evidence_state = 'active'
        AND replacement.superseded_by_document_id IS NULL
        AND replacement.legal_identity_checked_at IS NOT NULL
        AND (replacement.legal_identity_expires_at IS NULL
          OR replacement.legal_identity_expires_at > pg_catalog.clock_timestamp())
        AND NULLIF(btrim(replacement.file_path), '') IS NOT NULL
        -- A second metadata row for the same bytes is not an independent backup.
        AND btrim(replacement.file_path) IS DISTINCT FROM btrim(OLD.file_path)
        AND (replacement.contract_id = v_contract.id OR EXISTS (
          SELECT 1 FROM public.contract_document_canonical_links link
          WHERE link.document_id = replacement.id
            AND link.company_id = OLD.company_id
            AND link.source_contract_id = replacement.contract_id
            AND link.canonical_contract_id = v_contract.id
            AND link.link_status = 'confirmed'
        ))
      ORDER BY replacement.id
      FOR SHARE OF replacement NOWAIT
    LOOP
      IF v_replacement.contract_id = v_contract.id THEN
        v_has_replacement := true;
      ELSE
        -- Lock/recheck the link too: metadata alone cannot freeze its routing.
        SELECT link.id INTO v_link_id
        FROM public.contract_document_canonical_links link
        WHERE link.document_id = v_replacement.id
          AND link.company_id = OLD.company_id
          AND link.source_contract_id = v_replacement.contract_id
          AND link.canonical_contract_id = v_contract.id
          AND link.link_status = 'confirmed'
        FOR SHARE NOWAIT;
        v_has_replacement := FOUND;
      END IF;
      EXIT WHEN v_has_replacement;
    END LOOP;

    IF NOT v_has_replacement THEN
      RAISE EXCEPTION 'SIGNED_CONTRACT_REPLACEMENT_REQUIRED'
        USING ERRCODE = '23514',
          DETAIL = 'Upload and verify an active replacement for every affected legal contract before removing this evidence.';
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION WHEN lock_not_available THEN
  RAISE EXCEPTION 'SIGNED_CONTRACT_EVIDENCE_BUSY'
    USING ERRCODE = '55P03',
      DETAIL = 'Evidence or its contract is being changed by another operation. Refresh and retry.';
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_last_legal_signed_contract
  ON public.contract_documents;
CREATE TRIGGER trg_protect_last_legal_signed_contract
BEFORE DELETE OR UPDATE OF document_type, file_path, contract_id, company_id
ON public.contract_documents
FOR EACH ROW
EXECUTE FUNCTION public.protect_last_legal_signed_contract_v1();

REVOKE ALL ON FUNCTION public.protect_last_legal_signed_contract_v1()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.protect_last_legal_signed_contract_v1() IS
'Requires a locked, active, identity-matched replacement before removing signed evidence from a direct or canonical legal contract. Does not validate storage bytes or preserve filed-package snapshots.';

COMMIT;
