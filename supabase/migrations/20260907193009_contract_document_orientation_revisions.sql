CREATE TABLE public.contract_document_orientation_revisions (
  request_id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.contract_documents(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  transaction_id bigint NOT NULL DEFAULT txid_current(),
  previous_revision text NOT NULL,
  previous_file_path text NOT NULL,
  corrected_file_path text NOT NULL UNIQUE,
  rotations integer[] NOT NULL,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  output_sha256 text NOT NULL CHECK (output_sha256 ~ '^[a-f0-9]{64}$'),
  previous_document jsonb NOT NULL,
  CHECK (cardinality(rotations) BETWEEN 1 AND 50 AND rotations <@ ARRAY[0,90,180,270])
);
CREATE INDEX contract_document_orientation_history_idx ON public.contract_document_orientation_revisions(company_id,document_id,created_at DESC);
CREATE INDEX contract_document_orientation_original_idx ON public.contract_document_orientation_revisions(previous_file_path);
ALTER TABLE public.contract_document_orientation_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contract_document_orientation_revisions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.contract_document_orientation_revisions TO authenticated;
GRANT ALL ON public.contract_document_orientation_revisions TO service_role;
CREATE POLICY orientation_history_company ON public.contract_document_orientation_revisions
FOR SELECT TO authenticated USING (company_id=public.get_user_company((SELECT auth.uid())));

-- Existing signed-document immutability remains in force except for a server
-- rotation whose provenance was inserted in this very transaction.
DO $patch$
DECLARE v_definition text; v_old text := 'OR OLD.file_path IS DISTINCT FROM NEW.file_path';
BEGIN
  v_definition := pg_get_functiondef('public.guard_signed_contract_evidence_integrity_v1()'::regprocedure);
  IF position(v_old IN v_definition)=0 THEN RAISE EXCEPTION 'Signed-document guard changed; review orientation migration'; END IF;
  v_definition := replace(v_definition,v_old,$replacement$OR (OLD.file_path IS DISTINCT FROM NEW.file_path AND NOT (
         current_user = 'service_role' AND EXISTS (
           SELECT 1 FROM public.contract_document_orientation_revisions revision
           WHERE revision.company_id=OLD.company_id AND revision.contract_id=OLD.contract_id
             AND revision.document_id=OLD.id AND revision.previous_file_path=OLD.file_path
             AND revision.corrected_file_path=NEW.file_path AND revision.transaction_id=txid_current()
         )
       ))$replacement$);
  EXECUTE v_definition;
END;
$patch$;

CREATE FUNCTION public.process_contract_document_orientation_v1(
  p_company_id uuid,p_contract_id uuid,p_document_id uuid,p_actor_id uuid,
  p_expected_revision text DEFAULT NULL,p_request_id uuid DEFAULT NULL,
  p_new_path text DEFAULT NULL,p_rotations integer[] DEFAULT NULL,
  p_source_sha256 text DEFAULT NULL,p_output_sha256 text DEFAULT NULL,p_file_size bigint DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE
  v_doc public.contract_documents%ROWTYPE;
  v_history public.contract_document_orientation_revisions%ROWTYPE;
  v_revision text;
  v_blocked boolean;
BEGIN
  IF current_user <> 'service_role' THEN RAISE EXCEPTION 'Server-only operation' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id=p_actor_id
    AND p.company_id=p_company_id AND COALESCE(p.is_active,true) AND (
      p.role::text IN ('super_admin','admin','company_admin','manager','legal','sales_agent')
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=p_actor_id AND r.company_id=p_company_id
        AND r.role::text IN ('super_admin','admin','company_admin','manager','legal','sales_agent'))
    )) THEN RAISE EXCEPTION 'تصحيح المستندات متاح للمسؤولين المخولين في الشركة' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.contracts WHERE id=p_contract_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'العقد غير متاح' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_doc FROM public.contract_documents WHERE id=p_document_id
    AND contract_id=p_contract_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'المستند غير مرتبط بالعقد' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NOT NULL THEN
    SELECT * INTO v_history FROM public.contract_document_orientation_revisions WHERE request_id=p_request_id;
    IF FOUND THEN
      IF v_history.document_id<>p_document_id OR v_history.company_id<>p_company_id
        OR v_history.actor_id<>p_actor_id OR v_history.previous_revision IS DISTINCT FROM p_expected_revision
        OR v_history.rotations IS DISTINCT FROM p_rotations
        OR (p_source_sha256 IS NOT NULL AND v_history.source_sha256 IS DISTINCT FROM p_source_sha256)
      THEN RAISE EXCEPTION 'معرف الحفظ مستخدم لعملية أخرى' USING ERRCODE='22023'; END IF;
      RETURN jsonb_build_object('saved',true,'replayed',true,'request_id',p_request_id,'file_path',v_doc.file_path);
    END IF;
  END IF;
  IF NULLIF(v_doc.file_path,'') IS NULL OR NOT (v_doc.mime_type='application/pdf' OR lower(v_doc.file_path) LIKE '%.pdf')
    THEN RAISE EXCEPTION 'التصحيح متاح لملفات PDF المحفوظة في العقد' USING ERRCODE='22023'; END IF;
  IF v_doc.legal_evidence_state IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'هذه نسخة مؤرشفة أو معزولة؛ افتح النسخة الحالية للتصحيح' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.legal_cases WHERE company_id=p_company_id AND contract_id=p_contract_id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.taqadi_filing_jobs WHERE company_id=p_company_id AND contract_id=p_contract_id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.lawsuit_preparations WHERE company_id=p_company_id AND contract_id=p_contract_id ORDER BY id FOR UPDATE;
  v_blocked := EXISTS(SELECT 1 FROM public.legal_cases WHERE company_id=p_company_id AND contract_id=p_contract_id
    AND (filing_date IS NOT NULL OR NULLIF(btrim(case_reference),'') IS NOT NULL
      OR workflow_stage NOT IN ('preparation','cancelled','closed')))
    OR EXISTS(SELECT 1 FROM public.lawsuit_preparations WHERE company_id=p_company_id AND contract_id=p_contract_id
      AND (submitted_at IS NOT NULL OR registered_at IS NOT NULL OR status IN ('submitted','registered')
        OR NULLIF(btrim(taqadi_case_number),'') IS NOT NULL OR NULLIF(btrim(taqadi_reference_number),'') IS NOT NULL))
    OR EXISTS(SELECT 1 FROM public.taqadi_filing_jobs WHERE company_id=p_company_id AND contract_id=p_contract_id
      AND (status<>'cancelled' OR NULLIF(error_code,'') LIKE '%SUBMISSION_UNCERTAIN%'
        OR COALESCE(result,'{}'::jsonb) <> '{}'::jsonb));
  IF v_blocked AND (p_request_id IS NOT NULL OR p_new_path IS NOT NULL) THEN RAISE EXCEPTION 'المستند مرتبط بطلب رفع قائم أو دعوى مسجلة؛ أوقف الطلب غير المرفوع قبل التصحيح، وتبقى النسخة المسجلة محفوظة' USING ERRCODE='23514'; END IF;
  v_revision := md5(to_jsonb(v_doc)::text);
  IF p_expected_revision IS NOT NULL AND p_expected_revision<>v_revision THEN
    RAISE EXCEPTION 'تغير المستند أثناء المراجعة؛ أغلق التصحيح وافتحه مجددًا' USING ERRCODE='40001'; END IF;
  IF p_new_path IS NULL THEN
    RETURN jsonb_build_object('saved',false,'can_save',NOT v_blocked,'revision',v_revision,'file_path',v_doc.file_path,
      'document_name',v_doc.document_name,'file_size',v_doc.file_size,
      'history',COALESCE((SELECT jsonb_agg(jsonb_build_object('created_at',h.created_at,
        'previous_file_path',h.previous_file_path,'corrected_file_path',h.corrected_file_path,'rotations',h.rotations)
        ORDER BY h.created_at DESC) FROM public.contract_document_orientation_revisions h
        WHERE h.document_id=p_document_id AND h.company_id=p_company_id),'[]'::jsonb));
  END IF;
  IF p_request_id IS NULL OR p_expected_revision IS NULL OR p_rotations IS NULL
    OR cardinality(p_rotations) NOT BETWEEN 1 AND 50 OR array_position(p_rotations,NULL) IS NOT NULL
    OR NOT (p_rotations <@ ARRAY[0,90,180,270]) OR NOT EXISTS(SELECT 1 FROM unnest(p_rotations) angle WHERE angle<>0)
    OR p_file_size IS NULL OR p_file_size NOT BETWEEN 1 AND 26214400
    OR p_source_sha256 IS NULL OR p_output_sha256 IS NULL
    OR p_new_path NOT LIKE p_contract_id::text||'/orientation/'||p_document_id::text||'/'||p_request_id::text||'/%'
    OR p_new_path LIKE '%..%' OR p_new_path !~ '\.pdf$'
  THEN RAISE EXCEPTION 'بيانات تصحيح الاتجاه غير صالحة' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='contract-documents' AND name=p_new_path)
    THEN RAISE EXCEPTION 'لم يتم حفظ النسخة المصححة في التخزين' USING ERRCODE='22023'; END IF;
  INSERT INTO public.contract_document_orientation_revisions(request_id,company_id,contract_id,document_id,
    actor_id,previous_revision,previous_file_path,corrected_file_path,rotations,source_sha256,output_sha256,previous_document)
  VALUES(p_request_id,p_company_id,p_contract_id,p_document_id,p_actor_id,v_revision,v_doc.file_path,
    p_new_path,p_rotations,p_source_sha256,p_output_sha256,to_jsonb(v_doc));
  UPDATE public.contract_documents SET file_path=p_new_path,file_size=p_file_size,mime_type='application/pdf',updated_at=clock_timestamp()
    WHERE id=p_document_id AND company_id=p_company_id;
  UPDATE public.lawsuit_preparations SET contract_copy_url=replace(contract_copy_url,v_doc.file_path,p_new_path),updated_at=clock_timestamp()
    WHERE company_id=p_company_id AND contract_id=p_contract_id AND source_document_id=p_document_id
      AND contract_copy_url LIKE '%/storage/v1/object/public/contract-documents/%';
  INSERT INTO public.audit_logs(company_id,user_id,action,resource_type,resource_id,old_values,new_values,metadata)
  VALUES(p_company_id,p_actor_id,'contract_document_orientation_corrected','contract_documents',p_document_id,
    jsonb_build_object('file_path',v_doc.file_path),jsonb_build_object('file_path',p_new_path),
    jsonb_build_object('request_id',p_request_id,'rotations',p_rotations,'source_sha256',p_source_sha256,'output_sha256',p_output_sha256));
  RETURN jsonb_build_object('saved',true,'replayed',false,'request_id',p_request_id,'file_path',p_new_path);
