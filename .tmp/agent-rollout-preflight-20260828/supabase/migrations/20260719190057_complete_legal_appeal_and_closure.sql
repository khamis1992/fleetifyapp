CREATE OR REPLACE FUNCTION public.record_legal_case_appeal_v1(
  p_company_id uuid,p_case_id uuid,p_status text,p_deadline date,p_filed_at timestamptz,
  p_reference_number text,p_court_name text,p_notes text,p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_case_appeals LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid; v_case public.legal_cases%ROWTYPE; v_appeal public.legal_case_appeals%ROWTYPE;
BEGIN
  v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  IF p_status NOT IN ('eligible','decision_pending','filed','accepted','rejected','withdrawn','expired') THEN RAISE EXCEPTION 'Invalid appeal status'; END IF;
  SELECT * INTO v_case FROM public.legal_cases WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND OR v_case.workflow_stage NOT IN ('judgment_issued','appeal') THEN RAISE EXCEPTION 'A recorded judgment is required before appeal'; END IF;
  INSERT INTO public.legal_case_appeals(company_id,case_id,status,deadline,filed_at,reference_number,court_name,notes,created_by)
  VALUES(p_company_id,p_case_id,p_status,p_deadline,p_filed_at,NULLIF(BTRIM(COALESCE(p_reference_number,'')),''),NULLIF(BTRIM(COALESCE(p_court_name,'')),''),NULLIF(BTRIM(COALESCE(p_notes,'')),''),v_actor)
  RETURNING * INTO v_appeal;
  UPDATE public.legal_cases SET workflow_stage='appeal',case_status='active',appeal_deadline=COALESCE(p_deadline,appeal_deadline),stage_updated_at=now(),updated_at=now() WHERE id=p_case_id;
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id,v_case.contract_id,'appeal');
  IF p_deadline IS NOT NULL AND p_status NOT IN ('withdrawn','expired','rejected') THEN
    PERFORM public.legal_workflow_create_task_v1(p_company_id,p_case_id,'appeal-record:'||v_appeal.id::text,'Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ø³ØªØ¦Ù†Ø§Ù '||v_case.case_number,'Ù…ØªØ§Ø¨Ø¹Ø© Ù…Ù„Ù Ø§Ù„Ø§Ø³ØªØ¦Ù†Ø§Ù Ù‚Ø¨Ù„ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ù…Ù‡Ù„Ø©.',p_deadline::timestamptz-interval '2 days','urgent',v_actor);
  END IF;
  INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,new_values,created_by)
  VALUES(p_case_id,p_company_id,'appeal_recorded','ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø§Ø³ØªØ¦Ù†Ø§Ù',COALESCE(NULLIF(BTRIM(p_notes),''),'ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø§Ø³ØªØ¦Ù†Ø§Ù'),to_jsonb(v_appeal),v_actor);
  RETURN v_appeal;
END; $$;

REVOKE ALL ON FUNCTION public.record_legal_case_appeal_v1(uuid,uuid,text,date,timestamptz,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_legal_case_appeal_v1(uuid,uuid,text,date,timestamptz,text,text,text,uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.close_legal_case_final_v1(
  p_company_id uuid,p_case_id uuid,p_reason text,p_override_unsettled boolean DEFAULT false,p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid; v_case public.legal_cases%ROWTYPE; v_unsettled boolean; v_privileged boolean;
BEGIN
  v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  SELECT * INTO v_case FROM public.legal_cases WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legal case was not found'; END IF;
  IF v_case.workflow_stage NOT IN ('judgment_issued','appeal','enforcement','collection') THEN RAISE EXCEPTION 'The case is not ready for final closure'; END IF;
  IF NULLIF(BTRIM(COALESCE(p_reason,'')),'') IS NULL THEN RAISE EXCEPTION 'Closure reason is required'; END IF;
  IF EXISTS(SELECT 1 FROM public.legal_case_hearings WHERE case_id=p_case_id AND status='scheduled' AND hearing_date>=now()) THEN RAISE EXCEPTION 'Future scheduled hearings must be completed or cancelled first'; END IF;
  v_unsettled:=COALESCE(v_case.outcome_amount,0)>0 AND COALESCE(v_case.outcome_payment_status,'pending') NOT IN ('paid','received');
  IF v_unsettled THEN
    v_privileged:=auth.uid() IS NULL OR public.is_company_admin(p_company_id) OR public.is_company_manager(p_company_id);
    IF NOT p_override_unsettled OR NOT v_privileged OR length(BTRIM(p_reason))<10 THEN RAISE EXCEPTION 'Unsettled judgment requires a manager override and a detailed reason'; END IF;
  END IF;
  UPDATE public.legal_cases SET workflow_stage='closed',case_status='closed',stage_updated_at=now(),closed_at=now(),closure_reason=BTRIM(p_reason),updated_at=now() WHERE id=p_case_id RETURNING * INTO v_case;
  UPDATE public.tasks SET status='completed',completed_at=COALESCE(completed_at,now()),updated_at=now()
    WHERE company_id=p_company_id AND category='legal_workflow' AND metadata->>'legal_case_id'=p_case_id::text AND status IN ('pending','in_progress','on_hold');
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id,v_case.contract_id,'closed');
  IF v_case.contract_id IS NOT NULL THEN
    PERFORM public.legal_workflow_create_task_v1(p_company_id,p_case_id,'post-close-contract:'||p_case_id::text,
      'Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø¹Ù‚Ø¯ Ø¨Ø¹Ø¯ Ø¥ØºÙ„Ø§Ù‚ '||v_case.case_number,'Ø§Ù„Ù‚Ø¶ÙŠØ© Ù…ØºÙ„Ù‚Ø© Ù‚Ø§Ù†ÙˆÙ†ÙŠØ§Ù‹. Ø±Ø§Ø¬Ø¹ Ø±ØµÙŠØ¯ Ø§Ù„Ø¹Ù‚Ø¯ ÙˆØ­Ø§Ù„ØªÙ‡ Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ© Ù‚Ø¨Ù„ Ø£ÙŠ ØªØºÙŠÙŠØ±.',now()+interval '1 day','high',v_actor);
  END IF;
  INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,created_by)
  VALUES(p_case_id,p_company_id,'case_finally_closed','Ø§Ù„Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ Ù„Ù„Ù‚Ø¶ÙŠØ©',BTRIM(p_reason),v_actor);
  RETURN v_case;
END; $$;

REVOKE ALL ON FUNCTION public.close_legal_case_final_v1(uuid,uuid,text,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.close_legal_case_final_v1(uuid,uuid,text,boolean,uuid) TO authenticated,service_role;

;
