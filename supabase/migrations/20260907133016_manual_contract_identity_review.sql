CREATE SCHEMA IF NOT EXISTS legal_evidence_private;
REVOKE ALL ON SCHEMA legal_evidence_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA legal_evidence_private TO authenticated;

CREATE TABLE legal_evidence_private.identity_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.contract_documents(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  reviewer_profile_id uuid NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 10 AND 2000),
  observed_identity_number text NOT NULL CHECK (observed_identity_number ~ '^[0-9]{11}$'),
  revision text NOT NULL,
  customer_snapshot jsonb NOT NULL,
  old_values jsonb NOT NULL,
  approved_values jsonb NOT NULL,
  UNIQUE(company_id, document_id, revision)
);
ALTER TABLE legal_evidence_private.identity_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON legal_evidence_private.identity_reviews FROM PUBLIC, anon, authenticated;

CREATE FUNCTION legal_evidence_private.review_contract_identity(
  p_company_id uuid, p_contract_id uuid, p_document_id uuid,
  p_revision text, p_observed_id text, p_reason text, p_confirmed boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_document public.contract_documents%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_customer_snapshot jsonb;
  v_revision text;
  v_observed text;
  v_expected text;
  v_values jsonb;
  v_review legal_evidence_private.identity_reviews%ROWTYPE;
  v_reviewed_at timestamptz := clock_timestamp();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'يلزم تسجيل الدخول' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_profile FROM public.profiles p
  WHERE p.user_id=auth.uid() AND p.company_id=p_company_id AND COALESCE(p.is_active,true)
  LIMIT 1;
  IF v_profile.id IS NULL OR NOT (
    COALESCE(v_profile.role IN ('super_admin','admin','company_admin','manager','legal'),false)
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid()
      AND r.company_id=p_company_id AND r.role::text IN ('super_admin','admin','company_admin','manager','legal'))
  ) THEN RAISE EXCEPTION 'المطابقة اليدوية متاحة للإدارة والمسؤول القانوني في الشركة فقط' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_contract FROM public.contracts c
  WHERE c.id=p_contract_id AND c.company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'العقد غير متاح في الشركة الحالية' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_document FROM public.contract_documents d
  WHERE d.id=p_document_id AND d.contract_id=p_contract_id AND d.company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'المستند غير مرتبط بهذا العقد' USING ERRCODE='22023'; END IF;
  IF v_document.document_type NOT IN ('signed_contract','signed_contract_image')
    OR v_document.legal_evidence_state <> 'active' OR NULLIF(btrim(v_document.file_path),'') IS NULL
  THEN RAISE EXCEPTION 'اختر نسخة عقد موقعة ونشطة تحتوي على ملف للمعاينة' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_customer FROM public.customers cu
  WHERE cu.id=v_contract.customer_id AND cu.company_id=p_company_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'بيانات العميل غير متاحة' USING ERRCODE='22023'; END IF;
  v_customer_snapshot := jsonb_build_object('id',v_customer.id,'national_id',v_customer.national_id,
    'first_name',v_customer.first_name,'last_name',v_customer.last_name,
    'first_name_ar',v_customer.first_name_ar,'last_name_ar',v_customer.last_name_ar,
    'contract_number',v_contract.contract_number,'vehicle_id',v_contract.vehicle_id,'start_date',v_contract.start_date);
  v_revision := md5(jsonb_build_object('document',to_jsonb(v_document),'customer',v_customer_snapshot)::text);
  IF p_revision IS NULL THEN
    RETURN jsonb_build_object('revision',v_revision,'document_name',v_document.document_name,
      'file_path',v_document.file_path,'mime_type',v_document.mime_type,
      'contract_number',v_contract.contract_number,
      'customer_name',COALESCE(NULLIF(btrim(concat_ws(' ',v_customer.first_name_ar,v_customer.last_name_ar)),''),concat_ws(' ',v_customer.first_name,v_customer.last_name)),
      'national_id',v_customer.national_id,'status',v_document.legal_identity_match_status,
      'extracted_name',v_document.legal_identity_extracted_name,'extracted_id',v_document.legal_identity_extracted_id,
      'previous_reason',v_document.legal_identity_match_reason);
  END IF;
  SELECT * INTO v_review FROM legal_evidence_private.identity_reviews r
  WHERE r.company_id=p_company_id AND r.document_id=p_document_id AND r.revision=p_revision;
  IF FOUND AND v_review.actor_id=auth.uid() AND v_review.customer_snapshot=v_customer_snapshot
    AND to_jsonb(v_document) @> v_review.approved_values
  THEN RETURN jsonb_build_object('status','matched','review_id',v_review.id,'replayed',true); END IF;
  IF p_revision IS DISTINCT FROM v_revision THEN
    RAISE EXCEPTION 'تغيرت بيانات العقد أو المستند؛ أغلق النافذة وافتح المطابقة مجددًا' USING ERRCODE='40001';
  END IF;
  IF p_confirmed IS DISTINCT FROM true OR length(btrim(COALESCE(p_reason,''))) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'أكد معاينة العقد وأدخل سبب المطابقة من 10 إلى 2000 حرف' USING ERRCODE='22023';
  END IF;
  v_observed := regexp_replace(translate(COALESCE(p_observed_id,''),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[[:space:]-]','','g');
  v_expected := regexp_replace(translate(COALESCE(v_customer.national_id,''),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789'),'[[:space:]-]','','g');
  IF v_observed !~ '^[0-9]{11}$' OR v_expected !~ '^[0-9]{11}$' OR v_observed<>v_expected THEN
    RAISE EXCEPTION 'الرقم المقروء لا يطابق الرقم الشخصي للعميل؛ راجع الملف أو صحح سجل العميل أولًا' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.contract_documents d WHERE d.company_id=p_company_id
    AND d.contract_id=p_contract_id AND d.id<>p_document_id AND d.legal_evidence_state='active'
    AND d.document_type IN ('signed_contract','signed_contract_image') AND d.legal_identity_match_status='matched')
  THEN RAISE EXCEPTION 'توجد نسخة موقعة أخرى معتمدة؛ احسم النسخة المعتمدة قبل المطابقة' USING ERRCODE='22023'; END IF;
  v_values := jsonb_build_object('legal_identity_match_status','matched',
    'legal_identity_expected_id',v_expected,'legal_identity_extracted_id',v_observed,
    'legal_identity_match_reason','مطابقة يدوية معتمدة: '||btrim(p_reason),
    'legal_identity_checked_at',v_reviewed_at,'verified_by',v_profile.id,'verified_at',v_reviewed_at);
  INSERT INTO legal_evidence_private.identity_reviews(company_id,contract_id,document_id,actor_id,
    reviewer_profile_id,reviewed_at,reason,observed_identity_number,revision,customer_snapshot,old_values,approved_values)
  VALUES(p_company_id,p_contract_id,p_document_id,auth.uid(),v_profile.id,v_reviewed_at,btrim(p_reason),
    v_observed,v_revision,v_customer_snapshot,to_jsonb(v_document),v_values) RETURNING * INTO v_review;
  UPDATE public.contract_documents SET legal_identity_match_status='matched',
    legal_identity_expected_id=v_expected,legal_identity_extracted_id=v_observed,
    legal_identity_match_reason=v_values->>'legal_identity_match_reason',legal_identity_checked_at=v_reviewed_at,
    verified_by=v_profile.id,verified_at=v_reviewed_at
  WHERE id=p_document_id AND company_id=p_company_id;
  INSERT INTO public.audit_logs(company_id,user_id,action,resource_type,resource_id,old_values,new_values,metadata)
  VALUES(p_company_id,auth.uid(),'manual_contract_identity_review','contract_documents',p_document_id,
    to_jsonb(v_document),v_values,jsonb_build_object('review_id',v_review.id,'reason',btrim(p_reason),'source','human_document_review'));
  RETURN jsonb_build_object('status','matched','review_id',v_review.id,'replayed',false);
END;
$function$;
REVOKE ALL ON FUNCTION legal_evidence_private.review_contract_identity(uuid,uuid,uuid,text,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION legal_evidence_private.review_contract_identity(uuid,uuid,uuid,text,text,text,boolean) TO authenticated;

CREATE FUNCTION public.review_contract_document_identity_v1(
  p_company_id uuid,p_contract_id uuid,p_document_id uuid,
  p_revision text DEFAULT NULL,p_observed_id text DEFAULT NULL,p_reason text DEFAULT NULL,p_confirmed boolean DEFAULT false
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $function$
  SELECT legal_evidence_private.review_contract_identity(p_company_id,p_contract_id,p_document_id,p_revision,p_observed_id,p_reason,p_confirmed);
$function$;
REVOKE ALL ON FUNCTION public.review_contract_document_identity_v1(uuid,uuid,uuid,text,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_contract_document_identity_v1(uuid,uuid,uuid,text,text,text,boolean) TO authenticated;

-- A later OCR response may not replace an explicit human decision. A new
-- review must have its own matching, protected approval record first.
CREATE FUNCTION legal_evidence_private.protect_manual_identity_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM legal_evidence_private.identity_reviews r
    WHERE r.document_id=OLD.id AND r.company_id=OLD.company_id AND to_jsonb(OLD) @> r.approved_values)
    AND NOT EXISTS (SELECT 1 FROM legal_evidence_private.identity_reviews r
      WHERE r.document_id=NEW.id AND r.company_id=NEW.company_id AND to_jsonb(NEW) @> r.approved_values)
  THEN RAISE EXCEPTION 'MANUAL_IDENTITY_REVIEW_PROTECTED: يلزم إجراء مطابقة يدوية جديدة لتغيير قرار الاعتماد' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION legal_evidence_private.protect_manual_identity_review() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_00_protect_manual_identity_review BEFORE UPDATE ON public.contract_documents
FOR EACH ROW EXECUTE FUNCTION legal_evidence_private.protect_manual_identity_review();
