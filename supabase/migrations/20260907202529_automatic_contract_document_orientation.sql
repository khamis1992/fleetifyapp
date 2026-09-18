-- Machine identity is explicit; never fabricate a human reviewer.
ALTER TABLE public.contract_document_orientation_revisions
  ALTER COLUMN actor_id DROP NOT NULL,
  ADD COLUMN agent_id text,
  ADD COLUMN agent_request_id text,
  ADD COLUMN orientation_evidence jsonb,
  ADD CONSTRAINT orientation_revision_actor CHECK (
    (actor_id IS NOT NULL AND agent_id IS NULL AND agent_request_id IS NULL)
    OR (actor_id IS NULL AND agent_id='contract-document-orientation-agent' AND agent_request_id IS NOT NULL)
  );

-- Null machine actors must not compare equal to an interactive request.
DO $patch$
DECLARE v_definition text;
BEGIN
  v_definition := pg_get_functiondef('public.process_contract_document_orientation_v1(uuid,uuid,uuid,uuid,text,uuid,text,integer[],text,text,bigint)'::regprocedure);
  IF position('v_history.actor_id<>p_actor_id' IN v_definition)=0 THEN RAISE EXCEPTION 'Review manual orientation RPC before migration'; END IF;
  EXECUTE replace(v_definition,'v_history.actor_id<>p_actor_id','v_history.actor_id IS DISTINCT FROM p_actor_id');
END;
$patch$;

