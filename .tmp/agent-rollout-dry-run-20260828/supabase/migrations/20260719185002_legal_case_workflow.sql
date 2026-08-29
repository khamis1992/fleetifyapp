-- End-to-end legal case workflow: hearings, judgments, appeals, enforcement,
-- collection, controlled closure/reopening, and daily follow-up tasks.

ALTER TABLE public.legal_cases
  ADD COLUMN IF NOT EXISTS workflow_stage text,
  ADD COLUMN IF NOT EXISTS stage_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS appeal_deadline date,
  ADD COLUMN IF NOT EXISTS judgment_final_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closure_reason text,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_by uuid,
  ADD COLUMN IF NOT EXISTS reopen_reason text;

UPDATE public.legal_cases
SET workflow_stage = CASE
  WHEN lower(COALESCE(case_status, '')) = 'cancelled' THEN 'cancelled'
  WHEN outcome_type IS NOT NULL AND COALESCE(outcome_amount, 0) > 0
       AND COALESCE(outcome_payment_status, 'pending') NOT IN ('paid', 'received') THEN 'collection'
  WHEN outcome_type IS NOT NULL AND lower(COALESCE(case_status, '')) = 'closed' THEN 'closed'
  WHEN outcome_type IS NOT NULL THEN 'judgment_issued'
  WHEN hearing_date IS NOT NULL THEN 'hearings'
  WHEN filing_date IS NOT NULL THEN 'filed'
  ELSE 'preparation'
END,
stage_updated_at = COALESCE(updated_at, created_at, now()),
closed_at = CASE WHEN lower(COALESCE(case_status, '')) = 'closed' THEN COALESCE(updated_at, now()) ELSE closed_at END
WHERE workflow_stage IS NULL;

ALTER TABLE public.legal_cases
  ALTER COLUMN workflow_stage SET DEFAULT 'preparation',
  ALTER COLUMN workflow_stage SET NOT NULL,
  ALTER COLUMN stage_updated_at SET DEFAULT now(),
  ALTER COLUMN stage_updated_at SET NOT NULL;

ALTER TABLE public.legal_cases DROP CONSTRAINT IF EXISTS legal_cases_workflow_stage_check;
ALTER TABLE public.legal_cases ADD CONSTRAINT legal_cases_workflow_stage_check CHECK (
  workflow_stage IN ('preparation','filed','hearings','reserved_for_judgment','judgment_issued','appeal','enforcement','collection','closed','cancelled')
);

