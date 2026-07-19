CREATE OR REPLACE FUNCTION public.transition_legal_case_workflow_v1(
  p_company_id uuid, p_case_id uuid, p_target_stage text, p_reason text DEFAULT NULL, p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_case public.legal_cases%ROWTYPE; v_actor uuid; v_allowed boolean := false; v_legacy text; v_old_stage text;
BEGIN
  v_actor := public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  SELECT * INTO v_case FROM public.legal_cases WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legal case was not found' USING ERRCODE='P0001'; END IF;
  IF v_case.workflow_stage=p_target_stage THEN RETURN v_case; END IF;
  v_old_stage := v_case.workflow_stage;
  v_allowed := CASE v_case.workflow_stage
    WHEN 'preparation' THEN p_target_stage IN ('filed','cancelled')
    WHEN 'filed' THEN p_target_stage IN ('hearings','reserved_for_judgment','cancelled')
    WHEN 'hearings' THEN p_target_stage IN ('reserved_for_judgment','cancelled')
    WHEN 'reserved_for_judgment' THEN p_target_stage IN ('hearings','judgment_issued')
    WHEN 'judgment_issued' THEN p_target_stage IN ('appeal','enforcement','collection','closed')
    WHEN 'appeal' THEN p_target_stage IN ('judgment_issued','enforcement','collection','closed')
    WHEN 'enforcement' THEN p_target_stage IN ('collection','closed')
    WHEN 'collection' THEN p_target_stage='closed'
    ELSE false END;
  IF NOT v_allowed THEN RAISE EXCEPTION 'Invalid legal workflow transition from % to %',v_case.workflow_stage,p_target_stage USING ERRCODE='P0001'; END IF;
  IF p_target_stage IN ('cancelled','closed') AND NULLIF(BTRIM(COALESCE(p_reason,'')),'') IS NULL THEN RAISE EXCEPTION 'A reason is required for terminal transitions' USING ERRCODE='P0001'; END IF;
  v_legacy := CASE WHEN p_target_stage='preparation' THEN 'pending' WHEN p_target_stage IN ('closed','cancelled') THEN p_target_stage ELSE 'active' END;
  UPDATE public.legal_cases SET workflow_stage=p_target_stage,stage_updated_at=now(),case_status=v_legacy,
    filing_date=CASE WHEN p_target_stage='filed' THEN COALESCE(filing_date,CURRENT_DATE) ELSE filing_date END,
    closed_at=CASE WHEN p_target_stage='closed' THEN now() ELSE NULL END,
    closure_reason=CASE WHEN p_target_stage IN ('closed','cancelled') THEN BTRIM(p_reason) ELSE closure_reason END,
    updated_at=now() WHERE id=p_case_id RETURNING * INTO v_case;
  INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,old_values,new_values,created_by)
  VALUES(p_case_id,p_company_id,'workflow_transition','تغيير مرحلة القضية',COALESCE(NULLIF(BTRIM(p_reason),''),'انتقال معتمد ضمن سير العمل'),
    jsonb_build_object('workflow_stage',v_old_stage),jsonb_build_object('workflow_stage',p_target_stage),v_actor);
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id,v_case.contract_id,p_target_stage);
  RETURN v_case;
END; $$;

REVOKE ALL ON FUNCTION public.transition_legal_case_workflow_v1(uuid,uuid,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transition_legal_case_workflow_v1(uuid,uuid,text,text,uuid) TO authenticated,service_role;
