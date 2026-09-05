-- Pending: depends on 20260904024349 canonical claim readers. No migration-time DML.
BEGIN;

DO $baseline$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('complete_legal_transfer_readiness_v1_pre_pdf_request_agent','uuid,uuid,jsonb,uuid','bce8a7542ebc1b3a5cd5585c3dae5cd1','legacy_completion_bottom_v1'),
    ('complete_legal_transfer_readiness_with_scope_v1','uuid,uuid,jsonb,text,uuid','d1c3dc92014e40cc0e292daf87b2eb78','legacy_completion_scope_v1'),
    ('complete_legal_transfer_readiness_v2','uuid,uuid,jsonb,text,uuid','5284fa39784cfe5d3bb512d784bdacdd','legacy_completion_v2')
  ) x(name,args,hash,backup) LOOP
    IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.'||r.name||'('||r.args||')')) IS DISTINCT FROM r.hash THEN
      RAISE EXCEPTION 'Completion function % changed since audit; rebase before applying',r.name;
    END IF;
    EXECUTE replace(pg_get_functiondef(to_regprocedure('public.'||r.name||'('||r.args||')')),
      'public.'||r.name||'(', 'legal_claim_internal.'||r.backup||'(');
    EXECUTE format('REVOKE ALL ON FUNCTION legal_claim_internal.%I(%s) FROM PUBLIC,anon,authenticated,service_role',r.backup,r.args);
  END LOOP;
END;
$baseline$;