CREATE TABLE public.contract_document_orientation_checks (
  document_id uuid PRIMARY KEY REFERENCES public.contract_documents(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  file_path text NOT NULL,
  source_fingerprint text NOT NULL,
  detector_version text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  status text NOT NULL CHECK(status IN ('upright','corrected','needs_review','protected','failed','human_reviewed')),
  page_count integer CHECK(page_count BETWEEN 1 AND 50),
  corrected_pages integer NOT NULL DEFAULT 0 CHECK(corrected_pages BETWEEN 0 AND 50),
  review_pages integer[] NOT NULL DEFAULT '{}',
  evidence jsonb NOT NULL DEFAULT '[]',
  reason text,
  retry_after timestamptz,
  attempt_count integer NOT NULL DEFAULT 1
);
CREATE INDEX contract_orientation_checks_company_status_idx
  ON public.contract_document_orientation_checks(company_id,status,checked_at DESC);
ALTER TABLE public.contract_document_orientation_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contract_document_orientation_checks FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.contract_document_orientation_checks TO authenticated;
GRANT ALL ON public.contract_document_orientation_checks TO service_role;
CREATE POLICY orientation_checks_company ON public.contract_document_orientation_checks
  FOR SELECT TO authenticated USING(company_id=public.get_user_company((SELECT auth.uid())));

INSERT INTO public.agent_safety_policies(agent_id,display_name,execution_mode,risk_level,
  conflict_group,max_runtime_seconds,minimum_confidence,evidence_policy,max_mutations_per_run,
  execution_ledger_enabled,requires_before_after,requires_postcondition,data_classification)
VALUES('contract-document-orientation-agent','فحص اتجاه مستندات العقود','auto_apply','high',
  'contract_document_orientation',900,1,
  '{"osd_min_score":20,"dual_scale_agreement":true,"upright_postcheck":true,"original_retained":true}',
  1,true,true,true,'restricted');

CREATE FUNCTION public.contract_orientation_candidates_v1(p_company_id uuid,p_limit integer DEFAULT 50,p_document_id uuid DEFAULT NULL)
RETURNS TABLE(document_id uuid,contract_id uuid,file_path text,source_fingerprint text,
  human_reviewed boolean,attempt_count integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
  SELECT d.id,d.contract_id,d.file_path,
    md5(jsonb_build_array(d.file_path,d.file_size,s.updated_at)::text),
    EXISTS(SELECT 1 FROM public.contract_document_orientation_revisions h
      WHERE h.document_id=d.id AND h.company_id=d.company_id AND h.corrected_file_path=d.file_path AND h.actor_id IS NOT NULL),
    COALESCE(c.attempt_count,0)
  FROM public.contract_documents d
  LEFT JOIN storage.objects s ON s.bucket_id='contract-documents' AND s.name=d.file_path
  LEFT JOIN public.contract_document_orientation_checks c ON c.document_id=d.id AND c.company_id=d.company_id
  WHERE d.company_id=p_company_id AND (p_document_id IS NULL OR d.id=p_document_id) AND d.document_type IN ('signed_contract','signed_contract_image')
    AND d.legal_evidence_state IN ('active','quarantined') AND d.superseded_by_document_id IS NULL
    AND NULLIF(d.file_path,'') IS NOT NULL AND (d.mime_type='application/pdf' OR lower(d.file_path) LIKE '%.pdf')
    AND (c.document_id IS NULL OR c.source_fingerprint<>md5(jsonb_build_array(d.file_path,d.file_size,s.updated_at)::text)
      OR c.detector_version<>'tesseract-osd-dual-scale-v1' OR c.retry_after<=clock_timestamp())
  ORDER BY c.checked_at NULLS FIRST,d.created_at,d.id LIMIT LEAST(GREATEST(p_limit,1),100);
$fn$;
REVOKE ALL ON FUNCTION public.contract_orientation_candidates_v1(uuid,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.contract_orientation_candidates_v1(uuid,integer,uuid) TO service_role;

-- Called by the worker before taking a lease, and inside each saving transaction.
CREATE FUNCTION public.assert_orientation_agent_enabled_v1(p_company_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
  IF current_user<>'service_role' OR p_company_id IS DISTINCT FROM '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
    OR NOT EXISTS(SELECT 1 FROM public.agent_safety_policies WHERE agent_id='contract-document-orientation-agent' AND enabled AND execution_mode='auto_apply')
    OR EXISTS(SELECT 1 FROM public.system_agent_controls WHERE company_id=p_company_id AND (NOT enabled OR paused OR kill_switch))
  THEN RAISE EXCEPTION 'ORIENTATION_AGENT_PAUSED_OR_DISABLED' USING ERRCODE='42501'; END IF;
END;
$fn$;
REVOKE ALL ON FUNCTION public.assert_orientation_agent_enabled_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assert_orientation_agent_enabled_v1(uuid) TO service_role;

CREATE FUNCTION public.process_automatic_contract_orientation_v1(
  p_company_id uuid,p_contract_id uuid,p_document_id uuid,p_actor_id uuid,
  p_expected_revision text DEFAULT NULL,p_request_id uuid DEFAULT NULL,
  p_new_path text DEFAULT NULL,p_rotations integer[] DEFAULT NULL,
  p_source_sha256 text DEFAULT NULL,p_output_sha256 text DEFAULT NULL,p_file_size bigint DEFAULT NULL,
  p_agent_request_id text DEFAULT NULL,p_evidence jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE
  v_doc public.contract_documents%ROWTYPE;
  v_history public.contract_document_orientation_revisions%ROWTYPE;
  v_revision text;
  v_blocked boolean;
BEGIN
  IF current_user <> 'service_role' THEN RAISE EXCEPTION 'Server-only operation' USING ERRCODE='42501'; END IF;
  PERFORM public.assert_orientation_agent_enabled_v1(p_company_id);
  IF p_actor_id IS NOT NULL OR p_agent_request_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.agent_invocation_leases l JOIN public.agent_execution_runs r
      ON r.company_id=l.company_id AND r.agent_id=l.agent_id AND r.request_id=l.request_id
    WHERE l.company_id=p_company_id AND l.agent_id='contract-document-orientation-agent'
      AND l.request_id=p_agent_request_id AND l.expires_at>clock_timestamp() AND r.status='running'
  ) THEN RAISE EXCEPTION 'ORIENTATION_AGENT_LEASE_REQUIRED' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.contracts WHERE id=p_contract_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'العقد غير متاح' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_doc FROM public.contract_documents WHERE id=p_document_id
    AND contract_id=p_contract_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'المستند غير مرتبط بالعقد' USING ERRCODE='42501'; END IF;
  IF v_doc.document_type NOT IN ('signed_contract','signed_contract_image') THEN
    RAISE EXCEPTION 'Automatic orientation is restricted to signed contract PDFs' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.contract_document_orientation_revisions h WHERE h.document_id=p_document_id
    AND h.company_id=p_company_id AND h.corrected_file_path=v_doc.file_path AND h.actor_id IS NOT NULL) THEN
    RAISE EXCEPTION 'HUMAN_REVIEWED_ORIENTATION_PRESERVED' USING ERRCODE='23514'; END IF;
  IF p_request_id IS NOT NULL THEN
    SELECT * INTO v_history FROM public.contract_document_orientation_revisions WHERE request_id=p_request_id;
    IF FOUND THEN
      IF v_history.document_id<>p_document_id OR v_history.company_id<>p_company_id
        OR v_history.actor_id IS NOT NULL OR v_history.agent_request_id IS DISTINCT FROM p_agent_request_id OR v_history.previous_revision IS DISTINCT FROM p_expected_revision
        OR v_history.rotations IS DISTINCT FROM p_rotations
        OR (p_source_sha256 IS NOT NULL AND v_history.source_sha256 IS DISTINCT FROM p_source_sha256)
      THEN RAISE EXCEPTION 'معرف الحفظ مستخدم لعملية أخرى' USING ERRCODE='22023'; END IF;
      RETURN jsonb_build_object('saved',true,'replayed',true,'request_id',p_request_id,'file_path',v_doc.file_path);
    END IF;
  END IF;
  IF NULLIF(v_doc.file_path,'') IS NULL OR NOT (v_doc.mime_type='application/pdf' OR lower(v_doc.file_path) LIKE '%.pdf')
    THEN RAISE EXCEPTION 'التصحيح متاح لملفات PDF المحفوظة في العقد' USING ERRCODE='22023'; END IF;
  IF v_doc.legal_evidence_state NOT IN ('active','quarantined') OR v_doc.superseded_by_document_id IS NOT NULL THEN
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
  IF jsonb_typeof(p_evidence) IS DISTINCT FROM 'array' OR jsonb_array_length(p_evidence)<>cardinality(p_rotations) THEN
    RAISE EXCEPTION 'ORIENTATION_PAGE_EVIDENCE_REQUIRED' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(p_rotations) WITH ORDINALITY a(angle,n)
    WHERE angle<>0 AND NOT COALESCE(
      (p_evidence->(n::integer-1)->>'page')::integer=n AND
      (p_evidence->(n::integer-1)->'first'->>'rotation')::integer=angle AND
      (p_evidence->(n::integer-1)->'second'->>'rotation')::integer=angle AND
      (p_evidence->(n::integer-1)->'first'->>'confidence')::numeric BETWEEN 20 AND 1000 AND
      (p_evidence->(n::integer-1)->'second'->>'confidence')::numeric BETWEEN 20 AND 1000 AND
      (p_evidence->(n::integer-1)->'verification'->>'rotation')::integer=0 AND
      (p_evidence->(n::integer-1)->'verification'->>'confidence')::numeric BETWEEN 20 AND 1000,false)) THEN
    RAISE EXCEPTION 'ORIENTATION_PAGE_EVIDENCE_NOT_VERIFIED' USING ERRCODE='22023'; END IF;
  -- Budget enforcement and mutation provenance share the PDF pointer transaction.
  IF (public.record_agent_mutation_v1(p_company_id,'contract-document-orientation-agent',p_agent_request_id,
    'correct_pdf_orientation','contract_documents',p_document_id::text,p_request_id::text,
    jsonb_build_object('file_path',v_doc.file_path),jsonb_build_object('file_path',p_new_path),
    jsonb_build_object('source_sha256',p_source_sha256,'output_sha256',p_output_sha256,'pages',p_evidence),true)->>'blocked')::boolean IS TRUE
  THEN RAISE EXCEPTION 'ORIENTATION_MUTATION_BUDGET_EXHAUSTED' USING ERRCODE='23514'; END IF;
  INSERT INTO public.contract_document_orientation_revisions(request_id,company_id,contract_id,document_id,
    actor_id,previous_revision,previous_file_path,corrected_file_path,rotations,source_sha256,output_sha256,previous_document,agent_id,agent_request_id,orientation_evidence)
  VALUES(p_request_id,p_company_id,p_contract_id,p_document_id,p_actor_id,v_revision,v_doc.file_path,
    p_new_path,p_rotations,p_source_sha256,p_output_sha256,to_jsonb(v_doc),'contract-document-orientation-agent',p_agent_request_id,p_evidence);
  UPDATE public.contract_documents SET file_path=p_new_path,file_size=p_file_size,mime_type='application/pdf',updated_at=clock_timestamp()
    WHERE id=p_document_id AND company_id=p_company_id;
  UPDATE public.lawsuit_preparations SET contract_copy_url=replace(contract_copy_url,v_doc.file_path,p_new_path),updated_at=clock_timestamp()
    WHERE company_id=p_company_id AND contract_id=p_contract_id AND source_document_id=p_document_id
      AND contract_copy_url LIKE '%/storage/v1/object/public/contract-documents/%';
  INSERT INTO public.audit_logs(company_id,user_id,action,resource_type,resource_id,old_values,new_values,metadata)
  VALUES(p_company_id,p_actor_id,'contract_document_orientation_corrected','contract_documents',p_document_id,
    jsonb_build_object('file_path',v_doc.file_path),jsonb_build_object('file_path',p_new_path),
    jsonb_build_object('request_id',p_request_id,'rotations',p_rotations,'source_sha256',p_source_sha256,'output_sha256',p_output_sha256,'agent_id','contract-document-orientation-agent','agent_request_id',p_agent_request_id));
  RETURN jsonb_build_object('saved',true,'replayed',false,'request_id',p_request_id,'file_path',p_new_path);
END;
$fn$;
REVOKE ALL ON FUNCTION public.process_automatic_contract_orientation_v1(uuid,uuid,uuid,uuid,text,uuid,text,integer[],text,text,bigint,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_automatic_contract_orientation_v1(uuid,uuid,uuid,uuid,text,uuid,text,integer[],text,text,bigint,text,jsonb) TO service_role;
