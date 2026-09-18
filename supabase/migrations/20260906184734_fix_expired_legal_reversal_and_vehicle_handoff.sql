-- Keep existing legal and financial guards; serialize assignment and preserve expired status.
BEGIN;
DO $migration$
DECLARE v_definition text := pg_get_functiondef('public.revert_contract_from_legal_v2(uuid,uuid,text,uuid,uuid)'::regprocedure);
BEGIN
 IF strpos(v_definition,$old$status = 'active',
    legal_status = NULL,$old$)=0 THEN RAISE EXCEPTION 'Unexpected migration definition'; END IF;
 v_definition := replace(v_definition,$old$status = 'active',
    legal_status = NULL,$old$,$new$status = CASE WHEN contract.end_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN 'expired' ELSE 'active' END,
    legal_status = NULL,$new$);
 IF strpos(v_definition,$old$pg_catalog.jsonb_build_object('status', 'active', 'legal_status', NULL::text)$old$)=0 THEN RAISE EXCEPTION 'Unexpected migration definition'; END IF;
 v_definition := replace(v_definition,$old$pg_catalog.jsonb_build_object('status', 'active', 'legal_status', NULL::text)$old$,$new$pg_catalog.jsonb_build_object('status', CASE WHEN v_contract.end_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN 'expired' ELSE 'active' END, 'legal_status', NULL::text)$new$);
 IF strpos(v_definition,$old$'vehicle_status', v_target_vehicle_status$old$)=0 THEN RAISE EXCEPTION 'Unexpected migration definition'; END IF;
 v_definition := replace(v_definition,$old$'vehicle_status', v_target_vehicle_status$old$,$new$'vehicle_status', v_target_vehicle_status,
    'contract_status', CASE WHEN v_contract.end_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN 'expired' ELSE 'active' END$new$);
 EXECUTE v_definition;