-- Shared guard is invoker and private. Both authorized gateways call it before
-- calculations, audit writes or existing document-request automation.
CREATE FUNCTION legal_claim_internal.authorize_readiness_completion_v1(
  p_company_id uuid,p_contract_id uuid,p_actor_id uuid
) RETURNS uuid LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=''
AS $authorize$
DECLARE v_actor uuid:=coalesce(auth.uid(),p_actor_id);
BEGIN
  IF coalesce(auth.jwt()->>'role','')<>'service_role' AND (
    auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id
    OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid()
      AND p.company_id=p_company_id AND p.is_active IS TRUE)
  ) THEN
    RAISE EXCEPTION 'Not authorized to complete this company contract' USING ERRCODE='42501';
  END IF;
  IF v_actor IS NULL OR (auth.uid() IS NOT NULL AND p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM auth.uid()) THEN
    RAISE EXCEPTION 'Missing or mismatched actor identity' USING ERRCODE='42501';
  END IF;
  IF public.can_prepare_contract_for_legal_v1(p_company_id,p_contract_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized to complete this contract' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.contracts c WHERE c.id=p_contract_id AND c.company_id=p_company_id) THEN
    RAISE EXCEPTION 'Contract not found in this company' USING ERRCODE='42501';
  END IF;
  RETURN v_actor;
END;
$authorize$;

CREATE FUNCTION legal_claim_internal.prepare_readiness_snapshot_v3(
  p_company_id uuid,p_contract_id uuid,p_payload jsonb,p_actor_id uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $persist$
DECLARE
  v_actor uuid;
  v_scope text;
  v_excluded uuid[];
  v_statement jsonb;
  v_saved jsonb;
  v_amount numeric;
  v_count integer;
  v_proof boolean;
  v_included_balance numeric;
  v_excluded_balance numeric;
BEGIN
  v_actor:=legal_claim_internal.authorize_readiness_completion_v1(p_company_id,p_contract_id,p_actor_id);
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Readiness payload must be an object' USING ERRCODE='22023';
  END IF;
  v_scope:=coalesce(nullif(btrim(p_payload->>'claim_scope'),''),'full_outstanding');
  IF v_scope NOT IN ('full_outstanding','traffic_violations_only') THEN
    RAISE EXCEPTION 'Unsupported legal claim scope' USING ERRCODE='22023';
  END IF;
  IF p_payload->'financial_reviewed' IS DISTINCT FROM 'true'::jsonb
    OR p_payload->'violations_reviewed' IS DISTINCT FROM 'true'::jsonb THEN
    RAISE EXCEPTION 'Financial and traffic reviews must be explicitly completed' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(p_payload->'vehicle_returned') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'Vehicle custody must be explicitly confirmed' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(coalesce(p_payload->'excluded_invoice_ids','[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Excluded invoice IDs must be an array' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(array_agg(DISTINCT value::uuid ORDER BY value::uuid),ARRAY[]::uuid[]) INTO v_excluded
  FROM jsonb_array_elements_text(coalesce(p_payload->'excluded_invoice_ids','[]'::jsonb));
  IF array_position(v_excluded,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Excluded invoice IDs cannot be null' USING ERRCODE='22023';
  END IF;

  -- Same advisory protocol as conversion; not a claim that all receipt writers
  -- participate in this lock. Conversion must still calculate current amounts.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text||':legal-contract:'||p_contract_id::text,0));
  PERFORM 1 FROM public.contracts c WHERE c.id=p_contract_id AND c.company_id=p_company_id FOR UPDATE;
  IF public.check_contract_has_verified_signed_lease_v1(p_company_id,p_contract_id) IS NOT TRUE
    OR public.check_contract_identity_verified_v1(p_company_id,p_contract_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'نسخة العقد المطابقة والتحقق من الهوية مطلوبان قبل اعتماد الجاهزية'
      USING ERRCODE='P0001',HINT='LEGAL_VERIFIED_EVIDENCE_REQUIRED';
  END IF;

  v_statement:=public.calculate_legal_claim_statement_v4(p_company_id,p_contract_id,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date,v_scope,v_excluded);
  IF v_statement->>'calculation_source' IS DISTINCT FROM 'canonical_recorded_rows_v5' THEN
    RAISE EXCEPTION 'Canonical claim reader must be installed before readiness completion' USING ERRCODE='P0001';
  END IF;
  IF cardinality(v_excluded)>0 THEN
    IF jsonb_typeof(p_payload->'excluded_invoices') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Document a reason for every excluded invoice' USING ERRCODE='22023';
    END IF;
    IF EXISTS(SELECT 1 FROM unnest(v_excluded) id WHERE
      NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_statement->'excluded_invoices') i WHERE i->>'id'=id::text)
      OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'excluded_invoices') i
        WHERE i->>'invoice_id'=id::text AND jsonb_typeof(i->'reason')='string' AND nullif(btrim(i->>'reason'),'') IS NOT NULL)
    ) THEN
      RAISE EXCEPTION 'Excluded invoices changed or their reasons are missing; review the claim again' USING ERRCODE='22023';
    END IF;
  END IF;
  v_amount:=(v_statement->>'total')::numeric;
  v_count:=(v_statement->>'violation_count')::integer;
  v_proof:=(v_statement->>'violations_proof_ready')::boolean;
  IF v_amount IS NULL OR v_amount<0 OR v_amount::text IN ('NaN','Infinity','-Infinity')
    OR v_count IS NULL OR v_count<0 OR v_proof IS NULL THEN
    RAISE EXCEPTION 'Canonical claim calculation is incomplete' USING ERRCODE='P0001';
  END IF;
  IF v_count>0 AND v_proof IS NOT TRUE THEN
    RAISE EXCEPTION 'يوجد مبلغ مخالفات على العميل دون إثبات؛ أرفق الإثبات قبل الاعتماد'
      USING ERRCODE='P0001',HINT='LEGAL_TRAFFIC_PROOF_REQUIRED';
  END IF;
  IF v_scope='traffic_violations_only' AND v_amount<=0 THEN
    RAISE EXCEPTION 'No evidenced unpaid customer traffic liability remains' USING ERRCODE='P0001';
  END IF;

  SELECT coalesce(sum((i->>'amount')::numeric),0) INTO v_included_balance
    FROM jsonb_array_elements(v_statement->'included_invoices') i;
  SELECT coalesce(sum((i->>'amount')::numeric),0) INTO v_excluded_balance
    FROM jsonb_array_elements(v_statement->'excluded_invoices') i;
  -- Preserve notes/custody declarations, but never preserve client-supplied
  -- financial totals, receipt totals or invoice audit objects as authoritative.
  v_saved:=(p_payload-'completed_payments'-'excluded_invoices') || jsonb_build_object(
    'ready',true,'readiness_source','canonical_readiness_completion_v3',
    'company_id',p_company_id,'contract_id',p_contract_id,
    'customer_id',(SELECT c.customer_id FROM public.contracts c WHERE c.company_id=p_company_id AND c.id=p_contract_id),
    'vehicle_id',(SELECT to_jsonb(c)->>'vehicle_id' FROM public.contracts c WHERE c.company_id=p_company_id AND c.id=p_contract_id),
    'claim_scope',v_scope,'claim_amount',v_amount,'claim_statement',v_statement,
    'claim_components',v_statement->'components',
    'included_invoice_balance',v_included_balance,'excluded_invoice_balance',v_excluded_balance,
    'accounting_invoice_balance',v_included_balance+v_excluded_balance,
    'included_invoice_ids',coalesce((SELECT jsonb_agg(i->>'id') FROM jsonb_array_elements(v_statement->'included_invoices') i),'[]'::jsonb),
    'excluded_invoice_ids',to_jsonb(v_excluded),'excluded_invoices',v_statement->'excluded_invoices',
    'reported_exclusion_notes',p_payload->'excluded_invoices',
    'signed_contract_ready',true,'identity_verified',true,'violation_count',v_count,
    'violation_total',v_statement->'components'->'traffic_violations',
    'violation_proof_ready',v_count=0 OR v_proof,
    'vehicle_custody_at_transfer',CASE WHEN (p_payload->>'vehicle_returned')::boolean THEN 'returned' ELSE 'with_defendant' END,
    'completed_at',CURRENT_TIMESTAMP);
  RETURN v_saved;
