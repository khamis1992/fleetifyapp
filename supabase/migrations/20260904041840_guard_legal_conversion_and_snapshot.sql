-- Pending: depends on canonical completion and system review. No migration-time DML.
BEGIN;
DO $baseline$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('convert_contract_to_legal_collection_v2','uuid,uuid,text,text,text,boolean,text,uuid','fe4d133302804c1b4ca1dedc6f2f1927','legacy_conversion_v2'),
    ('freeze_legal_claim_snapshot_v1','uuid,uuid,uuid,text,date,text,uuid[],uuid','de5d6ce330f9a4049a12f3c69988416c','legacy_freeze_v1')
  ) x(name,args,hash,backup) LOOP
    IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.'||r.name||'('||r.args||')')) IS DISTINCT FROM r.hash THEN
      RAISE EXCEPTION 'Legal conversion/snapshot function % changed since audit',r.name;
    END IF;
    EXECUTE replace(pg_get_functiondef(to_regprocedure('public.'||r.name||'('||r.args||')')),
      'public.'||r.name||'(', 'legal_claim_internal.'||r.backup||'(');
    EXECUTE format('REVOKE ALL ON FUNCTION legal_claim_internal.%I(%s) FROM PUBLIC,anon,authenticated,service_role',r.backup,r.args);
  END LOOP;
  IF to_regprocedure('legal_claim_internal.auto_verify_review_v2(uuid,uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Install canonical system review before conversion';
  END IF;
END;
$baseline$;

CREATE FUNCTION legal_claim_internal.freeze_claim_v2(
  p_company_id uuid,p_contract_id uuid,p_case_id uuid,p_snapshot_type text,p_as_of_date date,
  p_claim_scope text,p_excluded_invoice_ids uuid[],p_actor_id uuid
) RETURNS public.legal_claim_snapshots LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $freeze$
DECLARE
  v_actor uuid;
  v_scope text:=coalesce(nullif(btrim(p_claim_scope),''),'full_outstanding');
  v_statement jsonb;
  v_snapshot public.legal_claim_snapshots%ROWTYPE;
  v_version integer;
  v_amount numeric;
  v_count integer;
BEGIN
  v_actor:=legal_claim_internal.authorize_readiness_completion_v1(p_company_id,p_contract_id,p_actor_id);
  IF (p_snapshot_type IN ('transfer','filing','initial_judgment','manual_review')) IS NOT TRUE
    OR v_scope NOT IN ('full_outstanding','traffic_violations_only') OR p_as_of_date IS NULL
    OR NOT isfinite(p_as_of_date) OR p_as_of_date>(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN
    RAISE EXCEPTION 'Invalid claim snapshot type, scope or date' USING ERRCODE='22023';
  END IF;
  IF p_snapshot_type<>'manual_review' AND p_case_id IS NULL THEN
    RAISE EXCEPTION 'This snapshot requires a linked legal case' USING ERRCODE='22023';
  END IF;
  IF p_case_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.legal_cases lc JOIN public.contracts c ON c.id=lc.contract_id AND c.company_id=lc.company_id
    WHERE lc.id=p_case_id AND lc.company_id=p_company_id AND lc.contract_id=p_contract_id
      AND lc.client_id=c.customer_id AND coalesce(nullif(btrim(lc.claim_scope),''),'full_outstanding')=v_scope
  ) THEN
    RAISE EXCEPTION 'Legal case customer or scope does not match this contract' USING ERRCODE='P0001',HINT='LEGAL_EXISTING_CASE_CONTEXT_MISMATCH';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text||':legal-claim-snapshot:'||p_contract_id::text,0));
  IF public.check_contract_has_verified_signed_lease_v1(p_company_id,p_contract_id) IS NOT TRUE
    OR public.check_contract_identity_verified_v1(p_company_id,p_contract_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Current signed contract and identity evidence are required'
      USING ERRCODE='P0001',HINT='LEGAL_VERIFIED_EVIDENCE_REQUIRED';
  END IF;
  IF array_position(p_excluded_invoice_ids,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Excluded invoice IDs cannot be null' USING ERRCODE='22023';
  END IF;
  v_statement:=public.calculate_legal_claim_statement_v4(p_company_id,p_contract_id,p_as_of_date,v_scope,p_excluded_invoice_ids);
  v_amount:=(v_statement->>'total')::numeric;
  v_count:=(v_statement->>'violation_count')::integer;
  IF v_statement->>'calculation_source' IS DISTINCT FROM 'canonical_recorded_rows_v5'
    OR v_amount IS NULL OR v_amount<0 OR v_amount::text IN ('NaN','Infinity','-Infinity')
    OR v_count IS NULL OR v_count<0 OR jsonb_typeof(v_statement->'violations_proof_ready') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'Canonical claim calculation is incomplete' USING ERRCODE='P0001';
  END IF;
  IF v_count>0 AND v_statement->'violations_proof_ready' IS DISTINCT FROM 'true'::jsonb THEN
    RAISE EXCEPTION 'Traffic proof is required before freezing this claim'
      USING ERRCODE='P0001',HINT='LEGAL_TRAFFIC_PROOF_REQUIRED';
  END IF;
  IF p_snapshot_type IN ('transfer','filing') AND v_amount<=0 THEN
    RAISE EXCEPTION 'لا توجد مطالبة مالية متبقية لإنشاء أو رفع الدعوى'
      USING ERRCODE='P0001',HINT='LEGAL_NO_OUTSTANDING_CLAIM';
  END IF;
  SELECT coalesce(max(s.version),0)+1 INTO v_version FROM public.legal_claim_snapshots s
    WHERE s.company_id=p_company_id AND s.contract_id=p_contract_id AND s.case_id IS NOT DISTINCT FROM p_case_id AND s.snapshot_type=p_snapshot_type;
  INSERT INTO public.legal_claim_snapshots(company_id,contract_id,case_id,snapshot_type,version,claim_scope,
    as_of_date,cutoff_date,vehicle_custody,contract_status,total_amount,breakdown,created_by)
  VALUES(p_company_id,p_contract_id,p_case_id,p_snapshot_type,v_version,v_scope,p_as_of_date,(v_statement->>'cutoff_date')::date,
    CASE WHEN v_statement->>'vehicle_custody' IN ('with_defendant','returned') THEN v_statement->>'vehicle_custody' ELSE 'unknown' END,
    coalesce(v_statement->>'contract_status','unknown'),v_amount,v_statement,v_actor) RETURNING * INTO v_snapshot;
  RETURN v_snapshot;
END;
$freeze$;
REVOKE ALL ON FUNCTION legal_claim_internal.freeze_claim_v2(uuid,uuid,uuid,text,date,text,uuid[],uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION legal_claim_internal.freeze_claim_v2(uuid,uuid,uuid,text,date,text,uuid[],uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.freeze_legal_claim_snapshot_v1(
  p_company_id uuid,p_contract_id uuid,p_case_id uuid,p_snapshot_type text,p_as_of_date date,p_claim_scope text,
  p_excluded_invoice_ids uuid[] DEFAULT ARRAY[]::uuid[],p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_claim_snapshots LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $facade$ SELECT * FROM legal_claim_internal.freeze_claim_v2(p_company_id,p_contract_id,p_case_id,p_snapshot_type,p_as_of_date,p_claim_scope,p_excluded_invoice_ids,p_actor_id); $facade$;

-- Keep the audited operational conversion implementation, changing only exact
-- source anchors. Refuse an unknown body instead of loosely patching financial SQL.
DO $conversion$
DECLARE v_sql text; r record;
BEGIN
  v_sql:=replace(pg_get_functiondef('legal_claim_internal.legacy_conversion_v2(uuid,uuid,text,text,text,boolean,text,uuid)'::regprocedure),
    'legal_claim_internal.legacy_conversion_v2(', 'legal_claim_internal.convert_collection_v3(');
  FOR r IN SELECT * FROM (VALUES
    ($old$BEGIN
  IF v_actor IS NULL THEN$old$,
     $new$BEGIN
  v_actor:=legal_claim_internal.authorize_readiness_completion_v1(p_company_id,p_contract_id,p_actor_id);
  IF v_actor IS NULL THEN$new$),
    ($old$  SELECT * INTO v_case
  FROM public.legal_cases legal_case$old$,
     $new$  IF (SELECT count(*) FROM public.legal_cases lc WHERE lc.company_id=p_company_id AND lc.contract_id=p_contract_id
    AND lower(coalesce(lc.case_status,'')) IN ('open','active','pending','on_hold','under_review'))>1 THEN
    RAISE EXCEPTION 'Multiple active cases need reconciliation' USING ERRCODE='P0001',HINT='LEGAL_EXISTING_CASE_CONTEXT_MISMATCH';
  END IF;
  SELECT * INTO v_case
  FROM public.legal_cases legal_case$new$),
    ($old$  IF FOUND THEN
    RETURN JSONB_BUILD_OBJECT($old$,
     $new$  IF FOUND THEN
    IF v_case.client_id IS DISTINCT FROM v_contract.customer_id OR coalesce(nullif(btrim(v_case.claim_scope),''),'full_outstanding') IS DISTINCT FROM v_scope THEN
      RAISE EXCEPTION 'Existing case customer or scope does not match the request' USING ERRCODE='P0001',HINT='LEGAL_EXISTING_CASE_CONTEXT_MISMATCH';
    END IF;
    RETURN JSONB_BUILD_OBJECT('reused_existing_case',true,'claim_value_source','existing_case_record',$new$),
    ($old$    AND COALESCE((operation.operation_details ->> 'ready')::boolean, false)
  ORDER BY operation.performed_at DESC$old$,
     $new$  ORDER BY operation.performed_at DESC NULLS LAST, operation.id DESC$new$),
    ($old$  IF NOT v_preserve_contract THEN$old$,
     $new$  -- Both operational and preserved-status paths must pass current-source review.
  SELECT r.request_snapshot INTO v_review FROM public.auto_verify_legal_transfer_review_v1(p_company_id,p_contract_id,v_actor) r;
  IF (v_review->>'claim_amount')::numeric<=0 THEN
    RAISE EXCEPTION 'لا توجد مطالبة مالية متبقية للتحويل' USING ERRCODE='P0001',HINT='LEGAL_NO_OUTSTANDING_CLAIM';
  END IF;
  IF NOT v_preserve_contract THEN$new$),
    ($old$      CURRENT_DATE,
      v_actor,$old$,
     $new$      NULL,
      v_actor,$new$),
    ($old$  v_statement := public.calculate_legal_claim_statement_v4(
    p_company_id,
    p_contract_id,
    ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date),
    v_scope,
    v_excluded_invoice_ids
  );$old$,
     $new$  -- One authoritative final snapshot supplies case value, return value and audit.
  SELECT * INTO v_snapshot FROM public.freeze_legal_claim_snapshot_v1(
    p_company_id,p_contract_id,v_case_id,'transfer',(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date,
    v_scope,v_excluded_invoice_ids,v_actor);
  v_statement:=v_snapshot.breakdown;$new$),
    ($old$  SELECT * INTO v_snapshot
  FROM public.freeze_legal_claim_snapshot_v1(
    p_company_id,
    p_contract_id,
    v_case_id,
    'transfer',
    ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date),
    v_scope,
    v_excluded_invoice_ids,
    v_actor
  );$old$,
     $new$  -- Snapshot already created above; do not independently calculate twice.$new$)
  ) x(old_text,new_text) LOOP
    IF length(v_sql)-length(replace(v_sql,r.old_text,''))<>length(r.old_text) THEN
      RAISE EXCEPTION 'Expected one conversion source anchor: %',left(r.old_text,100);
    END IF;
    v_sql:=replace(v_sql,r.old_text,r.new_text);
  END LOOP;
  EXECUTE v_sql;
END;
$conversion$;
REVOKE ALL ON FUNCTION legal_claim_internal.convert_collection_v3(uuid,uuid,text,text,text,boolean,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION legal_claim_internal.convert_collection_v3(uuid,uuid,text,text,text,boolean,text,uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_collection_v2(
  p_company_id uuid,p_contract_id uuid,p_notes text,p_priority text,p_case_type text,p_vehicle_returned boolean,p_claim_scope text,p_actor_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $facade$ SELECT legal_claim_internal.convert_collection_v3(p_company_id,p_contract_id,p_notes,p_priority,p_case_type,p_vehicle_returned,p_claim_scope,p_actor_id); $facade$;
REVOKE ALL ON FUNCTION public.convert_contract_to_legal_collection_v2(uuid,uuid,text,text,text,boolean,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.freeze_legal_claim_snapshot_v1(uuid,uuid,uuid,text,date,text,uuid[],uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_collection_v2(uuid,uuid,text,text,text,boolean,text,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.freeze_legal_claim_snapshot_v1(uuid,uuid,uuid,text,date,text,uuid[],uuid) TO authenticated,service_role;
COMMIT;
