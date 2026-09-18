-- Deterministic legal integrity repairs with audited rollback support.

INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES
  ('legal.sync_contract_state', 'legal', 'Synchronize a contract that has a non-terminal legal case.', 'contracts', ARRAY['status','suspension_reason'], true, false, 'not_applicable', 1.0, true),
  ('legal.reset_unsupported_repayment', 'legal', 'Reset a paid repayment installment that has no completed legal payment evidence.', 'legal_repayment_plans', ARRAY['status'], true, false, 'not_applicable', 1.0, true)
ON CONFLICT (command) DO UPDATE SET
  domain=EXCLUDED.domain, description=EXCLUDED.description,
  entity_table=EXCLUDED.entity_table, allowed_fields=EXCLUDED.allowed_fields,
  reversible=EXCLUDED.reversible, approval_required=EXCLUDED.approval_required,
  closed_period_policy=EXCLUDED.closed_period_policy,
  min_confidence=EXCLUDED.min_confidence, enabled=EXCLUDED.enabled, updated_at=now();
CREATE OR REPLACE FUNCTION public.system_agent_apply_legal_integrity_repair_v1(
  p_run_id uuid, p_job_id uuid, p_finding_id uuid, p_command text,
  p_company_id uuid, p_entity_id text, p_expected_before jsonb DEFAULT '{}'::jsonb,
  p_values jsonb DEFAULT '{}'::jsonb, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_job public.system_agent_jobs%ROWTYPE; v_finding public.system_agent_findings%ROWTYPE;
  v_registry public.system_agent_command_registry%ROWTYPE; v_contract public.contracts%ROWTYPE;
  v_plan public.legal_repayment_plans%ROWTYPE; v_before jsonb; v_after jsonb;
  v_repair_id uuid:=gen_random_uuid(); v_target_status text; v_case_number text; v_supporting_payments integer; v_paid_rank integer;
BEGIN
  IF p_command NOT IN ('legal.sync_contract_state','legal.reset_unsupported_repayment') THEN RAISE EXCEPTION 'Unsupported legal repair command'; END IF;
  SELECT * INTO v_job FROM public.system_agent_jobs WHERE id=p_job_id AND run_id=p_run_id AND company_id=p_company_id FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status<>'running' OR v_job.mode<>'apply' OR v_job.domain<>'legal' THEN RAISE EXCEPTION 'Legal agent job is not an active apply job'; END IF;
  SELECT * INTO v_finding FROM public.system_agent_findings WHERE id=p_finding_id AND run_id=p_run_id AND job_id=p_job_id AND company_id=p_company_id FOR UPDATE;
  IF v_finding.id IS NULL OR v_finding.repair_command IS DISTINCT FROM p_command OR v_finding.entity_id IS DISTINCT FROM p_entity_id OR v_finding.status IN('repaired','rolled_back') THEN RAISE EXCEPTION 'Legal finding is invalid or stale'; END IF;
  SELECT * INTO v_registry FROM public.system_agent_command_registry WHERE command=p_command AND domain='legal' AND enabled AND reversible AND NOT approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence<v_registry.min_confidence THEN RAISE EXCEPTION 'Legal repair command is disabled or below confidence threshold'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(COALESCE(p_values,'{}'::jsonb)) supplied(field_name) WHERE NOT supplied.field_name=ANY(v_registry.allowed_fields)) THEN RAISE EXCEPTION 'Repair payload contains a field outside the command registry'; END IF;

  IF p_command='legal.sync_contract_state' THEN
    SELECT * INTO v_contract FROM public.contracts WHERE id=p_entity_id::uuid AND company_id=p_company_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Contract is outside the active company'; END IF;
    SELECT case_number INTO v_case_number FROM public.legal_cases
      WHERE company_id=p_company_id AND contract_id=v_contract.id
        AND lower(COALESCE(case_status,'')) IN('open','active','pending','on_hold','under_review')
      ORDER BY created_at LIMIT 1;
    IF v_case_number IS NULL THEN RAISE EXCEPTION 'No non-terminal legal case supports changing this contract'; END IF;
    v_before:=public.system_agent_pick_fields(to_jsonb(v_contract),v_registry.allowed_fields);
    IF COALESCE(p_expected_before,'{}'::jsonb)<>'{}'::jsonb AND NOT (v_before@>p_expected_before) THEN RAISE EXCEPTION 'Contract changed after detection'; END IF;
    UPDATE public.contracts SET status='under_legal_procedure', suspension_reason='Open legal case: '||v_case_number, updated_at=now()
      WHERE id=v_contract.id AND company_id=p_company_id;
    SELECT * INTO v_contract FROM public.contracts WHERE id=p_entity_id::uuid;
    v_after:=public.system_agent_pick_fields(to_jsonb(v_contract),v_registry.allowed_fields);
    IF lower(COALESCE(v_contract.status::text,''))<>'under_legal_procedure' THEN RAISE EXCEPTION 'Contract legal state verification failed'; END IF;
  ELSE
    SELECT * INTO v_plan FROM public.legal_repayment_plans WHERE id=p_entity_id::uuid AND company_id=p_company_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Repayment plan is outside the active company'; END IF;
    v_before:=public.system_agent_pick_fields(to_jsonb(v_plan),v_registry.allowed_fields);
    IF COALESCE(p_expected_before,'{}'::jsonb)<>'{}'::jsonb AND NOT (v_before@>p_expected_before) THEN RAISE EXCEPTION 'Repayment plan changed after detection'; END IF;
    IF lower(COALESCE(v_plan.status,''))<>'paid' THEN RAISE EXCEPTION 'Repayment installment is no longer marked paid'; END IF;
    SELECT count(*) INTO v_supporting_payments FROM public.legal_case_payments payment WHERE payment.company_id=p_company_id AND payment.case_id=v_plan.case_id AND lower(COALESCE(payment.payment_status,'')) IN('paid','completed','success','succeeded') AND abs(payment.amount-v_plan.amount)<=0.01;
    SELECT count(*) INTO v_paid_rank FROM public.legal_repayment_plans ranked WHERE ranked.company_id=p_company_id AND ranked.case_id=v_plan.case_id AND lower(COALESCE(ranked.status,''))='paid' AND abs(ranked.amount-v_plan.amount)<=0.01 AND (ranked.due_date<v_plan.due_date OR (ranked.due_date=v_plan.due_date AND ranked.id<=v_plan.id));
    IF v_supporting_payments>=v_paid_rank THEN RAISE EXCEPTION 'Completed legal payment evidence now supports this installment'; END IF;
    v_target_status:=CASE WHEN v_plan.due_date<CURRENT_DATE THEN 'overdue' ELSE 'pending' END;
    UPDATE public.legal_repayment_plans SET status=v_target_status,updated_at=now() WHERE id=v_plan.id AND company_id=p_company_id;
    SELECT * INTO v_plan FROM public.legal_repayment_plans WHERE id=p_entity_id::uuid;
    v_after:=public.system_agent_pick_fields(to_jsonb(v_plan),v_registry.allowed_fields);
    IF lower(COALESCE(v_plan.status,''))<>v_target_status THEN RAISE EXCEPTION 'Repayment status verification failed'; END IF;
  END IF;

  IF v_before IS NOT DISTINCT FROM v_after THEN
    UPDATE public.system_agent_findings SET status='ignored',repair_id=NULL,error=NULL,updated_at=now() WHERE id=p_finding_id;
    RETURN jsonb_build_object('status','verified_no_change','command',p_command,'entity_id',p_entity_id,'state',v_after);
  END IF;
  INSERT INTO public.system_agent_repairs(id,run_id,job_id,finding_id,company_id,domain,command,entity_table,entity_id,before_state,after_state,rollback_metadata)
  VALUES(v_repair_id,p_run_id,p_job_id,p_finding_id,p_company_id,'legal',p_command,v_registry.entity_table,p_entity_id,v_before,v_after,COALESCE(p_metadata,'{}'::jsonb)||jsonb_build_object('handler_version','legal_integrity_v1'));
  UPDATE public.system_agent_findings SET status='repaired',repair_id=v_repair_id,error=NULL,updated_at=now() WHERE id=p_finding_id;
  RETURN jsonb_build_object('status','repaired','repair_id',v_repair_id,'command',p_command,'entity_id',p_entity_id,'before',v_before,'after',v_after);
