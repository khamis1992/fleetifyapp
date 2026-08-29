CREATE OR REPLACE FUNCTION public.normalize_legacy_legal_terminal_stage_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF OLD.workflow_stage NOT IN ('closed','cancelled') AND NEW.workflow_stage=OLD.workflow_stage THEN
    IF lower(COALESCE(NEW.case_status,''))='cancelled' THEN
      NEW.workflow_stage:='cancelled'; NEW.stage_updated_at:=now();
      NEW.closure_reason:=COALESCE(NEW.closure_reason,NEW.outcome_notes,'Ø¥Ù„ØºØ§Ø¡ Ø¹Ø¨Ø± Ø¥Ø¬Ø±Ø§Ø¡ Ù‚Ø§Ù†ÙˆÙ†ÙŠ Ù…Ø¹ØªÙ…Ø¯');
    ELSIF lower(COALESCE(NEW.case_status,''))='closed' AND NEW.outcome_type IN ('withdrawn','dismissed') THEN
      NEW.workflow_stage:='closed'; NEW.stage_updated_at:=now(); NEW.closed_at:=COALESCE(NEW.closed_at,now());
      NEW.closure_reason:=COALESCE(NEW.closure_reason,NEW.outcome_notes,'Ø¥ØºÙ„Ø§Ù‚ Ø¹Ø¨Ø± Ø¥Ø¬Ø±Ø§Ø¡ Ù‚Ø§Ù†ÙˆÙ†ÙŠ Ù…Ø¹ØªÙ…Ø¯');
    ELSIF lower(COALESCE(NEW.case_status,''))='closed' THEN
      RAISE EXCEPTION 'Judgments must be recorded first, then the case must be closed through the final closure workflow' USING ERRCODE='P0001';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS normalize_legacy_legal_terminal_stage ON public.legal_cases;
CREATE TRIGGER normalize_legacy_legal_terminal_stage BEFORE UPDATE OF workflow_stage,case_status,outcome_type ON public.legal_cases
FOR EACH ROW EXECUTE FUNCTION public.normalize_legacy_legal_terminal_stage_v1();

