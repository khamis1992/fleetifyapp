-- Align package requirements with the canonical evidenced claim for every contract.
-- The public validator's company and signed-contract identity guards stay in place.
BEGIN;
CREATE OR REPLACE FUNCTION public.validate_taqadi_filing_payload_v1_pre_failure_containment(p_company_id uuid, p_contract_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  v_violation_count integer := 0;
  v_claim_statement jsonb;
  v_violations_required boolean := false;
  v_document jsonb;
  v_documents jsonb := COALESCE(p_payload -> 'documents', '[]'::jsonb);
  v_required_document_keys text[] := ARRAY[
    'memo',
    'claims',
    'docsList',
    'contract',
    'commercialRegister',
    'ibanCertificate',
    'representativeId'
  ];
  v_key text;
BEGIN
  IF NOT public.can_prepare_contract_for_legal_v1(p_company_id, p_contract_id) THEN
    RAISE EXCEPTION 'You are not authorized to prepare this contract for filing'
      USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(v_documents) IS DISTINCT FROM 'array' THEN
    v_missing := array_append(v_missing, 'documents');
    v_documents := '[]'::jsonb;
  END IF;

  IF NULLIF(BTRIM(COALESCE(p_payload #>> '{case,title}', '')), '') IS NULL THEN
    v_missing := array_append(v_missing, 'case.title');
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_payload #>> '{case,facts}', '')), '') IS NULL THEN
    v_missing := array_append(v_missing, 'case.facts');
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_payload #>> '{case,claims}', '')), '') IS NULL THEN
    v_missing := array_append(v_missing, 'case.claims');
  END IF;
  IF COALESCE(NULLIF(p_payload #>> '{case,amount}', '')::numeric, 0) <= 0 THEN
    v_missing := array_append(v_missing, 'case.amount');
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_payload #>> '{defendant,fullName}', '')), '') IS NULL THEN
    v_missing := array_append(v_missing, 'defendant.fullName');
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_payload #>> '{defendant,idNumber}', '')), '') IS NULL THEN
    v_missing := array_append(v_missing, 'defendant.idNumber');
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_payload #>> '{defendant,nationality}', '')), '') IS NULL THEN
    v_missing := array_append(v_missing, 'defendant.nationality');
  END IF;

  FOREACH v_key IN ARRAY v_required_document_keys LOOP
    SELECT document
    INTO v_document
    FROM jsonb_array_elements(v_documents) document
    WHERE document ->> 'key' = v_key
      AND COALESCE((document ->> 'ready')::boolean, false)
      AND (
        NULLIF(document ->> 'url', '') IS NOT NULL
        OR NULLIF(document ->> 'htmlContent', '') IS NOT NULL
      )
    LIMIT 1;

    IF v_document IS NULL THEN
      v_missing := array_append(v_missing, 'documents.' || v_key);
    END IF;
    v_document := NULL;
  END LOOP;

  -- Use the same server-owned claim engine as legal readiness. Outstanding
  -- penalties without official proof are excluded from a full rental claim.
  -- The browser cannot suppress required evidence by sending a zero count.
  v_claim_statement := public.calculate_legal_claim_statement_v4(
    p_company_id, p_contract_id,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date, NULL
  );
  v_violation_count := COALESCE((v_claim_statement ->> 'violation_count')::integer, 0);
  v_violations_required :=
    COALESCE((v_claim_statement #>> '{components,traffic_violations}')::numeric, 0) > 0
    OR COALESCE(v_claim_statement ->> 'claim_scope', '') = 'traffic_violations_only'
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_documents) document
      WHERE document ->> 'key' IN ('violations', 'violationsEvidence')
    );

  IF v_violations_required AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_documents) document
    WHERE document ->> 'key' = 'violations'
      AND COALESCE((document ->> 'ready')::boolean, false)
      AND (
        NULLIF(document ->> 'url', '') IS NOT NULL
        OR NULLIF(document ->> 'htmlContent', '') IS NOT NULL
      )
  ) THEN
    v_missing := array_append(v_missing, 'documents.violations');
  END IF;

  IF v_violations_required AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_documents) document
    WHERE document ->> 'key' = 'violationsEvidence'
      AND v_claim_statement -> 'violations_proof_ready' = 'true'::jsonb
      AND (
        NULLIF(document ->> 'sourceDocumentId', '') IS NULL
        OR EXISTS (
          SELECT 1 FROM public.contract_documents evidence
          WHERE evidence.id::text = document ->> 'sourceDocumentId'
            AND evidence.company_id = p_company_id
            AND evidence.contract_id = p_contract_id
            AND evidence.document_type = 'violations_proof'
            AND NULLIF(BTRIM(evidence.file_path), '') IS NOT NULL
        )
      )
      AND COALESCE((document ->> 'ready')::boolean, false)
      AND NULLIF(document ->> 'url', '') IS NOT NULL
  ) THEN
    v_missing := array_append(v_missing, 'documents.violationsEvidence');
  END IF;

  RETURN jsonb_build_object(
    'ready', cardinality(v_missing) = 0,
    'missing', to_jsonb(v_missing),
    'violation_count', v_violation_count,
    'violation_documents_required', v_violations_required
  );
END;
$function$
;
REVOKE ALL ON FUNCTION public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid, uuid, jsonb) TO authenticated, service_role;
COMMIT;