END; $$;
REVOKE ALL ON FUNCTION public.system_agent_apply_legal_integrity_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_legal_integrity_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) TO service_role;
DO $$ BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_legal_integrity_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid,text) RENAME TO system_agent_rollback_repair_before_legal_integrity_v1;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_legal_integrity_v1(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.system_agent_rollback_repair(p_repair_id uuid,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_repair public.system_agent_repairs%ROWTYPE; v_current jsonb;
BEGIN
  SELECT * INTO v_repair FROM public.system_agent_repairs WHERE id=p_repair_id FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;
  IF COALESCE(v_repair.rollback_metadata->>'handler_version','')<>'legal_integrity_v1' THEN
    RETURN public.system_agent_rollback_repair_before_legal_integrity_v1(p_repair_id,p_reason);
  END IF;
  IF v_repair.status='rolled_back' THEN RETURN jsonb_build_object('repair_id',p_repair_id,'status','rolled_back'); END IF;
  IF v_repair.status<>'applied' THEN RAISE EXCEPTION 'Only an applied legal repair can be rolled back'; END IF;
  IF v_repair.command='legal.sync_contract_state' THEN
    SELECT public.system_agent_pick_fields(to_jsonb(contract),ARRAY['status','suspension_reason']::text[]) INTO v_current FROM public.contracts contract WHERE id=v_repair.entity_id::uuid AND company_id=v_repair.company_id FOR UPDATE;
    IF v_current IS DISTINCT FROM v_repair.after_state THEN RAISE EXCEPTION 'Contract changed after repair; rollback was safely aborted'; END IF;
    UPDATE public.contracts SET status=v_repair.before_state->>'status',suspension_reason=v_repair.before_state->>'suspension_reason',updated_at=now() WHERE id=v_repair.entity_id::uuid AND company_id=v_repair.company_id;
  ELSIF v_repair.command='legal.reset_unsupported_repayment' THEN
    SELECT public.system_agent_pick_fields(to_jsonb(plan),ARRAY['status']::text[]) INTO v_current FROM public.legal_repayment_plans plan WHERE id=v_repair.entity_id::uuid AND company_id=v_repair.company_id FOR UPDATE;
    IF v_current IS DISTINCT FROM v_repair.after_state THEN RAISE EXCEPTION 'Repayment plan changed after repair; rollback was safely aborted'; END IF;
    UPDATE public.legal_repayment_plans SET status=v_repair.before_state->>'status',updated_at=now() WHERE id=v_repair.entity_id::uuid AND company_id=v_repair.company_id;
  ELSE RAISE EXCEPTION 'Unsupported legal rollback command'; END IF;
  UPDATE public.system_agent_repairs SET status='rolled_back',rolled_back_at=now(),rollback_reason=left(COALESCE(NULLIF(BTRIM(p_reason),''),'System agent rollback'),1000),error=NULL,updated_at=now() WHERE id=p_repair_id;
  UPDATE public.system_agent_findings SET status='rolled_back',error=NULL,updated_at=now() WHERE id=v_repair.finding_id;
  RETURN jsonb_build_object('repair_id',p_repair_id,'status','rolled_back');
END; $$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text) TO service_role;