CREATE TABLE IF NOT EXISTS public.legal_case_hearings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  hearing_date timestamptz NOT NULL,
  hearing_type text,
  court_name text,
  circuit_name text,
  judge_name text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','adjourned','cancelled')),
  decision text,
  requirements text,
  next_hearing_date timestamptz,
  notes text,
  document_id uuid REFERENCES public.legal_case_documents(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_case_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  appeal_type text NOT NULL DEFAULT 'appeal',
  status text NOT NULL DEFAULT 'eligible' CHECK (status IN ('eligible','decision_pending','filed','accepted','rejected','withdrawn','expired')),
  deadline date,
  filed_at timestamptz,
  reference_number text,
  court_name text,
  decision_date date,
  decision text,
  notes text,
  document_id uuid REFERENCES public.legal_case_documents(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_case_enforcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  enforcement_number text,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','filing','active','partially_collected','collected','suspended','closed')),
  filed_at timestamptz,
  authority_name text,
  enforceable_amount numeric NOT NULL DEFAULT 0 CHECK (enforceable_amount >= 0),
  collected_amount numeric NOT NULL DEFAULT 0 CHECK (collected_amount >= 0),
  next_action_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_case_payments
  ADD COLUMN IF NOT EXISTS reference_number text;

CREATE INDEX IF NOT EXISTS idx_legal_case_hearings_case_date ON public.legal_case_hearings(case_id, hearing_date DESC);
CREATE INDEX IF NOT EXISTS idx_legal_case_appeals_case_deadline ON public.legal_case_appeals(case_id, deadline);
CREATE INDEX IF NOT EXISTS idx_legal_case_enforcements_case ON public.legal_case_enforcements(case_id, status);
CREATE INDEX IF NOT EXISTS idx_legal_cases_workflow_stage ON public.legal_cases(company_id, workflow_stage, stage_updated_at);

ALTER TABLE public.legal_case_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_enforcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_case_hearings_company_access ON public.legal_case_hearings;
CREATE POLICY legal_case_hearings_company_access ON public.legal_case_hearings FOR ALL TO authenticated
USING (company_id = public.get_user_company_id()) WITH CHECK (company_id = public.get_user_company_id());
DROP POLICY IF EXISTS legal_case_appeals_company_access ON public.legal_case_appeals;
CREATE POLICY legal_case_appeals_company_access ON public.legal_case_appeals FOR ALL TO authenticated
USING (company_id = public.get_user_company_id()) WITH CHECK (company_id = public.get_user_company_id());
DROP POLICY IF EXISTS legal_case_enforcements_company_access ON public.legal_case_enforcements;
CREATE POLICY legal_case_enforcements_company_access ON public.legal_case_enforcements FOR ALL TO authenticated
USING (company_id = public.get_user_company_id()) WITH CHECK (company_id = public.get_user_company_id());

CREATE OR REPLACE FUNCTION public.legal_workflow_actor_profile_v1(p_company_id uuid, p_actor_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_profile_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501';
    END IF;
    SELECT id INTO v_profile_id FROM public.profiles WHERE user_id=auth.uid() AND company_id=p_company_id LIMIT 1;
  ELSE
    IF COALESCE(auth.role(),'') <> 'service_role' AND p_actor_id IS NULL THEN
      RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501';
    END IF;
    SELECT id INTO v_profile_id FROM public.profiles
    WHERE company_id=p_company_id AND (id=p_actor_id OR user_id=p_actor_id)
    ORDER BY CASE WHEN id=p_actor_id THEN 0 ELSE 1 END LIMIT 1;
  END IF;
  RETURN v_profile_id;
END; $$;

CREATE OR REPLACE FUNCTION public.legal_workflow_sync_contract_v1(p_company_id uuid, p_contract_id uuid, p_stage text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_contract_id IS NULL THEN RETURN; END IF;
  UPDATE public.contracts SET
    legal_status = CASE p_stage
      WHEN 'preparation' THEN 'under_legal_action'
      WHEN 'filed' THEN 'legal_case_filed'
      WHEN 'hearings' THEN 'in_court'
      WHEN 'reserved_for_judgment' THEN 'in_court'
      WHEN 'judgment_issued' THEN 'judgment_issued'
      WHEN 'appeal' THEN 'in_court'
      WHEN 'enforcement' THEN 'execution_phase'
      WHEN 'collection' THEN 'execution_phase'
      WHEN 'closed' THEN 'closed'
      WHEN 'cancelled' THEN 'closed'
      ELSE legal_status END,
    updated_at=now()
  WHERE id=p_contract_id AND company_id=p_company_id;
END; $$;

CREATE OR REPLACE FUNCTION public.legal_workflow_create_task_v1(
  p_company_id uuid, p_case_id uuid, p_key text, p_title text, p_description text,
  p_due_date timestamptz, p_priority text DEFAULT 'high', p_actor_profile uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_task_id uuid; v_creator uuid;
BEGIN
  SELECT id INTO v_task_id FROM public.tasks
  WHERE company_id=p_company_id AND category='legal_workflow'
    AND metadata->>'workflow_key'=p_key AND status IN ('pending','in_progress','on_hold') LIMIT 1;
  IF v_task_id IS NOT NULL THEN RETURN v_task_id; END IF;
  SELECT id INTO v_creator FROM public.profiles
  WHERE company_id=p_company_id AND (id=p_actor_profile OR user_id=p_actor_profile)
  ORDER BY CASE WHEN id=p_actor_profile THEN 0 ELSE 1 END LIMIT 1;
  v_creator := COALESCE(v_creator,
    (SELECT profile.id FROM public.legal_cases legal_case JOIN public.profiles profile
      ON profile.company_id=legal_case.company_id AND (profile.id=legal_case.created_by OR profile.user_id=legal_case.created_by)
      WHERE legal_case.id=p_case_id AND legal_case.company_id=p_company_id LIMIT 1),
    (SELECT id FROM public.profiles WHERE company_id=p_company_id ORDER BY created_at LIMIT 1));
  IF v_creator IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.tasks(company_id,title,description,created_by,assigned_to,status,priority,due_date,category,metadata)
  VALUES(p_company_id,p_title,p_description,v_creator,v_creator,'pending',
    CASE WHEN p_priority IN ('low','medium','high','urgent') THEN p_priority ELSE 'high' END,
    p_due_date,'legal_workflow',jsonb_build_object('legal_case_id',p_case_id,'workflow_key',p_key))
  RETURNING id INTO v_task_id;
  RETURN v_task_id;
END; $$;

CREATE OR REPLACE FUNCTION public.prevent_illegal_case_reopen_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF OLD.workflow_stage IN ('closed','cancelled')
     AND (NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage OR NEW.case_status IS DISTINCT FROM OLD.case_status)
     AND COALESCE(current_setting('app.legal_workflow_reopen',true),'') <> 'allowed' THEN
    RAISE EXCEPTION 'Closed or cancelled legal cases must be reopened using the approved workflow' USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS guard_legal_case_reopen ON public.legal_cases;
CREATE TRIGGER guard_legal_case_reopen BEFORE UPDATE OF workflow_stage,case_status ON public.legal_cases
FOR EACH ROW EXECUTE FUNCTION public.prevent_illegal_case_reopen_v1();

CREATE OR REPLACE FUNCTION public.transition_legal_case_workflow_v1(
  p_company_id uuid, p_case_id uuid, p_target_stage text, p_reason text DEFAULT NULL, p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_case public.legal_cases%ROWTYPE; v_actor uuid; v_allowed boolean := false; v_legacy text;
BEGIN
  v_actor := public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  SELECT * INTO v_case FROM public.legal_cases WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legal case was not found' USING ERRCODE='P0001'; END IF;
  IF v_case.workflow_stage=p_target_stage THEN RETURN v_case; END IF;
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
  IF p_target_stage IN ('cancelled','closed') AND NULLIF(BTRIM(COALESCE(p_reason,'')),'') IS NULL THEN
    RAISE EXCEPTION 'A reason is required for terminal transitions' USING ERRCODE='P0001';
  END IF;
  v_legacy := CASE WHEN p_target_stage='preparation' THEN 'pending' WHEN p_target_stage IN ('closed','cancelled') THEN p_target_stage ELSE 'active' END;
  UPDATE public.legal_cases SET workflow_stage=p_target_stage,stage_updated_at=now(),case_status=v_legacy,
    closed_at=CASE WHEN p_target_stage='closed' THEN now() ELSE NULL END,
    closure_reason=CASE WHEN p_target_stage IN ('closed','cancelled') THEN BTRIM(p_reason) ELSE closure_reason END,
    updated_at=now() WHERE id=p_case_id RETURNING * INTO v_case;
  INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,old_values,new_values,created_by)
  VALUES(p_case_id,p_company_id,'workflow_transition','ØªØºÙŠÙŠØ± Ù…Ø±Ø­Ù„Ø© Ø§Ù„Ù‚Ø¶ÙŠØ©',COALESCE(NULLIF(BTRIM(p_reason),''),'Ø§Ù†ØªÙ‚Ø§Ù„ Ù…Ø¹ØªÙ…Ø¯ Ø¶Ù…Ù† Ø³ÙŠØ± Ø§Ù„Ø¹Ù…Ù„'),
    jsonb_build_object('workflow_stage',v_case.workflow_stage),jsonb_build_object('workflow_stage',p_target_stage),v_actor);
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id,v_case.contract_id,p_target_stage);
  RETURN v_case;
END; $$;

CREATE OR REPLACE FUNCTION public.record_legal_case_hearing_v1(
  p_company_id uuid,p_case_id uuid,p_hearing_date timestamptz,p_status text DEFAULT 'scheduled',
  p_decision text DEFAULT NULL,p_next_hearing_date timestamptz DEFAULT NULL,p_notes text DEFAULT NULL,p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_case_hearings LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid; v_case public.legal_cases%ROWTYPE; v_hearing public.legal_case_hearings%ROWTYPE;
BEGIN
  v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  IF p_hearing_date IS NULL OR p_status NOT IN ('scheduled','completed','adjourned','cancelled') THEN RAISE EXCEPTION 'Valid hearing date and status are required'; END IF;
  SELECT * INTO v_case FROM public.legal_cases WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legal case was not found'; END IF;
  INSERT INTO public.legal_case_hearings(company_id,case_id,hearing_date,status,decision,next_hearing_date,notes,created_by)
  VALUES(p_company_id,p_case_id,p_hearing_date,p_status,NULLIF(BTRIM(COALESCE(p_decision,'')),''),p_next_hearing_date,NULLIF(BTRIM(COALESCE(p_notes,'')),''),v_actor) RETURNING * INTO v_hearing;
  UPDATE public.legal_cases SET workflow_stage='hearings',case_status='active',hearing_date=COALESCE(p_next_hearing_date,p_hearing_date),stage_updated_at=now(),updated_at=now() WHERE id=p_case_id;
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id,v_case.contract_id,'hearings');
  IF COALESCE(p_next_hearing_date,CASE WHEN p_status='scheduled' THEN p_hearing_date END) IS NOT NULL THEN
    PERFORM public.legal_workflow_create_task_v1(p_company_id,p_case_id,'hearing:'||v_hearing.id::text,'Ù…ØªØ§Ø¨Ø¹Ø© Ø¬Ù„Ø³Ø© '||v_case.case_number,
      'Ù…ÙˆØ¹Ø¯ Ø¬Ù„Ø³Ø© Ø§Ù„Ù‚Ø¶ÙŠØ© ÙˆÙ…Ø±Ø§Ø¬Ø¹Ø© Ù…ØªØ·Ù„Ø¨Ø§ØªÙ‡Ø§.',COALESCE(p_next_hearing_date,p_hearing_date)-interval '1 day','urgent',v_actor);
  END IF;
  INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,new_values,created_by)
  VALUES(p_case_id,p_company_id,'hearing_recorded','ØªØ³Ø¬ÙŠÙ„ Ø¬Ù„Ø³Ø©',COALESCE(p_decision,'ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ù…ÙˆØ¹Ø¯ Ø§Ù„Ø¬Ù„Ø³Ø©'),to_jsonb(v_hearing),v_actor);
  RETURN v_hearing;
END; $$;

CREATE OR REPLACE FUNCTION public.record_legal_case_judgment_v1(
  p_company_id uuid,p_case_id uuid,p_case_direction text,p_outcome_type text,p_outcome_amount numeric,
  p_outcome_amount_type text,p_payment_direction text,p_outcome_date date,p_appeal_deadline date,
  p_outcome_notes text,p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid; v_case public.legal_cases%ROWTYPE;
BEGIN
  v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  IF p_outcome_date IS NULL OR p_outcome_type NOT IN ('won','lost','settled','dismissed','pending','withdrawn') OR COALESCE(p_outcome_amount,0)<0 THEN RAISE EXCEPTION 'Valid judgment data is required'; END IF;
  SELECT * INTO v_case FROM public.legal_cases WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legal case was not found'; END IF;
  UPDATE public.legal_cases SET workflow_stage='judgment_issued',stage_updated_at=now(),case_status='active',case_direction=p_case_direction,
    outcome_type=p_outcome_type,outcome_amount=COALESCE(p_outcome_amount,0),outcome_amount_type=p_outcome_amount_type,
    payment_direction=p_payment_direction,outcome_date=p_outcome_date,appeal_deadline=p_appeal_deadline,
    outcome_notes=NULLIF(BTRIM(COALESCE(p_outcome_notes,'')),''),outcome_payment_status=CASE WHEN COALESCE(p_outcome_amount,0)>0 THEN 'pending' ELSE NULL END,
    updated_at=now() WHERE id=p_case_id RETURNING * INTO v_case;
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id,v_case.contract_id,'judgment_issued');
  IF p_appeal_deadline IS NOT NULL THEN
    INSERT INTO public.legal_case_appeals(company_id,case_id,status,deadline,notes,created_by) VALUES(p_company_id,p_case_id,'eligible',p_appeal_deadline,'Ù…Ù‡Ù„Ø© Ø§Ù„Ø·Ø¹Ù† Ø¹Ù„Ù‰ Ø§Ù„Ø­ÙƒÙ…',v_actor);
    PERFORM public.legal_workflow_create_task_v1(p_company_id,p_case_id,'appeal:'||p_case_id::text||':'||p_appeal_deadline::text,
      'Ù‚Ø±Ø§Ø± Ø§Ù„Ø§Ø³ØªØ¦Ù†Ø§Ù Ù„Ù„Ù‚Ø¶ÙŠØ© '||v_case.case_number,'ØªÙ†ØªÙ‡ÙŠ Ù…Ù‡Ù„Ø© Ø§Ù„Ø§Ø³ØªØ¦Ù†Ø§Ù ÙÙŠ Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…Ø­Ø¯Ø¯.',p_appeal_deadline::timestamptz-interval '3 days','urgent',v_actor);
  END IF;
  INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,old_values,new_values,created_by)
  VALUES(p_case_id,p_company_id,'judgment_recorded','ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­ÙƒÙ…','ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­ÙƒÙ… Ø¯ÙˆÙ† Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø±ÙƒØ© Ù†Ù‚Ø¯ÙŠØ©.',
    jsonb_build_object('workflow_stage',v_case.workflow_stage),jsonb_build_object('outcome_type',p_outcome_type,'outcome_amount',p_outcome_amount,'appeal_deadline',p_appeal_deadline),v_actor);
  RETURN v_case;
END; $$;

CREATE OR REPLACE FUNCTION public.start_legal_case_enforcement_v1(
  p_company_id uuid,p_case_id uuid,p_enforcement_number text,p_authority_name text,p_enforceable_amount numeric,
  p_next_action_date date,p_notes text,p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_case_enforcements LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid; v_case public.legal_cases%ROWTYPE; v_row public.legal_case_enforcements%ROWTYPE;
BEGIN
  v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  SELECT * INTO v_case FROM public.legal_cases WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND OR v_case.workflow_stage NOT IN ('judgment_issued','appeal','enforcement','collection') THEN RAISE EXCEPTION 'A judgment is required before enforcement'; END IF;
  INSERT INTO public.legal_case_enforcements(company_id,case_id,enforcement_number,status,filed_at,authority_name,enforceable_amount,next_action_date,notes,created_by)
  VALUES(p_company_id,p_case_id,NULLIF(BTRIM(COALESCE(p_enforcement_number,'')),''),'active',now(),NULLIF(BTRIM(COALESCE(p_authority_name,'')),''),COALESCE(p_enforceable_amount,v_case.outcome_amount,0),p_next_action_date,NULLIF(BTRIM(COALESCE(p_notes,'')),''),v_actor) RETURNING * INTO v_row;
  UPDATE public.legal_cases SET workflow_stage='enforcement',case_status='active',stage_updated_at=now(),updated_at=now() WHERE id=p_case_id;
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id,v_case.contract_id,'enforcement');
  IF p_next_action_date IS NOT NULL THEN PERFORM public.legal_workflow_create_task_v1(p_company_id,p_case_id,'enforcement:'||v_row.id::text,'Ù…ØªØ§Ø¨Ø¹Ø© ØªÙ†ÙÙŠØ° '||v_case.case_number,'Ù…ØªØ§Ø¨Ø¹Ø© Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„ØªÙ†ÙÙŠØ° Ø§Ù„Ù‚Ø§Ø¯Ù….',p_next_action_date::timestamptz,'urgent',v_actor); END IF;
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.record_legal_case_payment_v1(
  p_company_id uuid,p_case_id uuid,p_amount numeric,p_payment_date date,p_payment_method text,p_reference_number text,
  p_invoice_id uuid DEFAULT NULL,p_journal_entry_id uuid DEFAULT NULL,p_notes text DEFAULT NULL,p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_case_payments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid; v_case public.legal_cases%ROWTYPE; v_payment public.legal_case_payments%ROWTYPE; v_total numeric;
BEGIN
  v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  IF COALESCE(p_amount,0)<=0 OR p_payment_date IS NULL OR NULLIF(BTRIM(COALESCE(p_reference_number,'')),'') IS NULL THEN RAISE EXCEPTION 'Positive amount, date, and payment reference are required'; END IF;
  SELECT * INTO v_case FROM public.legal_cases WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND OR v_case.outcome_type IS NULL THEN RAISE EXCEPTION 'A recorded judgment is required before collection'; END IF;
  IF p_invoice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.invoices WHERE id=p_invoice_id AND company_id=p_company_id) THEN RAISE EXCEPTION 'Invoice is outside the company'; END IF;
  IF p_journal_entry_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.journal_entries WHERE id=p_journal_entry_id AND company_id=p_company_id AND lower(COALESCE(status,''))='posted') THEN RAISE EXCEPTION 'A posted journal entry is required'; END IF;
  INSERT INTO public.legal_case_payments(case_id,company_id,payment_type,description,amount,payment_date,payment_method,payment_status,invoice_id,journal_entry_id,notes,created_by,reference_number)
  VALUES(p_case_id,p_company_id,COALESCE(v_case.payment_direction,'receive'),'Ø¯ÙØ¹Ø© Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„Ø­ÙƒÙ…',p_amount,p_payment_date,NULLIF(BTRIM(COALESCE(p_payment_method,'')),''),'completed',p_invoice_id,p_journal_entry_id,NULLIF(BTRIM(COALESCE(p_notes,'')),''),v_actor,BTRIM(p_reference_number)) RETURNING * INTO v_payment;
  SELECT COALESCE(sum(amount),0) INTO v_total FROM public.legal_case_payments WHERE case_id=p_case_id AND company_id=p_company_id AND payment_status IN ('completed','paid','received');
  UPDATE public.legal_cases SET workflow_stage='collection',case_status='active',stage_updated_at=now(),
    outcome_payment_status=CASE WHEN v_total>=COALESCE(outcome_amount,0) THEN CASE WHEN payment_direction='pay' THEN 'paid' ELSE 'received' END ELSE 'partial' END,updated_at=now()
  WHERE id=p_case_id RETURNING * INTO v_case;
  UPDATE public.legal_case_enforcements SET collected_amount=v_total,status=CASE WHEN v_total>=enforceable_amount THEN 'collected' ELSE 'partially_collected' END,updated_at=now() WHERE case_id=p_case_id AND company_id=p_company_id AND status NOT IN ('closed','suspended');
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id,v_case.contract_id,'collection');
  INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,related_payment_id,new_values,created_by)
  VALUES(p_case_id,p_company_id,'payment_recorded','ØªØ³Ø¬ÙŠÙ„ ØªØ­ØµÙŠÙ„ Ù‚Ø§Ù†ÙˆÙ†ÙŠ','ØªÙ… Ø±Ø¨Ø· Ø¯ÙØ¹Ø© ÙØ¹Ù„ÙŠØ© Ø¨Ø§Ù„Ù‚Ø¶ÙŠØ©.',v_payment.id,to_jsonb(v_payment),v_actor);
  RETURN v_payment;