END;
$migration$;
CREATE OR REPLACE FUNCTION public.create_contract_with_vehicle_handoff_v1(
  p_creation_args jsonb, p_previous_contract_id uuid,
  p_expected_updated_at timestamptz, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  v_company uuid := (p_creation_args->>'p_company_id')::uuid;
  v_vehicle uuid := (p_creation_args->>'p_vehicle_id')::uuid;
  v_key text := p_creation_args->>'p_idempotency_key';
  v_previous public.contracts%ROWTYPE;
  v_existing public.contracts%ROWTYPE;
  v_result jsonb;
  v_call text;
  v_args text[] := ARRAY[]::text[];
  v_parameter record;
  v_names text[];
  v_replay boolean := false;
BEGIN
  IF auth.uid() IS NULL OR v_company IS NULL OR v_vehicle IS NULL
     OR p_previous_contract_id IS NULL OR p_expected_updated_at IS NULL
     OR length(btrim(coalesce(v_key,''))) < 8
     OR length(btrim(coalesce(p_reason,''))) < 5
     OR p_creation_args->>'p_start_date' IS NULL OR p_creation_args->>'p_end_date' IS NULL THEN
    RAISE EXCEPTION 'بيانات نقل المركبة غير مكتملة' USING ERRCODE='22023';
  END IF;
  -- Match the core creator lock, then serialize transfers for this vehicle.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('contract-create:' || v_company::text || ':' || v_key, 0));
  PERFORM 1 FROM public.vehicles WHERE id=v_vehicle AND company_id=v_company FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'المركبة غير موجودة ضمن الشركة الحالية' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_existing FROM public.contracts
  WHERE company_id=v_company AND creation_idempotency_key=v_key FOR UPDATE;
  IF FOUND THEN
    IF NOT EXISTS (SELECT 1 FROM public.contract_operations_log
      WHERE company_id=v_company AND contract_id=v_existing.id AND operation_type='vehicle_contract_handoff'
        AND operation_details->>'previous_contract_id'=p_previous_contract_id::text
        AND operation_details->>'reason'=btrim(p_reason)
        AND operation_details->'creation_args'=p_creation_args) THEN
      RAISE EXCEPTION 'معرف العملية مستخدم لطلب آخر؛ أعد فتح نموذج العقد' USING ERRCODE='22023';
    END IF;
    v_replay := true;
  ELSE
    SELECT * INTO v_previous FROM public.contracts
    WHERE id=p_previous_contract_id AND company_id=v_company AND vehicle_id=v_vehicle FOR UPDATE;
    IF NOT FOUND OR v_previous.updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'تغير العقد السابق؛ أعد فحص ارتباط المركبة قبل التأكيد' USING ERRCODE='40001';
    END IF;
    IF v_previous.status NOT IN ('active','pending','confirmed','suspended')
      OR nullif(btrim(v_previous.legal_status),'') IS NOT NULL THEN
      RAISE EXCEPTION 'العقد السابق يحتاج مراجعة حالته أو ملفه القانوني قبل نقل المركبة' USING ERRCODE='22023';
    END IF;
    IF NOT (daterange(v_previous.start_date,v_previous.end_date,'[]') &&
      daterange((p_creation_args->>'p_start_date')::date,(p_creation_args->>'p_end_date')::date,'[]')) THEN
      RAISE EXCEPTION 'العقد السابق لا يتداخل مع المدة المختارة؛ أعد فحص المركبة' USING ERRCODE='22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.contracts occupied
      WHERE occupied.company_id=v_company AND occupied.vehicle_id=v_vehicle AND occupied.id<>p_previous_contract_id
      AND (occupied.status IN ('active','pending','confirmed','suspended') OR
        (occupied.status='under_legal_procedure' AND NOT coalesce(occupied.vehicle_returned,false)))
      AND daterange(occupied.start_date,occupied.end_date,'[]') &&
        daterange((p_creation_args->>'p_start_date')::date,(p_creation_args->>'p_end_date')::date,'[]')) THEN
      RAISE EXCEPTION 'توجد عدة عقود متداخلة لهذه المركبة؛ راجع العقود المرتبطة أولاً' USING ERRCODE='23P01';
    END IF;
    -- Existing authorized cancellation preserves customer penalties and the audit trail.
    PERFORM public.cancel_contract_with_return_and_penalties_v2(v_company,p_previous_contract_id,btrim(p_reason),false,NULL,auth.uid());
  END IF;

  -- Forward only the installed creator's named, typed arguments. This supports
  -- both pre-deposit and deposit-aware installations without silently losing money.
  SELECT proargnames INTO v_names FROM pg_catalog.pg_proc
  WHERE pronamespace='public'::regnamespace AND proname='create_contract_with_violation_override_atomic'
  ORDER BY pronargs DESC LIMIT 1;
  IF v_names IS NULL THEN RAISE EXCEPTION 'دالة إنشاء العقد غير متاحة'; END IF;
  FOR v_parameter IN SELECT key,value FROM pg_catalog.jsonb_each(p_creation_args) LOOP
    IF NOT (v_parameter.key=ANY(v_names)) THEN
      IF v_parameter.key='p_deposit_amount' AND coalesce((v_parameter.value #>> '{}')::numeric,0)=0 THEN CONTINUE; END IF;
      RAISE EXCEPTION 'تحديث إنشاء العقد غير متاح للمعامل %؛ لم يُلغ العقد السابق',v_parameter.key USING ERRCODE='22023';
    END IF;
  END LOOP;
  FOR v_parameter IN
    SELECT args.name, pg_catalog.format_type(args.type_oid,NULL) type_name
    FROM pg_catalog.pg_proc procedure,
      LATERAL unnest(procedure.proargnames,procedure.proargtypes::oid[]) AS args(name,type_oid)
    WHERE procedure.pronamespace='public'::regnamespace
      AND procedure.proname='create_contract_with_violation_override_atomic'
      AND procedure.proargnames=v_names
  LOOP
    IF p_creation_args ? v_parameter.name THEN
      v_args := array_append(v_args,pg_catalog.format('%I => %L::%s',v_parameter.name,
        p_creation_args->>v_parameter.name,v_parameter.type_name));
    END IF;
  END LOOP;
  v_call := 'SELECT public.create_contract_with_violation_override_atomic(' || array_to_string(v_args,',') || ')';
  EXECUTE v_call INTO v_result;
  IF (v_result->>'success') IS DISTINCT FROM 'true'
    OR (v_result->>'billing_graph_created') IS DISTINCT FROM 'true' OR v_result->>'contract_id' IS NULL THEN
    -- Raise, do not return a failure payload: rollback the preceding cancellation.
    RAISE EXCEPTION '%',coalesce(v_result->>'error','لم يكتمل إنشاء العقد؛ بقي العقد السابق دون تغيير');
  END IF;
  IF NOT v_replay THEN
    INSERT INTO public.contract_operations_log(company_id,contract_id,operation_type,operation_details,notes,performed_by)
    VALUES(v_company,(v_result->>'contract_id')::uuid,'vehicle_contract_handoff',
      jsonb_build_object('previous_contract_id',p_previous_contract_id,'reason',btrim(p_reason),'creation_args',p_creation_args),
      'إلغاء العقد السابق ونقل المركبة إلى العقد الجديد في عملية واحدة',auth.uid());
  END IF;
  RETURN v_result || jsonb_build_object('previous_contract_id',p_previous_contract_id,'vehicle_handoff_completed',true);
END;
$function$;
REVOKE ALL ON FUNCTION public.create_contract_with_vehicle_handoff_v1(jsonb,uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_contract_with_vehicle_handoff_v1(jsonb,uuid,timestamptz,text) TO authenticated;
DO $guard$
DECLARE v_definition text := pg_get_functiondef('public.resolve_and_guard_contract_vehicle_identity()'::regprocedure);
BEGIN
 IF strpos(v_definition,$old$  IF EXISTS (
    SELECT 1 FROM public.contracts occupied$old$)=0 THEN RAISE EXCEPTION 'Unexpected guard definition'; END IF;
 v_definition := replace(v_definition,$old$  IF EXISTS (
    SELECT 1 FROM public.contracts occupied$old$,$new$  PERFORM 1 FROM public.vehicles vehicle
  WHERE vehicle.id = NEW.vehicle_id AND vehicle.company_id = NEW.company_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المركبة غير موجودة ضمن الشركة الحالية' USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts occupied$new$);
 EXECUTE v_definition;
END;
$guard$;
NOTIFY pgrst, 'reload schema';
COMMIT;