REVOKE ALL ON FUNCTION public.normalize_legacy_legal_terminal_stage_v1() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.run_legal_workflow_daily_guard_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_case record; v_actor uuid; v_checked integer:=0; v_id uuid;
BEGIN
  FOR v_case IN SELECT * FROM public.legal_cases WHERE workflow_stage NOT IN ('closed','cancelled') LOOP
    SELECT id INTO v_actor FROM public.profiles WHERE company_id=v_case.company_id
      AND (id=v_case.created_by OR user_id=v_case.created_by) ORDER BY CASE WHEN id=v_case.created_by THEN 0 ELSE 1 END LIMIT 1;
    v_actor:=COALESCE(v_actor,(SELECT id FROM public.profiles WHERE company_id=v_case.company_id ORDER BY created_at LIMIT 1));
    IF v_case.workflow_stage='preparation' AND v_case.stage_updated_at<now()-interval '3 days' THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'prepare:'||v_case.id::text,'Ø§Ø³ØªÙƒÙ…Ø§Ù„ ØªØ¬Ù‡ÙŠØ² '||v_case.case_number,'Ù…Ù„Ù Ø§Ù„Ù‚Ø¶ÙŠØ© Ù„Ù… ÙŠÙ†ØªÙ‚Ù„ Ø¥Ù„Ù‰ Ø§Ù„Ø±ÙØ¹ Ø®Ù„Ø§Ù„ Ø«Ù„Ø§Ø«Ø© Ø£ÙŠØ§Ù….',now()+interval '1 day','high',v_actor); IF v_id IS NOT NULL THEN v_checked:=v_checked+1; END IF;
    END IF;
    IF v_case.workflow_stage='filed' AND NOT EXISTS(SELECT 1 FROM public.legal_case_hearings h WHERE h.case_id=v_case.id AND h.status='scheduled') THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'schedule-hearing:'||v_case.id::text,'ØªØ­Ø¯ÙŠØ¯ Ø¬Ù„Ø³Ø© '||v_case.case_number,'ØªÙ… Ø±ÙØ¹ Ø§Ù„Ø¯Ø¹ÙˆÙ‰ ÙˆÙ„Ù… ÙŠØ³Ø¬Ù„ Ù…ÙˆØ¹Ø¯ Ø¬Ù„Ø³Ø©.',now()+interval '1 day','urgent',v_actor); IF v_id IS NOT NULL THEN v_checked:=v_checked+1; END IF;
    END IF;
    IF v_case.workflow_stage='hearings' AND NOT EXISTS(SELECT 1 FROM public.legal_case_hearings h WHERE h.case_id=v_case.id AND h.status='scheduled' AND h.hearing_date>=now()) THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'hearing-result:'||v_case.id::text,'ØªØ­Ø¯ÙŠØ« Ù†ØªÙŠØ¬Ø© Ø¬Ù„Ø³Ø§Øª '||v_case.case_number,'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ù„Ø³Ø© Ù‚Ø§Ø¯Ù…Ø©Ø› Ø³Ø¬Ù„ Ø§Ù„Ù†ØªÙŠØ¬Ø© Ø£Ùˆ Ø§Ù„Ù…Ø±Ø­Ù„Ø© Ø§Ù„ØªØ§Ù„ÙŠØ©.',now()+interval '1 day','high',v_actor); IF v_id IS NOT NULL THEN v_checked:=v_checked+1; END IF;
    END IF;
    IF v_case.hearing_date IS NOT NULL AND v_case.hearing_date<=now()+interval '3 days' THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'daily-hearing:'||v_case.id::text||':'||v_case.hearing_date::date::text,'Ø¬Ù„Ø³Ø© Ù‚Ø±ÙŠØ¨Ø©: '||v_case.case_number,'Ù…Ø±Ø§Ø¬Ø¹Ø© Ù…Ù„Ù Ø§Ù„Ø¬Ù„Ø³Ø© ÙˆØ§Ù„Ø·Ù„Ø¨Ø§Øª Ù‚Ø¨Ù„ Ø§Ù„Ù…ÙˆØ¹Ø¯.',v_case.hearing_date-interval '1 day','urgent',v_actor); IF v_id IS NOT NULL THEN v_checked:=v_checked+1; END IF;
    END IF;
    IF v_case.workflow_stage='reserved_for_judgment' AND v_case.stage_updated_at<now()-interval '7 days' THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'judgment-followup:'||v_case.id::text,'Ù…ØªØ§Ø¨Ø¹Ø© Ø­ÙƒÙ… '||v_case.case_number,'Ø§Ù„Ù‚Ø¶ÙŠØ© Ù…Ø­Ø¬ÙˆØ²Ø© Ù„Ù„Ø­ÙƒÙ… ÙˆÙ„Ù… ØªØ³Ø¬Ù„ Ø§Ù„Ù†ØªÙŠØ¬Ø©.',now()+interval '1 day','urgent',v_actor); IF v_id IS NOT NULL THEN v_checked:=v_checked+1; END IF;
    END IF;
    IF v_case.appeal_deadline IS NOT NULL AND v_case.appeal_deadline<=CURRENT_DATE+7 AND v_case.workflow_stage='judgment_issued' THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'daily-appeal:'||v_case.id::text||':'||v_case.appeal_deadline::text,'Ù…Ù‡Ù„Ø© Ø§Ø³ØªØ¦Ù†Ø§Ù: '||v_case.case_number,'ÙŠØ¬Ø¨ ØªØ³Ø¬ÙŠÙ„ Ù‚Ø±Ø§Ø± Ø§Ù„Ø§Ø³ØªØ¦Ù†Ø§Ù Ù‚Ø¨Ù„ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ù…Ù‡Ù„Ø©.',v_case.appeal_deadline::timestamptz-interval '2 days','urgent',v_actor); IF v_id IS NOT NULL THEN v_checked:=v_checked+1; END IF;
    END IF;
    IF v_case.workflow_stage='judgment_issued' AND v_case.appeal_deadline IS NULL THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'post-judgment:'||v_case.id::text,'ØªØ­Ø¯ÙŠØ¯ Ø¥Ø¬Ø±Ø§Ø¡ Ù…Ø§ Ø¨Ø¹Ø¯ Ø§Ù„Ø­ÙƒÙ… '||v_case.case_number,'Ø­Ø¯Ø¯ Ø§Ù„Ø§Ø³ØªØ¦Ù†Ø§Ù Ø£Ùˆ Ø§Ù„ØªÙ†ÙÙŠØ° Ø£Ùˆ Ø§Ù„ØªØ­ØµÙŠÙ„ Ø£Ùˆ Ø§Ù„Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ.',now()+interval '1 day','urgent',v_actor); IF v_id IS NOT NULL THEN v_checked:=v_checked+1; END IF;
    END IF;
    IF v_case.workflow_stage='enforcement' THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'daily-enforcement:'||v_case.id::text,'Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„ØªÙ†ÙÙŠØ°: '||v_case.case_number,'Ø±Ø§Ø¬Ø¹ Ø¢Ø®Ø± Ø¥Ø¬Ø±Ø§Ø¡ ÙÙŠ Ù…Ù„Ù Ø§Ù„ØªÙ†ÙÙŠØ° ÙˆØ­Ø¯Ø¯ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù‚Ø§Ø¯Ù….',now()+interval '2 days','high',v_actor); IF v_id IS NOT NULL THEN v_checked:=v_checked+1; END IF;
    END IF;
    IF v_case.workflow_stage IN ('judgment_issued','enforcement','collection') AND COALESCE(v_case.outcome_amount,0)>0 AND COALESCE(v_case.outcome_payment_status,'pending') NOT IN ('paid','received') THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'daily-collection:'||v_case.id::text,'Ù…ØªØ§Ø¨Ø¹Ø© ØªØ­ØµÙŠÙ„ Ø§Ù„Ø­ÙƒÙ…: '||v_case.case_number,'Ø§Ù„Ø­ÙƒÙ… Ø§Ù„Ù…Ø§Ù„ÙŠ Ù„Ù… ØªØªÙ… ØªØ³ÙˆÙŠØªÙ‡ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„.',now()+interval '1 day','high',v_actor); IF v_id IS NOT NULL THEN v_checked:=v_checked+1; END IF;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('followups_checked',v_checked,'ran_at',now());
END; $$;

REVOKE ALL ON FUNCTION public.run_legal_workflow_daily_guard_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.run_legal_workflow_daily_guard_v1() TO service_role;

;