END; $$;

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
  INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,created_by)
  VALUES(p_case_id,p_company_id,'case_finally_closed','Ø§Ù„Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ Ù„Ù„Ù‚Ø¶ÙŠØ©',BTRIM(p_reason),v_actor);
  RETURN v_case;
END; $$;

CREATE OR REPLACE FUNCTION public.reopen_legal_case_v1(
  p_company_id uuid,p_case_id uuid,p_target_stage text,p_reason text,p_actor_id uuid DEFAULT NULL
) RETURNS public.legal_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid; v_case public.legal_cases%ROWTYPE;
BEGIN
  v_actor:=public.legal_workflow_actor_profile_v1(p_company_id,p_actor_id);
  IF auth.uid() IS NOT NULL AND NOT (public.is_company_admin(p_company_id) OR public.is_company_manager(p_company_id)) THEN RAISE EXCEPTION 'Manager permission is required to reopen a case' USING ERRCODE='42501'; END IF;
  IF p_target_stage NOT IN ('preparation','filed','hearings','judgment_issued','appeal','enforcement','collection') OR length(BTRIM(COALESCE(p_reason,'')))<10 THEN RAISE EXCEPTION 'A valid target stage and detailed reason are required'; END IF;
  SELECT * INTO v_case FROM public.legal_cases WHERE id=p_case_id AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND OR v_case.workflow_stage NOT IN ('closed','cancelled') THEN RAISE EXCEPTION 'Only closed or cancelled cases can be reopened'; END IF;
  PERFORM set_config('app.legal_workflow_reopen','allowed',true);
  UPDATE public.legal_cases SET workflow_stage=p_target_stage,case_status=CASE WHEN p_target_stage='preparation' THEN 'pending' ELSE 'active' END,stage_updated_at=now(),closed_at=NULL,closure_reason=NULL,reopened_at=now(),reopened_by=v_actor,reopen_reason=BTRIM(p_reason),updated_at=now() WHERE id=p_case_id RETURNING * INTO v_case;
  PERFORM public.legal_workflow_sync_contract_v1(p_company_id,v_case.contract_id,p_target_stage);
  INSERT INTO public.legal_case_activities(case_id,company_id,activity_type,activity_title,activity_description,new_values,created_by)
  VALUES(p_case_id,p_company_id,'case_reopened','Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Ø§Ù„Ù‚Ø¶ÙŠØ©',BTRIM(p_reason),jsonb_build_object('workflow_stage',p_target_stage),v_actor);
  RETURN v_case;
