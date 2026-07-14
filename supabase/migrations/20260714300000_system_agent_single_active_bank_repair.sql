-- Assign a bank-like payment only when its company has one active bank.
INSERT INTO public.system_agent_command_registry(
  command,domain,description,entity_table,allowed_fields,reversible,
  approval_required,closed_period_policy,min_confidence,enabled
)
VALUES(
  'accounting.assign_single_active_bank','accounting',
  'Assign the company single active bank to an unreconciled bank-like payment.',
  'payments',ARRAY['bank_id'],true,false,'allow_derived',1.0,true
)
ON CONFLICT(command) DO UPDATE SET
  domain=EXCLUDED.domain,description=EXCLUDED.description,
  entity_table=EXCLUDED.entity_table,allowed_fields=EXCLUDED.allowed_fields,
  reversible=true,approval_required=false,
  closed_period_policy=EXCLUDED.closed_period_policy,min_confidence=1.0,
  enabled=true,updated_at=now();

CREATE OR REPLACE FUNCTION public.system_agent_apply_bank_payment_integrity_repair_v1(
  p_run_id uuid,p_job_id uuid,p_finding_id uuid,p_command text,
  p_company_id uuid,p_entity_id text,
  p_expected_before jsonb DEFAULT '{}'::jsonb,
  p_values jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_job public.system_agent_jobs%ROWTYPE;
  v_finding public.system_agent_findings%ROWTYPE;
  v_registry public.system_agent_command_registry%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_bank_id uuid;
  v_bank_count integer;
  v_before jsonb;
  v_after jsonb;
  v_repair_id uuid:=gen_random_uuid();
BEGIN
  IF p_command<>'accounting.assign_single_active_bank' THEN
    RAISE EXCEPTION 'Unsupported bank payment repair command';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('system-agent:payment:'||p_entity_id,0));

  SELECT * INTO v_job FROM public.system_agent_jobs
  WHERE id=p_job_id AND run_id=p_run_id AND company_id=p_company_id FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status<>'running' OR v_job.mode<>'apply' OR v_job.domain<>'accounting' THEN
    RAISE EXCEPTION 'Accounting agent job is not an active apply job';
  END IF;

  SELECT * INTO v_finding FROM public.system_agent_findings
  WHERE id=p_finding_id AND run_id=p_run_id AND job_id=p_job_id AND company_id=p_company_id FOR UPDATE;
  IF v_finding.id IS NULL OR v_finding.repair_command IS DISTINCT FROM p_command
     OR v_finding.entity_id IS DISTINCT FROM p_entity_id
     OR v_finding.status IN('repaired','rolled_back') THEN
    RAISE EXCEPTION 'Bank payment finding is invalid or stale';
  END IF;

  SELECT * INTO v_registry FROM public.system_agent_command_registry
  WHERE command=p_command AND domain='accounting' AND enabled AND reversible AND NOT approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence<v_registry.min_confidence THEN
    RAISE EXCEPTION 'Bank payment repair command is disabled or below confidence threshold';
  END IF;
  IF EXISTS(
    SELECT 1 FROM jsonb_object_keys(COALESCE(p_values,'{}'::jsonb)) supplied(field_name)
    WHERE NOT supplied.field_name=ANY(v_registry.allowed_fields)
  ) THEN
    RAISE EXCEPTION 'Repair payload contains a field outside the command registry';
  END IF;

  SELECT * INTO v_payment FROM public.payments
  WHERE id=p_entity_id::uuid AND company_id=p_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment was not found in the active company'; END IF;
  IF v_payment.bank_id IS NOT NULL THEN
    RAISE EXCEPTION 'Payment already has a bank';
  END IF;
  IF lower(COALESCE(v_payment.payment_status::text,'')) NOT IN ('completed','paid','succeeded','success') THEN
    RAISE EXCEPTION 'Payment is not completed';
  END IF;
  IF lower(COALESCE(v_payment.payment_method::text,'')) NOT IN
     ('bank_transfer','check','cheque','credit_card','debit_card','card') THEN
    RAISE EXCEPTION 'Payment method is not bank-like';
  END IF;
  IF lower(COALESCE(v_payment.reconciliation_status::text,''))='reconciled'
     OR v_payment.reconciled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Payment is already reconciled';
  END IF;

  SELECT (array_agg(bank.id ORDER BY bank.id))[1],count(*)
  INTO v_bank_id,v_bank_count
  FROM public.banks bank
  WHERE bank.company_id=p_company_id AND bank.is_active IS TRUE;
  IF v_bank_count<>1 OR v_bank_id IS NULL THEN
    RAISE EXCEPTION 'Company no longer has exactly one active bank';
  END IF;
  IF NULLIF(p_values->>'bank_id','')::uuid IS DISTINCT FROM v_bank_id THEN
    RAISE EXCEPTION 'Detected bank no longer matches the single active bank';
  END IF;

  v_before:=public.system_agent_pick_fields(to_jsonb(v_payment),v_registry.allowed_fields);
  IF COALESCE(p_expected_before,'{}'::jsonb)<>'{}'::jsonb
     AND NOT(v_before@>p_expected_before) THEN
    RAISE EXCEPTION 'Payment changed after detection';
  END IF;

  UPDATE public.payments SET bank_id=v_bank_id,updated_at=now()
  WHERE id=v_payment.id AND company_id=p_company_id AND bank_id IS NULL;
  SELECT * INTO v_payment FROM public.payments WHERE id=p_entity_id::uuid;
  v_after:=public.system_agent_pick_fields(to_jsonb(v_payment),v_registry.allowed_fields);
  IF v_payment.bank_id IS DISTINCT FROM v_bank_id THEN
    RAISE EXCEPTION 'Bank payment repair verification failed';
  END IF;

  INSERT INTO public.system_agent_repairs(
    id,run_id,job_id,finding_id,company_id,domain,command,entity_table,
    entity_id,before_state,after_state,rollback_metadata
  ) VALUES(
    v_repair_id,p_run_id,p_job_id,p_finding_id,p_company_id,'accounting',
    p_command,'payments',p_entity_id,v_before,v_after,
    COALESCE(p_metadata,'{}'::jsonb)||jsonb_build_object(
      'handler_version','payment_single_active_bank_v1','verified_bank_id',v_bank_id
    )
  );
  UPDATE public.system_agent_findings SET
    status='repaired',repair_id=v_repair_id,error=NULL,updated_at=now()
  WHERE id=p_finding_id;
  RETURN jsonb_build_object('status','repaired','repair_id',v_repair_id,'before',v_before,'after',v_after);
