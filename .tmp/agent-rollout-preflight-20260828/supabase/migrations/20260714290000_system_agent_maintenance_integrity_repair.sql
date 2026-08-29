-- Link only a single verified, posted, amount-matched maintenance journal.
INSERT INTO public.system_agent_command_registry(command,domain,description,entity_table,allowed_fields,reversible,approval_required,closed_period_policy,min_confidence,enabled)
VALUES('maintenance.sync_accounting_link','fleet','Link the one verified maintenance journal and synchronize its expense flag.','vehicle_maintenance',ARRAY['journal_entry_id','expense_recorded'],true,false,'allow_derived',1.0,true)
ON CONFLICT(command) DO UPDATE SET domain=EXCLUDED.domain,description=EXCLUDED.description,entity_table=EXCLUDED.entity_table,allowed_fields=EXCLUDED.allowed_fields,reversible=true,approval_required=false,closed_period_policy=EXCLUDED.closed_period_policy,min_confidence=1.0,enabled=true,updated_at=now();
CREATE OR REPLACE FUNCTION public.system_agent_apply_maintenance_integrity_repair_v1(
 p_run_id uuid,p_job_id uuid,p_finding_id uuid,p_command text,p_company_id uuid,p_entity_id text,
 p_expected_before jsonb DEFAULT '{}'::jsonb,p_values jsonb DEFAULT '{}'::jsonb,p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_job public.system_agent_jobs%ROWTYPE; v_finding public.system_agent_findings%ROWTYPE; v_registry public.system_agent_command_registry%ROWTYPE; v_maintenance public.vehicle_maintenance%ROWTYPE; v_before jsonb; v_after jsonb; v_journal_id uuid; v_candidate_count integer; v_amount numeric; v_repair_id uuid:=gen_random_uuid();
BEGIN
 IF p_command<>'maintenance.sync_accounting_link' THEN RAISE EXCEPTION 'Unsupported maintenance repair command'; END IF;
 SELECT * INTO v_job FROM public.system_agent_jobs WHERE id=p_job_id AND run_id=p_run_id AND company_id=p_company_id FOR UPDATE;
 IF v_job.id IS NULL OR v_job.status<>'running' OR v_job.mode<>'apply' OR v_job.domain<>'fleet' THEN RAISE EXCEPTION 'Fleet agent job is not an active apply job'; END IF;
 SELECT * INTO v_finding FROM public.system_agent_findings WHERE id=p_finding_id AND run_id=p_run_id AND job_id=p_job_id AND company_id=p_company_id FOR UPDATE;
 IF v_finding.id IS NULL OR v_finding.repair_command IS DISTINCT FROM p_command OR v_finding.entity_id IS DISTINCT FROM p_entity_id OR v_finding.status IN('repaired','rolled_back') THEN RAISE EXCEPTION 'Maintenance finding is invalid or stale'; END IF;
 SELECT * INTO v_registry FROM public.system_agent_command_registry WHERE command=p_command AND domain='fleet' AND enabled AND reversible AND NOT approval_required;
 IF v_registry.command IS NULL OR v_finding.confidence<v_registry.min_confidence THEN RAISE EXCEPTION 'Maintenance repair command is disabled or below confidence threshold'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(COALESCE(p_values,'{}'::jsonb)) supplied(field_name) WHERE NOT supplied.field_name=ANY(v_registry.allowed_fields)) THEN RAISE EXCEPTION 'Repair payload contains a field outside the command registry'; END IF;
 SELECT * INTO v_maintenance FROM public.vehicle_maintenance WHERE id=p_entity_id::uuid AND company_id=p_company_id FOR UPDATE;
 IF NOT FOUND OR lower(COALESCE(v_maintenance.status::text,''))<>'completed' THEN RAISE EXCEPTION 'Completed maintenance was not found in the active company'; END IF;
 v_amount:=round((CASE WHEN COALESCE(v_maintenance.total_cost_with_tax,0)>0 THEN v_maintenance.total_cost_with_tax ELSE COALESCE(v_maintenance.actual_cost,0)+COALESCE(v_maintenance.tax_amount,0) END)::numeric,2);
 IF v_amount<=0.01 THEN RAISE EXCEPTION 'Maintenance has no positive verified amount'; END IF;
 SELECT (array_agg(entry.id ORDER BY entry.id))[1],count(*) INTO v_journal_id,v_candidate_count FROM public.journal_entries entry
 WHERE entry.company_id=p_company_id AND entry.reference_id=v_maintenance.id AND lower(COALESCE(entry.reference_type,''))='maintenance'
   AND lower(COALESCE(entry.status,''))='posted' AND entry.reversal_entry_id IS NULL
   AND abs(COALESCE(entry.total_debit,0)-v_amount)<=0.01 AND abs(COALESCE(entry.total_credit,0)-v_amount)<=0.01
   AND EXISTS(SELECT 1 FROM public.journal_entry_lines line WHERE line.journal_entry_id=entry.id)
   AND abs(COALESCE((SELECT sum(line.debit_amount) FROM public.journal_entry_lines line WHERE line.journal_entry_id=entry.id),0)-v_amount)<=0.01
   AND abs(COALESCE((SELECT sum(line.credit_amount) FROM public.journal_entry_lines line WHERE line.journal_entry_id=entry.id),0)-v_amount)<=0.01;
 IF v_candidate_count<>1 THEN RAISE EXCEPTION 'Maintenance does not have exactly one verified accounting candidate'; END IF;
 IF v_maintenance.journal_entry_id IS NOT NULL AND v_maintenance.journal_entry_id<>v_journal_id THEN RAISE EXCEPTION 'Maintenance already points to a different journal'; END IF;
 v_before:=public.system_agent_pick_fields(to_jsonb(v_maintenance),v_registry.allowed_fields);
 IF COALESCE(p_expected_before,'{}'::jsonb)<>'{}'::jsonb AND NOT(v_before@>p_expected_before) THEN RAISE EXCEPTION 'Maintenance changed after detection'; END IF;
 UPDATE public.vehicle_maintenance SET journal_entry_id=v_journal_id,expense_recorded=true,updated_at=now() WHERE id=v_maintenance.id AND company_id=p_company_id;
 SELECT * INTO v_maintenance FROM public.vehicle_maintenance WHERE id=p_entity_id::uuid;
 v_after:=public.system_agent_pick_fields(to_jsonb(v_maintenance),v_registry.allowed_fields);
 IF v_maintenance.journal_entry_id IS DISTINCT FROM v_journal_id OR v_maintenance.expense_recorded IS DISTINCT FROM true THEN RAISE EXCEPTION 'Maintenance accounting link verification failed'; END IF;
 IF v_before IS NOT DISTINCT FROM v_after THEN UPDATE public.system_agent_findings SET status='ignored',repair_id=NULL,error=NULL,updated_at=now() WHERE id=p_finding_id; RETURN jsonb_build_object('status','verified_no_change','state',v_after); END IF;
 INSERT INTO public.system_agent_repairs(id,run_id,job_id,finding_id,company_id,domain,command,entity_table,entity_id,before_state,after_state,rollback_metadata)
 VALUES(v_repair_id,p_run_id,p_job_id,p_finding_id,p_company_id,'fleet',p_command,'vehicle_maintenance',p_entity_id,v_before,v_after,COALESCE(p_metadata,'{}'::jsonb)||jsonb_build_object('handler_version','maintenance_integrity_v1','verified_journal_id',v_journal_id,'amount',v_amount));
 UPDATE public.system_agent_findings SET status='repaired',repair_id=v_repair_id,error=NULL,updated_at=now() WHERE id=p_finding_id;
 RETURN jsonb_build_object('status','repaired','repair_id',v_repair_id,'before',v_before,'after',v_after);
