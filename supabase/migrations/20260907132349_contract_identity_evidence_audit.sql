-- Versioned identity decisions, optimistic concurrency and an append-only audit trail.
ALTER TABLE public.contract_documents
  ADD COLUMN legal_identity_engine_version text,
  ADD COLUMN legal_identity_details jsonb;

CREATE TABLE public.contract_identity_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  document_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_id uuid,
  method text NOT NULL,
  previous_result jsonb NOT NULL,
  result jsonb NOT NULL
);
CREATE INDEX contract_identity_assessments_document_idx
  ON public.contract_identity_assessments(company_id, document_id, recorded_at DESC);
ALTER TABLE public.contract_identity_assessments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contract_identity_assessments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.contract_identity_assessments TO authenticated;
GRANT ALL ON public.contract_identity_assessments TO service_role;
CREATE POLICY company_read_identity_assessments ON public.contract_identity_assessments
  FOR SELECT TO authenticated USING (company_id = public.get_user_company((SELECT auth.uid())));

CREATE FUNCTION public.contract_identity_revision_v2(p_company_id uuid, p_document_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT md5(jsonb_build_object(
    'document', d.id, 'file', d.file_path, 'type', d.document_type, 'state', d.legal_evidence_state,
    'checkedAt', d.legal_identity_checked_at, 'status', d.legal_identity_match_status,
    'customer', c.customer_id, 'nationalId', cu.national_id,
    'firstName', cu.first_name_ar, 'lastName', cu.last_name_ar
  )::text)
  FROM public.contract_documents d
  JOIN public.contracts c ON c.id=d.contract_id AND c.company_id=d.company_id
  JOIN public.customers cu ON cu.id=c.customer_id AND cu.company_id=c.company_id
  WHERE d.company_id=p_company_id AND d.id=p_document_id;
$fn$;
REVOKE ALL ON FUNCTION public.contract_identity_revision_v2(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contract_identity_revision_v2(uuid,uuid) TO service_role;

CREATE FUNCTION public.record_contract_identity_assessment_v2(
  p_company_id uuid, p_document_id uuid, p_revision text, p_assessment jsonb
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_doc public.contract_documents%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_id text;
BEGIN
  SELECT c.* INTO v_contract FROM public.contracts c
    JOIN public.contract_documents d ON d.contract_id=c.id AND d.company_id=c.company_id
    WHERE d.id=p_document_id AND d.company_id=p_company_id FOR UPDATE OF c;
  IF NOT FOUND THEN RAISE EXCEPTION 'IDENTITY_DOCUMENT_NOT_FOUND'; END IF;
  SELECT * INTO v_doc FROM public.contract_documents WHERE id=p_document_id AND company_id=p_company_id FOR UPDATE;
  SELECT * INTO v_customer FROM public.customers WHERE id=v_contract.customer_id AND company_id=p_company_id FOR SHARE;
  IF p_revision IS NULL OR p_revision IS DISTINCT FROM public.contract_identity_revision_v2(p_company_id,p_document_id)
    THEN RAISE EXCEPTION 'IDENTITY_CONTEXT_CHANGED: تغير المستند أو بيانات العميل أثناء الفحص؛ أعد الفحص'; END IF;
  IF p_assessment->>'status' IS NULL OR p_assessment->>'status' NOT IN ('matched','mismatch','unverified')
    OR p_assessment->>'engineVersion' IS DISTINCT FROM '2026-09-07.2'
    THEN RAISE EXCEPTION 'INVALID_IDENTITY_ASSESSMENT'; END IF;
  v_id := regexp_replace(translate(coalesce(v_customer.national_id,''),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[[:space:]‎‏؜-]','','g');
  IF p_assessment->>'status'='matched' AND (
    v_id !~ '^[0-9]{11}$' OR p_assessment->>'expectedId' IS DISTINCT FROM v_id
    OR p_assessment->>'extractedId' IS DISTINCT FROM v_id
    OR p_assessment->>'reasonCode' IS DISTINCT FROM 'exact_identity_number'
  ) THEN RAISE EXCEPTION 'IDENTITY_MATCH_REQUIRES_COMPLETE_CUSTOMER_ID'; END IF;
  UPDATE public.contract_documents SET
    legal_identity_match_status=p_assessment->>'status',
    legal_identity_expected_name=p_assessment->>'expectedName',
    legal_identity_extracted_name=p_assessment->>'extractedName',
    legal_identity_expected_id=p_assessment->>'expectedId',
    legal_identity_extracted_id=p_assessment->>'extractedId',
    legal_identity_match_reason=p_assessment->>'reason',
    legal_identity_checked_at=clock_timestamp(),
    legal_identity_engine_version=p_assessment->>'engineVersion',
    legal_identity_details=(coalesce(p_assessment->'details','{}'::jsonb) || jsonb_build_object('contextRevision',p_revision,'customerId',v_customer.id,'filePath',v_doc.file_path)),
    legal_identity_expires_at=NULL
  WHERE id=p_document_id AND company_id=p_company_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.record_contract_identity_assessment_v2(uuid,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_contract_identity_assessment_v2(uuid,uuid,text,jsonb) TO service_role;

CREATE FUNCTION public.audit_contract_identity_v2() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_keys text[] := ARRAY['legal_identity_match_status','legal_identity_expected_name','legal_identity_extracted_name','legal_identity_expected_id','legal_identity_extracted_id','legal_identity_match_reason','legal_identity_checked_at','legal_identity_engine_version','legal_identity_details'];
BEGIN
  IF NEW.document_type NOT IN ('signed_contract','signed_contract_image') THEN RETURN NEW; END IF;
  INSERT INTO public.contract_identity_assessments(company_id,contract_id,document_id,actor_id,method,previous_result,result)
  VALUES(NEW.company_id,NEW.contract_id,NEW.id,auth.uid(),
    CASE WHEN NEW.legal_identity_match_reason LIKE 'مطابقة يدوية معتمدة:%' THEN 'manual'
      WHEN NEW.legal_identity_engine_version IS NOT NULL THEN 'automated' ELSE 'legacy' END,
    (SELECT jsonb_object_agg(key,value) FROM jsonb_each(to_jsonb(OLD)) WHERE key=ANY(v_keys)),
    (SELECT jsonb_object_agg(key,value) FROM jsonb_each(to_jsonb(NEW)) WHERE key=ANY(v_keys)));
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.audit_contract_identity_v2() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_contract_identity_v2 AFTER UPDATE ON public.contract_documents
  FOR EACH ROW WHEN (OLD.legal_identity_checked_at IS DISTINCT FROM NEW.legal_identity_checked_at
    OR OLD.legal_identity_match_status IS DISTINCT FROM NEW.legal_identity_match_status)
  EXECUTE FUNCTION public.audit_contract_identity_v2();

-- A decision is about a particular customer snapshot, not a permanent property of a PDF.
CREATE FUNCTION public.invalidate_customer_contract_identity_v2() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  UPDATE public.contract_documents d SET legal_identity_match_status='unverified',
    legal_identity_match_reason='تغيرت بيانات هوية العميل بعد آخر فحص؛ يلزم إعادة المطابقة.',
    legal_identity_checked_at=clock_timestamp(), legal_identity_engine_version=NULL,
    legal_identity_details=jsonb_build_object('reasonCode','customer_identity_changed')
  FROM public.contracts c WHERE c.id=d.contract_id AND c.company_id=d.company_id
    AND c.customer_id=NEW.id AND c.company_id=NEW.company_id
    AND d.document_type IN ('signed_contract','signed_contract_image') AND d.legal_identity_match_status='matched';
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.invalidate_customer_contract_identity_v2() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER invalidate_customer_contract_identity_v2 AFTER UPDATE OF national_id,first_name_ar,last_name_ar ON public.customers
  FOR EACH ROW WHEN (OLD.national_id IS DISTINCT FROM NEW.national_id OR OLD.first_name_ar IS DISTINCT FROM NEW.first_name_ar OR OLD.last_name_ar IS DISTINCT FROM NEW.last_name_ar)
  EXECUTE FUNCTION public.invalidate_customer_contract_identity_v2();

CREATE FUNCTION public.invalidate_reassigned_contract_identity_v2() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  UPDATE public.contract_documents SET legal_identity_match_status='unverified',
    legal_identity_match_reason='تغير العميل المرتبط بالعقد؛ يلزم إعادة مطابقة المستند.',
    legal_identity_checked_at=clock_timestamp(),legal_identity_engine_version=NULL,
    legal_identity_details=jsonb_build_object('reasonCode','contract_customer_changed')
  WHERE contract_id=NEW.id AND company_id=NEW.company_id
    AND document_type IN ('signed_contract','signed_contract_image') AND legal_identity_match_status='matched';
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.invalidate_reassigned_contract_identity_v2() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER invalidate_reassigned_contract_identity_v2 AFTER UPDATE OF customer_id ON public.contracts
  FOR EACH ROW WHEN (OLD.customer_id IS DISTINCT FROM NEW.customer_id)
  EXECUTE FUNCTION public.invalidate_reassigned_contract_identity_v2();

-- Manual decisions retain their own explanation instead of displaying stale OCR details.
CREATE FUNCTION public.clear_replaced_identity_details_v2() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  IF NEW.legal_identity_details IS NOT DISTINCT FROM OLD.legal_identity_details THEN
    NEW.legal_identity_engine_version := NULL;
    NEW.legal_identity_details := NULL;
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.clear_replaced_identity_details_v2() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER clear_replaced_identity_details_v2 BEFORE UPDATE ON public.contract_documents
  FOR EACH ROW WHEN (OLD.legal_identity_checked_at IS DISTINCT FROM NEW.legal_identity_checked_at)
  EXECUTE FUNCTION public.clear_replaced_identity_details_v2();
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
$function$;