END; $$;

CREATE OR REPLACE FUNCTION public.run_legal_workflow_daily_guard_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_case record; v_actor uuid; v_created integer:=0; v_id uuid;
BEGIN
  FOR v_case IN SELECT * FROM public.legal_cases WHERE workflow_stage NOT IN ('closed','cancelled') LOOP
    SELECT id INTO v_actor FROM public.profiles WHERE company_id=v_case.company_id
      AND (id=v_case.created_by OR user_id=v_case.created_by) ORDER BY CASE WHEN id=v_case.created_by THEN 0 ELSE 1 END LIMIT 1;
    v_actor:=COALESCE(v_actor,(SELECT id FROM public.profiles WHERE company_id=v_case.company_id ORDER BY created_at LIMIT 1));
    IF v_case.hearing_date IS NOT NULL AND v_case.hearing_date <= now()+interval '3 days' THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'daily-hearing:'||v_case.id::text||':'||v_case.hearing_date::date::text,'Ø¬Ù„Ø³Ø© Ù‚Ø±ÙŠØ¨Ø©: '||v_case.case_number,'Ù…Ø±Ø§Ø¬Ø¹Ø© Ù…Ù„Ù Ø§Ù„Ø¬Ù„Ø³Ø© ÙˆØ§Ù„Ø·Ù„Ø¨Ø§Øª Ù‚Ø¨Ù„ Ø§Ù„Ù…ÙˆØ¹Ø¯.',v_case.hearing_date-interval '1 day','urgent',v_actor); IF v_id IS NOT NULL THEN v_created:=v_created+1; END IF;
    END IF;
    IF v_case.appeal_deadline IS NOT NULL AND v_case.appeal_deadline<=CURRENT_DATE+7 AND v_case.workflow_stage='judgment_issued' THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'daily-appeal:'||v_case.id::text||':'||v_case.appeal_deadline::text,'Ù…Ù‡Ù„Ø© Ø§Ø³ØªØ¦Ù†Ø§Ù: '||v_case.case_number,'ÙŠØ¬Ø¨ ØªØ³Ø¬ÙŠÙ„ Ù‚Ø±Ø§Ø± Ø§Ù„Ø§Ø³ØªØ¦Ù†Ø§Ù Ù‚Ø¨Ù„ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ù…Ù‡Ù„Ø©.',v_case.appeal_deadline::timestamptz-interval '2 days','urgent',v_actor); IF v_id IS NOT NULL THEN v_created:=v_created+1; END IF;
    END IF;
    IF v_case.workflow_stage IN ('judgment_issued','enforcement','collection') AND COALESCE(v_case.outcome_amount,0)>0 AND COALESCE(v_case.outcome_payment_status,'pending') NOT IN ('paid','received') THEN
      v_id:=public.legal_workflow_create_task_v1(v_case.company_id,v_case.id,'daily-collection:'||v_case.id::text,'Ù…ØªØ§Ø¨Ø¹Ø© ØªØ­ØµÙŠÙ„ Ø§Ù„Ø­ÙƒÙ…: '||v_case.case_number,'Ø§Ù„Ø­ÙƒÙ… Ø§Ù„Ù…Ø§Ù„ÙŠ Ù„Ù… ØªØªÙ… ØªØ³ÙˆÙŠØªÙ‡ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„.',now()+interval '1 day','high',v_actor); IF v_id IS NOT NULL THEN v_created:=v_created+1; END IF;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('tasks_checked_or_created',v_created,'ran_at',now());