END; $$;
REVOKE ALL ON FUNCTION public.system_agent_apply_maintenance_integrity_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_maintenance_integrity_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) TO service_role;
DO $$ BEGIN IF to_regprocedure('public.system_agent_rollback_repair_before_maintenance_integrity_v1(uuid,text)') IS NULL THEN ALTER FUNCTION public.system_agent_rollback_repair(uuid,text) RENAME TO system_agent_rollback_repair_before_maintenance_integrity_v1; END IF; END $$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_maintenance_integrity_v1(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.system_agent_rollback_repair(p_repair_id uuid,p_reason text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_repair public.system_agent_repairs%ROWTYPE; v_current jsonb;
BEGIN
 SELECT * INTO v_repair FROM public.system_agent_repairs WHERE id=p_repair_id FOR UPDATE; IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;
 IF COALESCE(v_repair.rollback_metadata->>'handler_version','')<>'maintenance_integrity_v1' THEN RETURN public.system_agent_rollback_repair_before_maintenance_integrity_v1(p_repair_id,p_reason); END IF;
 IF v_repair.status='rolled_back' THEN RETURN jsonb_build_object('repair_id',p_repair_id,'status','rolled_back'); END IF; IF v_repair.status<>'applied' THEN RAISE EXCEPTION 'Only an applied maintenance repair can be rolled back'; END IF;
 SELECT public.system_agent_pick_fields(to_jsonb(maintenance),ARRAY['journal_entry_id','expense_recorded']::text[]) INTO v_current FROM public.vehicle_maintenance maintenance WHERE id=v_repair.entity_id::uuid AND company_id=v_repair.company_id FOR UPDATE;
 IF v_current IS DISTINCT FROM v_repair.after_state THEN RAISE EXCEPTION 'Maintenance changed after repair; rollback was safely aborted'; END IF;
 UPDATE public.vehicle_maintenance SET journal_entry_id=NULLIF(v_repair.before_state->>'journal_entry_id','')::uuid,expense_recorded=COALESCE((v_repair.before_state->>'expense_recorded')::boolean,false),updated_at=now() WHERE id=v_repair.entity_id::uuid AND company_id=v_repair.company_id;
 UPDATE public.system_agent_repairs SET status='rolled_back',rolled_back_at=now(),rollback_reason=left(COALESCE(NULLIF(BTRIM(p_reason),''),'System agent rollback'),1000),error=NULL,updated_at=now() WHERE id=p_repair_id;
 UPDATE public.system_agent_findings SET status='rolled_back',error=NULL,updated_at=now() WHERE id=v_repair.finding_id;
 RETURN jsonb_build_object('repair_id',p_repair_id,'status','rolled_back');
END; $$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text) TO service_role;