END; $$;

REVOKE ALL ON FUNCTION public.system_agent_apply_bank_payment_integrity_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_bank_payment_integrity_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) TO service_role;

DO $$ BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_payment_single_active_bank_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid,text)
      RENAME TO system_agent_rollback_repair_before_payment_single_active_bank_v1;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_payment_single_active_bank_v1(uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.system_agent_rollback_repair(
  p_repair_id uuid,p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_repair public.system_agent_repairs%ROWTYPE;
  v_current jsonb;
BEGIN
  SELECT * INTO v_repair FROM public.system_agent_repairs WHERE id=p_repair_id FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;
  IF COALESCE(v_repair.rollback_metadata->>'handler_version','')<>'payment_single_active_bank_v1' THEN
    RETURN public.system_agent_rollback_repair_before_payment_single_active_bank_v1(p_repair_id,p_reason);
  END IF;
  IF v_repair.status='rolled_back' THEN
    RETURN jsonb_build_object('repair_id',p_repair_id,'status','rolled_back');
  END IF;
  IF v_repair.status<>'applied' THEN
    RAISE EXCEPTION 'Only an applied bank payment repair can be rolled back';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('system-agent:payment:'||v_repair.entity_id,0));
  SELECT public.system_agent_pick_fields(to_jsonb(payment),ARRAY['bank_id']::text[])
  INTO v_current FROM public.payments payment
  WHERE id=v_repair.entity_id::uuid AND company_id=v_repair.company_id FOR UPDATE;
  IF v_current IS DISTINCT FROM v_repair.after_state THEN
    RAISE EXCEPTION 'Payment changed after repair; rollback was safely aborted';
  END IF;
  UPDATE public.payments SET
    bank_id=NULLIF(v_repair.before_state->>'bank_id','')::uuid,updated_at=now()
  WHERE id=v_repair.entity_id::uuid AND company_id=v_repair.company_id;
  UPDATE public.system_agent_repairs SET
    status='rolled_back',rolled_back_at=now(),
    rollback_reason=left(COALESCE(NULLIF(BTRIM(p_reason),''),'System agent rollback'),1000),
    error=NULL,updated_at=now()
  WHERE id=p_repair_id;
  UPDATE public.system_agent_findings SET status='rolled_back',error=NULL,updated_at=now()
  WHERE id=v_repair.finding_id;
  RETURN jsonb_build_object('repair_id',p_repair_id,'status','rolled_back');
END; $$;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text) TO service_role;