END;
$persist$;

-- Shared validation/calculation above also serves automatic re-verification.
-- Only this command writes the explicit readiness-completion audit record.
CREATE FUNCTION legal_claim_internal.persist_readiness_v3(
  p_company_id uuid,p_contract_id uuid,p_payload jsonb,p_actor_id uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $persist_command$
DECLARE v_saved jsonb;
BEGIN
  v_saved:=legal_claim_internal.prepare_readiness_snapshot_v3(p_company_id,p_contract_id,p_payload,p_actor_id);
  INSERT INTO public.contract_operations_log(company_id,contract_id,operation_type,operation_details,notes,performed_by,performed_at)
    VALUES(p_company_id,p_contract_id,'legal_transfer_readiness_completed',v_saved,
      'اكتملت مراجعة جاهزية العقد وفق المطالبة المحسوبة من السجلات الفعلية',coalesce(auth.uid(),p_actor_id),clock_timestamp());
  RETURN jsonb_build_object('ready',true,'claim_amount',v_saved->'claim_amount',
    'violation_count',v_saved->'violation_count','claim_statement',v_saved->'claim_statement');
END;
$persist_command$;

-- Keep the established signed-document request/blocked-response wrappers, but
-- scope dispatch must never sum raw penalties or overwrite canonical amounts.
CREATE FUNCTION legal_claim_internal.dispatch_readiness_completion_v3(
  p_company_id uuid,p_contract_id uuid,p_payload jsonb,p_claim_scope text,p_actor_id uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $dispatch$
DECLARE v_scope text:=coalesce(nullif(btrim(p_claim_scope),''),'full_outstanding');
BEGIN
  PERFORM legal_claim_internal.authorize_readiness_completion_v1(p_company_id,p_contract_id,p_actor_id);
  IF v_scope NOT IN ('full_outstanding','traffic_violations_only') OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid readiness scope or payload' USING ERRCODE='22023';
  END IF;
  RETURN public.complete_legal_transfer_readiness_v1(p_company_id,p_contract_id,
    p_payload||jsonb_build_object('claim_scope',v_scope),p_actor_id);
END;
$dispatch$;

REVOKE ALL ON FUNCTION legal_claim_internal.authorize_readiness_completion_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION legal_claim_internal.prepare_readiness_snapshot_v3(uuid,uuid,jsonb,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION legal_claim_internal.persist_readiness_v3(uuid,uuid,jsonb,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION legal_claim_internal.dispatch_readiness_completion_v3(uuid,uuid,jsonb,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION legal_claim_internal.persist_readiness_v3(uuid,uuid,jsonb,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION legal_claim_internal.dispatch_readiness_completion_v3(uuid,uuid,jsonb,text,uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.complete_legal_transfer_readiness_v1_pre_pdf_request_agent(
  p_company_id uuid,p_contract_id uuid,p_payload jsonb,p_actor_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $facade$ SELECT legal_claim_internal.persist_readiness_v3(p_company_id,p_contract_id,p_payload,p_actor_id); $facade$;
CREATE OR REPLACE FUNCTION public.complete_legal_transfer_readiness_with_scope_v1(
  p_company_id uuid,p_contract_id uuid,p_payload jsonb,p_claim_scope text,p_actor_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $facade$ SELECT legal_claim_internal.dispatch_readiness_completion_v3(p_company_id,p_contract_id,p_payload,p_claim_scope,p_actor_id); $facade$;
CREATE OR REPLACE FUNCTION public.complete_legal_transfer_readiness_v2(
  p_company_id uuid,p_contract_id uuid,p_payload jsonb,p_claim_scope text,p_actor_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $facade$ SELECT public.complete_legal_transfer_readiness_with_scope_v1(p_company_id,p_contract_id,p_payload,p_claim_scope,p_actor_id); $facade$;
REVOKE ALL ON FUNCTION public.complete_legal_transfer_readiness_v1_pre_pdf_request_agent(uuid,uuid,jsonb,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.complete_legal_transfer_readiness_with_scope_v1(uuid,uuid,jsonb,text,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.complete_legal_transfer_readiness_v2(uuid,uuid,jsonb,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_legal_transfer_readiness_v1_pre_pdf_request_agent(uuid,uuid,jsonb,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.complete_legal_transfer_readiness_with_scope_v1(uuid,uuid,jsonb,text,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.complete_legal_transfer_readiness_v2(uuid,uuid,jsonb,text,uuid) TO authenticated,service_role;
COMMIT;
