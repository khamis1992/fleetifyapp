-- Disable correction and restore signed evidence immutability. Retain history,
-- original files and their storage protections when any correction has occurred.
DROP FUNCTION IF EXISTS public.process_contract_document_orientation_v1(uuid,uuid,uuid,uuid,text,uuid,text,integer[],text,text,bigint);
CREATE OR REPLACE FUNCTION public.guard_signed_contract_evidence_integrity_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_expected_name text;
  v_extracted_name text;
  v_customer_name_ar text;
  v_customer_name_en text;
  v_customer_company_name_ar text;
  v_customer_company_name_en text;
  v_expected_id text;
  v_extracted_id text;
  v_customer_id text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.document_type IN ('signed_contract', 'signed_contract_image')
     AND (
       OLD.company_id IS DISTINCT FROM NEW.company_id
       OR OLD.contract_id IS DISTINCT FROM NEW.contract_id
       OR OLD.file_path IS DISTINCT FROM NEW.file_path
       OR OLD.document_type IS DISTINCT FROM NEW.document_type
     ) THEN
    RAISE EXCEPTION 'SIGNED_CONTRACT_EVIDENCE_IMMUTABLE: upload a new evidence row and verify it independently'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.document_type NOT IN ('signed_contract', 'signed_contract_image') THEN
    RETURN NEW;
  END IF;

  IF NULLIF(BTRIM(NEW.file_path), '') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.contract_documents other
    WHERE other.company_id = NEW.company_id
      AND other.id IS DISTINCT FROM NEW.id
      AND other.file_path = NEW.file_path
      AND other.document_type IN ('signed_contract', 'signed_contract_image')
      AND other.contract_id IS DISTINCT FROM NEW.contract_id
  ) THEN
    RAISE EXCEPTION 'SIGNED_CONTRACT_FILE_REUSED_ACROSS_CONTRACTS'
      USING ERRCODE = '23505';
  END IF;

  IF NEW.legal_identity_match_status <> 'matched'
     OR (
       TG_OP = 'UPDATE'
       AND OLD.legal_identity_match_status = 'matched'
       AND OLD.legal_identity_expected_name IS NOT DISTINCT FROM NEW.legal_identity_expected_name
       AND OLD.legal_identity_extracted_name IS NOT DISTINCT FROM NEW.legal_identity_extracted_name
       AND OLD.legal_identity_expected_id IS NOT DISTINCT FROM NEW.legal_identity_expected_id
       AND OLD.legal_identity_extracted_id IS NOT DISTINCT FROM NEW.legal_identity_extracted_id
     ) THEN
    RETURN NEW;
  END IF;

  IF NEW.contract_id IS NULL
     OR NULLIF(BTRIM(NEW.file_path), '') IS NULL
     OR NEW.legal_identity_checked_at IS NULL THEN
    RAISE EXCEPTION 'SIGNED_CONTRACT_MATCH_REQUIRES_DIRECT_FILE_AND_CHECK_TIMESTAMP'
      USING ERRCODE = '23514';
  END IF;

  SELECT customer.*
  INTO v_customer
  FROM public.contracts contract
  JOIN public.customers customer
    ON customer.id = contract.customer_id
   AND customer.company_id = contract.company_id
  WHERE contract.id = NEW.contract_id
    AND contract.company_id = NEW.company_id;

  IF v_customer.id IS NULL THEN
    RAISE EXCEPTION 'SIGNED_CONTRACT_CUSTOMER_NOT_FOUND'
      USING ERRCODE = '23503';
  END IF;

  v_expected_name := public.normalize_legal_party_name_v1(NEW.legal_identity_expected_name);
  v_extracted_name := public.normalize_legal_party_name_v1(NEW.legal_identity_extracted_name);
  v_customer_name_ar := public.normalize_legal_party_name_v1(
    concat_ws(' ', v_customer.first_name_ar, v_customer.last_name_ar)
  );
  v_customer_name_en := public.normalize_legal_party_name_v1(
    concat_ws(' ', v_customer.first_name, v_customer.last_name)
  );
  v_customer_company_name_ar := public.normalize_legal_party_name_v1(
    v_customer.company_name_ar
  );
  v_customer_company_name_en := public.normalize_legal_party_name_v1(
    v_customer.company_name
  );
  v_expected_id := pg_catalog.regexp_replace(translate(COALESCE(NEW.legal_identity_expected_id, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '[[:space:]‎‏؜-]', '', 'g');
  v_extracted_id := pg_catalog.regexp_replace(translate(COALESCE(NEW.legal_identity_extracted_id, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '[[:space:]‎‏؜-]', '', 'g');
  v_customer_id := pg_catalog.regexp_replace(translate(COALESCE(v_customer.national_id, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '[[:space:]‎‏؜-]', '', 'g');

  IF NOT (
    (
      v_expected_id ~ '^[0-9]{11}$'
      AND v_expected_id = v_extracted_id
      AND v_customer_id ~ '^[0-9]{11}$'
      AND v_expected_id = v_customer_id
    )
    OR
    (
      v_expected_name <> ''
      AND NOT (v_expected_id ~ '^[0-9]{11}$' AND v_extracted_id ~ '^[0-9]{11}$' AND v_expected_id <> v_extracted_id)
      AND v_expected_name = v_extracted_name
      AND (
        v_expected_name = v_customer_name_ar
        OR v_expected_name = v_customer_name_en
        OR v_expected_name = v_customer_company_name_ar
        OR v_expected_name = v_customer_company_name_en
      )
    )
  ) THEN
    RAISE EXCEPTION 'SIGNED_CONTRACT_IDENTITY_NOT_EXACT'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$
;
-- History is intentionally retained for audit and access to originals.
