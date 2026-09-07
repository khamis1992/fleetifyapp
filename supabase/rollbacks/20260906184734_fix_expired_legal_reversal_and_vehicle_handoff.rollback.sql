-- Keep existing legal and financial guards; serialize assignment and preserve expired status.
BEGIN;
DO $migration$
DECLARE v_definition text := pg_get_functiondef('public.revert_contract_from_legal_v2(uuid,uuid,text,uuid,uuid)'::regprocedure);
BEGIN
 IF strpos(v_definition,$old$status = CASE WHEN contract.end_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN 'expired' ELSE 'active' END,
    legal_status = NULL,$old$)=0 THEN RAISE EXCEPTION 'Unexpected migration definition'; END IF;
 v_definition := replace(v_definition,$old$status = CASE WHEN contract.end_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN 'expired' ELSE 'active' END,
    legal_status = NULL,$old$,$new$status = 'active',
    legal_status = NULL,$new$);
 IF strpos(v_definition,$old$pg_catalog.jsonb_build_object('status', CASE WHEN v_contract.end_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN 'expired' ELSE 'active' END, 'legal_status', NULL::text)$old$)=0 THEN RAISE EXCEPTION 'Unexpected migration definition'; END IF;
 v_definition := replace(v_definition,$old$pg_catalog.jsonb_build_object('status', CASE WHEN v_contract.end_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN 'expired' ELSE 'active' END, 'legal_status', NULL::text)$old$,$new$pg_catalog.jsonb_build_object('status', 'active', 'legal_status', NULL::text)$new$);
 IF strpos(v_definition,$old$'vehicle_status', v_target_vehicle_status,
    'contract_status', CASE WHEN v_contract.end_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN 'expired' ELSE 'active' END$old$)=0 THEN RAISE EXCEPTION 'Unexpected migration definition'; END IF;
 v_definition := replace(v_definition,$old$'vehicle_status', v_target_vehicle_status,
    'contract_status', CASE WHEN v_contract.end_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN 'expired' ELSE 'active' END$old$,$new$'vehicle_status', v_target_vehicle_status$new$);
 EXECUTE v_definition;
END;
$migration$;
DROP FUNCTION IF EXISTS public.create_contract_with_vehicle_handoff_v1(jsonb,uuid,timestamptz,text);
DO $guard$
DECLARE v_definition text := pg_get_functiondef('public.resolve_and_guard_contract_vehicle_identity()'::regprocedure);
BEGIN
 IF strpos(v_definition,$old$  PERFORM 1 FROM public.vehicles vehicle
  WHERE vehicle.id = NEW.vehicle_id AND vehicle.company_id = NEW.company_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المركبة غير موجودة ضمن الشركة الحالية' USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts occupied$old$)=0 THEN RAISE EXCEPTION 'Unexpected guard definition'; END IF;
 v_definition := replace(v_definition,$old$  PERFORM 1 FROM public.vehicles vehicle
  WHERE vehicle.id = NEW.vehicle_id AND vehicle.company_id = NEW.company_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المركبة غير موجودة ضمن الشركة الحالية' USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts occupied$old$,$new$  IF EXISTS (
    SELECT 1 FROM public.contracts occupied$new$);
 EXECUTE v_definition;
END;
$guard$;
NOTIFY pgrst, 'reload schema';
COMMIT;