END; $$;

-- Compatibility: old callers now record a judgment instead of prematurely closing the case.
CREATE OR REPLACE FUNCTION public.close_legal_case_outcome_v1(p_company_id uuid,p_case_id uuid,p_case_direction text,p_outcome_type text,p_outcome_amount numeric,p_outcome_amount_type text,p_payment_direction text,p_outcome_date date,p_outcome_notes text,p_actor_id uuid DEFAULT NULL)
RETURNS public.legal_cases LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT public.record_legal_case_judgment_v1(p_company_id,p_case_id,p_case_direction,p_outcome_type,p_outcome_amount,p_outcome_amount_type,p_payment_direction,p_outcome_date,NULL,p_outcome_notes,p_actor_id);
$$;

REVOKE ALL ON FUNCTION public.legal_workflow_actor_profile_v1(uuid,uuid),public.legal_workflow_sync_contract_v1(uuid,uuid,text),public.legal_workflow_create_task_v1(uuid,uuid,text,text,text,timestamptz,text,uuid),public.run_legal_workflow_daily_guard_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.transition_legal_case_workflow_v1(uuid,uuid,text,text,uuid),public.record_legal_case_hearing_v1(uuid,uuid,timestamptz,text,text,timestamptz,text,uuid),public.record_legal_case_judgment_v1(uuid,uuid,text,text,numeric,text,text,date,date,text,uuid),public.start_legal_case_enforcement_v1(uuid,uuid,text,text,numeric,date,text,uuid),public.record_legal_case_payment_v1(uuid,uuid,numeric,date,text,text,uuid,uuid,text,uuid),public.close_legal_case_final_v1(uuid,uuid,text,boolean,uuid),public.reopen_legal_case_v1(uuid,uuid,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.run_legal_workflow_daily_guard_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_legal_case_workflow_v1(uuid,uuid,text,text,uuid),public.record_legal_case_hearing_v1(uuid,uuid,timestamptz,text,text,timestamptz,text,uuid),public.record_legal_case_judgment_v1(uuid,uuid,text,text,numeric,text,text,date,date,text,uuid),public.start_legal_case_enforcement_v1(uuid,uuid,text,text,numeric,date,text,uuid),public.record_legal_case_payment_v1(uuid,uuid,numeric,date,text,text,uuid,uuid,text,uuid),public.close_legal_case_final_v1(uuid,uuid,text,boolean,uuid),public.reopen_legal_case_v1(uuid,uuid,text,text,uuid) TO authenticated,service_role;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='daily-legal-workflow-guard-v1';
SELECT cron.schedule('daily-legal-workflow-guard-v1','30 2 * * *',$$SELECT public.run_legal_workflow_daily_guard_v1();$$);

-- Normalize the known case and every similar reopened judgment to its actionable stage.
UPDATE public.legal_cases SET workflow_stage='collection',case_status='active',stage_updated_at=now(),updated_at=now()
WHERE outcome_type IS NOT NULL AND COALESCE(outcome_amount,0)>0 AND COALESCE(outcome_payment_status,'pending') NOT IN ('paid','received')
  AND workflow_stage NOT IN ('closed','cancelled','collection');

;
