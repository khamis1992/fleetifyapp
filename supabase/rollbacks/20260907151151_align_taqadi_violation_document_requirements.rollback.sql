-- Restore the prior package validation rule; no financial or case records are changed.
BEGIN;
CREATE OR REPLACE FUNCTION public.validate_taqadi_filing_payload_v1_pre_failure_containment(p_company_id uuid, p_contract_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  v_violation_count integer := 0;
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

  SELECT COUNT(*)
  INTO v_violation_count
  FROM public.penalties penalty
  WHERE penalty.company_id = p_company_id
    AND penalty.contract_id = p_contract_id
    AND lower(COALESCE(penalty.status, '')) NOT IN ('cancelled', 'canceled', 'deleted')
    AND lower(COALESCE(penalty.payment_status, '')) <> 'paid';

  IF v_violation_count > 0 AND NOT EXISTS (
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

  IF v_violation_count > 0 AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_documents) document
    WHERE document ->> 'key' = 'violationsEvidence'
      AND COALESCE((document ->> 'ready')::boolean, false)
      AND NULLIF(document ->> 'url', '') IS NOT NULL
  ) THEN
    v_missing := array_append(v_missing, 'documents.violationsEvidence');
  END IF;

  RETURN jsonb_build_object(
    'ready', cardinality(v_missing) = 0,
    'missing', to_jsonb(v_missing),
    'violation_count', v_violation_count
  );
END;
$function$
;
COMMIT;