END;
$fn$;
REVOKE ALL ON FUNCTION public.process_contract_document_orientation_v1(uuid,uuid,uuid,uuid,text,uuid,text,integer[],text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_contract_document_orientation_v1(uuid,uuid,uuid,uuid,text,uuid,text,integer[],text,text,bigint) TO service_role;

CREATE SCHEMA IF NOT EXISTS document_orientation_private;
REVOKE ALL ON SCHEMA document_orientation_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA document_orientation_private TO authenticated;
CREATE FUNCTION document_orientation_private.is_preserved_path(p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT auth.uid() IS NULL OR EXISTS (SELECT 1 FROM public.contract_document_orientation_revisions
    WHERE previous_file_path=p_path OR corrected_file_path=p_path);
$fn$;
REVOKE ALL ON FUNCTION document_orientation_private.is_preserved_path(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION document_orientation_private.is_preserved_path(text) TO authenticated;
CREATE POLICY preserve_orientation_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (bucket_id<>'contract-documents' OR NOT document_orientation_private.is_preserved_path(name))
  WITH CHECK (bucket_id<>'contract-documents' OR NOT document_orientation_private.is_preserved_path(name));
CREATE POLICY preserve_orientation_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
  USING (bucket_id<>'contract-documents' OR NOT document_orientation_private.is_preserved_path(name));
