-- Pending: requires canonical completion 20260904034603; no migration-time DML.
BEGIN;
DO $baseline$
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.auto_verify_legal_transfer_review_v1(uuid,uuid,uuid)'::regprocedure)
    IS DISTINCT FROM '107bd62565b43a6a7151a9f45ade1c86' THEN
    RAISE EXCEPTION 'Automatic legal review changed since audit; rebase before applying';
  END IF;
  IF to_regprocedure('legal_claim_internal.prepare_readiness_snapshot_v3(uuid,uuid,jsonb,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Install canonical readiness completion before automatic review';
  END IF;
  EXECUTE replace(pg_get_functiondef('public.auto_verify_legal_transfer_review_v1(uuid,uuid,uuid)'::regprocedure),
    'public.auto_verify_legal_transfer_review_v1(', 'legal_claim_internal.legacy_auto_review_v1(');
END;
$baseline$;
REVOKE ALL ON FUNCTION legal_claim_internal.legacy_auto_review_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION legal_claim_internal.auto_verify_review_v2(
  p_company_id uuid,p_contract_id uuid,p_actor_id uuid
) RETURNS public.legal_transfer_employee_reviews LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $review$
DECLARE
  v_actor uuid;
  v_contract public.contracts%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_readiness public.contract_operations_log%ROWTYPE;
  v_review public.legal_transfer_employee_reviews%ROWTYPE;
  v_snapshot jsonb;
  v_approval jsonb;
  v_checklist jsonb;
  v_invoice_updated_at timestamptz;
BEGIN
  v_actor:=legal_claim_internal.authorize_readiness_completion_v1(p_company_id,p_contract_id,p_actor_id);
  -- Same lock order as conversion and completion. This serializes these commands,
  -- not every receipt/document writer; the final conversion gate must revalidate.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text||':legal-contract:'||p_contract_id::text,0));
  SELECT * INTO v_contract FROM public.contracts c WHERE c.company_id=p_company_id AND c.id=p_contract_id FOR UPDATE;
  SELECT * INTO v_customer FROM public.customers c WHERE c.company_id=p_company_id AND c.id=v_contract.customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract customer was not found' USING ERRCODE='P0001';
  END IF;
  IF v_contract.vehicle_id IS NULL OR nullif(btrim(v_customer.phone),'') IS NULL THEN
    RAISE EXCEPTION 'A contract vehicle and customer phone are required for legal transfer' USING ERRCODE='P0001';
  END IF;

  -- Do not skip a newer invalid completion record and revive an older approval.
  SELECT * INTO v_readiness FROM public.contract_operations_log o
    WHERE o.company_id=p_company_id AND o.contract_id=p_contract_id
      AND o.operation_type='legal_transfer_readiness_completed'
    ORDER BY o.performed_at DESC NULLS LAST,o.id DESC LIMIT 1;
  IF NOT FOUND OR v_readiness.operation_details->'ready' IS DISTINCT FROM 'true'::jsonb
    OR v_readiness.operation_details->>'readiness_source' IS DISTINCT FROM 'canonical_readiness_completion_v3'
    OR v_readiness.operation_details->'signed_contract_ready' IS DISTINCT FROM 'true'::jsonb THEN
    RAISE EXCEPTION 'أكمل فحص الجاهزية الحالي؛ لا يمكن اعتماد سجل قديم أو غير مكتمل'
      USING ERRCODE='P0001',HINT='LEGAL_CURRENT_READINESS_REQUIRED';
  END IF;
  IF v_readiness.operation_details->>'company_id' IS DISTINCT FROM p_company_id::text
    OR v_readiness.operation_details->>'contract_id' IS DISTINCT FROM p_contract_id::text
    OR v_readiness.operation_details->>'customer_id' IS DISTINCT FROM v_contract.customer_id::text
    OR v_readiness.operation_details->>'vehicle_id' IS DISTINCT FROM v_contract.vehicle_id::text THEN
    RAISE EXCEPTION 'تغير العميل أو المركبة منذ فحص الجاهزية؛ أعد فحص العقد قبل التحويل'
      USING ERRCODE='P0001',HINT='LEGAL_READINESS_CONTEXT_CHANGED';
  END IF;
  IF (v_readiness.operation_details->>'claim_scope' IN ('full_outstanding','traffic_violations_only')) IS NOT TRUE THEN
    RAISE EXCEPTION 'Readiness claim scope is missing or invalid' USING ERRCODE='22023';
  END IF;

  -- Reuse the actual completion validator: current receipt allocations,
  -- authoritative document/identity decisions, customer traffic proof and
  -- scoped exclusions. Never create a new readiness completion as a side effect.
  v_snapshot:=legal_claim_internal.prepare_readiness_snapshot_v3(p_company_id,p_contract_id,
    v_readiness.operation_details||jsonb_build_object(
      'excluded_invoices',coalesce(v_readiness.operation_details->'reported_exclusion_notes','[]'::jsonb)
    ),v_actor);
  v_snapshot:=v_snapshot||jsonb_build_object('verification_source','canonical_system_review_v2');
  SELECT max(i.updated_at) INTO v_invoice_updated_at FROM public.invoices i
    WHERE i.company_id=p_company_id AND i.contract_id=p_contract_id;
  v_approval:=jsonb_build_object(
    'verification_source','system','calculation_source','canonical_system_review_v2',
    'readiness_operation_id',v_readiness.id,'readiness_performed_at',v_readiness.performed_at,
    'customer_updated_at',v_customer.updated_at,'contract_updated_at',v_contract.updated_at,
    'invoice_updated_at',v_invoice_updated_at,
    'claim_statement',v_snapshot->'claim_statement',
    'claim_changed_since_readiness',v_snapshot->'claim_statement' IS DISTINCT FROM v_readiness.operation_details->'claim_statement',
    'verified_at',clock_timestamp());
  v_checklist:=jsonb_build_object('identity_verified',true,'financial_verified',true,'contact_verified',true,
    'vehicle_verified',true,'documents_verified',true,'violations_verified',true,'verification_source','system');

  -- Only close pending manual requests after every current-source gate passed.
  UPDATE public.legal_transfer_employee_reviews r SET status='cancelled',
    employee_notes=concat_ws(E'\n',r.employee_notes,'استُبدلت المراجعة بتحقق نظامي من بيانات العقد الحالية.'),updated_at=clock_timestamp()
  WHERE r.company_id=p_company_id AND r.contract_id=p_contract_id AND (
    r.status IN ('awaiting_assignment','pending','in_progress','corrections_required','deferred')
    OR (r.status='system_verified' AND r.customer_id IS DISTINCT FROM v_contract.customer_id));

  SELECT * INTO v_review FROM public.legal_transfer_employee_reviews r
    WHERE r.company_id=p_company_id AND r.contract_id=p_contract_id AND r.customer_id=v_contract.customer_id AND r.status='system_verified'
    ORDER BY r.responded_at DESC NULLS LAST,r.created_at DESC,r.id DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE public.legal_transfer_employee_reviews r SET requested_by=v_actor,reviewed_by=NULL,overridden_by=NULL,
      status='system_verified',request_reason='تحقق نظامي تلقائي من المصادر الحالية قبل التحويل القانوني',
      employee_decision=NULL,employee_notes='اكتملت مطابقة المبالغ والمستندات الحالية دون انتظار اعتماد بشري.',override_reason=NULL,
      checklist=v_checklist,corrected_fields='{}'::jsonb,request_snapshot=v_snapshot,approval_snapshot=v_approval,
      requested_at=clock_timestamp(),due_at=clock_timestamp(),responded_at=clock_timestamp(),updated_at=clock_timestamp()
      WHERE r.id=v_review.id AND r.company_id=p_company_id AND r.contract_id=p_contract_id RETURNING * INTO v_review;
  ELSE
    INSERT INTO public.legal_transfer_employee_reviews(company_id,contract_id,customer_id,assigned_to_profile_id,requested_by,
      status,request_reason,employee_notes,checklist,corrected_fields,request_snapshot,approval_snapshot,requested_at,due_at,responded_at)
    VALUES(p_company_id,p_contract_id,v_contract.customer_id,NULL,v_actor,'system_verified',
      'تحقق نظامي تلقائي من المصادر الحالية قبل التحويل القانوني','اكتملت مطابقة المبالغ والمستندات الحالية دون انتظار اعتماد بشري.',
      v_checklist,'{}'::jsonb,v_snapshot,v_approval,clock_timestamp(),clock_timestamp(),clock_timestamp()) RETURNING * INTO v_review;
  END IF;
  INSERT INTO public.contract_operations_log(contract_id,company_id,operation_type,operation_details,notes,performed_by,performed_at)
    VALUES(p_contract_id,p_company_id,'legal_system_review_verified',jsonb_build_object(
      'review_id',v_review.id,'readiness_operation_id',v_readiness.id,'status',v_review.status,
      'verification_source','canonical_system_review_v2','claim_amount',v_snapshot->'claim_amount',
      'claim_statement',v_snapshot->'claim_statement'),
      'اكتمل التحقق النظامي من المطالبة والمستندات الحالية قبل التحويل القانوني.',v_actor,clock_timestamp());
  RETURN v_review;
END;
$review$;
REVOKE ALL ON FUNCTION legal_claim_internal.auto_verify_review_v2(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION legal_claim_internal.auto_verify_review_v2(uuid,uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.auto_verify_legal_transfer_review_v1(
  p_company_id uuid,p_contract_id uuid,p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_transfer_employee_reviews LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $facade$ SELECT * FROM legal_claim_internal.auto_verify_review_v2(p_company_id,p_contract_id,p_actor_id); $facade$;
-- Preserve the deployed service-only boundary; authenticated users enter via
-- the existing guarded conversion command, never this internal review stage.
REVOKE ALL ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid,uuid,uuid) TO service_role;
COMMIT;
