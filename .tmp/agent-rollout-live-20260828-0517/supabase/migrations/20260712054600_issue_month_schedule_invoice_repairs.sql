begin;
create or replace function public.system_agent_apply_contract_invoice_issue_month_repair_v4(
  p_run_id uuid,
  p_job_id uuid,
  p_finding_id uuid,
  p_command text,
  p_company_id uuid,
  p_entity_id text,
  p_expected_before jsonb default '{}'::jsonb,
  p_values jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.system_agent_jobs%rowtype;
  v_finding public.system_agent_findings%rowtype;
  v_registry public.system_agent_command_registry%rowtype;
  v_contract public.contracts%rowtype;
  v_schedule public.contract_payment_schedules%rowtype;
  v_invoice public.invoices%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_expected_matches boolean := false;
  v_candidate_count integer := 0;
  v_candidate_id uuid;
  v_created_invoice_id uuid;
  v_month date;
  v_repair_id uuid := gen_random_uuid();
  v_repair_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if p_command not in ('schedule.repair_invoice_link', 'contract.generate_missing_invoice') then
    raise exception 'Issue-month invoice gateway received an unsupported command';
  end if;
  if coalesce(p_values, '{}'::jsonb) <> '{}'::jsonb then
    raise exception 'Issue-month invoice repairs derive all target values inside the canonical gateway';
  end if;

  select * into v_job
  from public.system_agent_jobs job
  where job.id = p_job_id
    and job.run_id = p_run_id
    and job.company_id = p_company_id
  for update;
  if v_job.id is null or v_job.status <> 'running' or v_job.mode <> 'apply' or v_job.domain <> 'contracts' then
    raise exception 'System agent job is not an active contract apply job';
  end if;

  select * into v_finding
  from public.system_agent_findings finding
  where finding.id = p_finding_id
    and finding.run_id = p_run_id
    and finding.job_id = p_job_id
    and finding.company_id = p_company_id
  for update;
  if v_finding.id is null
     or v_finding.repair_command is distinct from p_command
     or v_finding.entity_type <> 'contract_payment_schedule'
     or v_finding.entity_id <> p_entity_id
  then
    raise exception 'Finding does not authorize this issue-month repair';
  end if;

  select * into v_registry
  from public.system_agent_command_registry registry
  where registry.command = p_command and registry.enabled = true;
  if v_registry.command is null or v_registry.entity_table <> 'contract_payment_schedules' then
    raise exception 'Issue-month repair command is not enabled for contract schedules';
  end if;

  select * into v_schedule
  from public.contract_payment_schedules schedule
  where schedule.id = p_entity_id::uuid
    and schedule.company_id = p_company_id
  for update;
  if not found then raise exception 'Schedule is outside the active company'; end if;

  select * into v_contract
  from public.contracts contract
  where contract.id = v_schedule.contract_id
    and contract.company_id = p_company_id
  for update;
  if not found then raise exception 'Schedule contract is outside the active company'; end if;

  if lower(coalesce(v_schedule.status, '')) in ('cancelled', 'canceled', 'void', 'voided', 'deleted')
     or lower(coalesce(v_contract.status::text, '')) <> 'active'
     or v_contract.start_date is null
     or v_contract.end_date is null
     or v_schedule.due_date < v_contract.start_date
     or v_schedule.due_date > v_contract.end_date
     or coalesce(v_schedule.amount, 0) <= 0.01
  then
    raise exception 'Schedule and active contract lifecycle do not permit issue-month invoice repair';
  end if;

  v_before := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
  v_expected_matches := coalesce(p_expected_before, '{}'::jsonb) = '{}'::jsonb
    or v_before @> p_expected_before;
  if not v_expected_matches then
    raise exception 'Schedule changed after issue-month detection';
  end if;

  v_month := date_trunc('month', v_schedule.due_date)::date;
  select count(*), (array_agg(invoice.id order by invoice.id))[1]
  into v_candidate_count, v_candidate_id
  from public.invoices invoice
  where invoice.company_id = p_company_id
    and invoice.contract_id = v_contract.id
    and date_trunc('month', coalesce(invoice.invoice_date, invoice.due_date))::date = v_month
    and lower(coalesce(invoice.status, '')) not in ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    and lower(coalesce(invoice.payment_status, '')) not in ('cancelled', 'canceled', 'void', 'voided');

  if v_candidate_count > 1 then
    raise exception 'Schedule has multiple active issue-month invoice candidates';
  elsif v_candidate_count = 0 then
    if v_registry.closed_period_policy = 'block'
       and public.system_agent_date_in_closed_period(p_company_id, v_schedule.due_date)
    then
      raise exception 'Issue-month invoice generation is blocked by a closed accounting period';
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(p_company_id::text || ':' || v_contract.id::text || ':' || to_char(v_month, 'YYYY-MM'), 0)
    );
    v_created_invoice_id := public.generate_invoice_for_contract_month(v_contract.id, v_month);
    if v_created_invoice_id is null then
      select invoice.id into v_created_invoice_id
      from public.invoices invoice
      where invoice.company_id = p_company_id
        and invoice.contract_id = v_contract.id
        and date_trunc('month', coalesce(invoice.invoice_date, invoice.due_date))::date = v_month
        and lower(coalesce(invoice.status, '')) not in ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      order by invoice.id
      limit 1;
    end if;
    if v_created_invoice_id is null then
      raise exception 'Invoice generator did not create or return the issue-month invoice';
    end if;
    v_candidate_id := v_created_invoice_id;
  end if;

  select * into v_invoice
  from public.invoices invoice
  where invoice.id = v_candidate_id
    and invoice.company_id = p_company_id
    and invoice.contract_id = v_contract.id
  for update;
  if not found
     or date_trunc('month', coalesce(v_invoice.invoice_date, v_invoice.due_date))::date <> v_month
     or lower(coalesce(v_invoice.status, '')) in ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  then
    raise exception 'Issue-month invoice candidate failed company, contract, month, or lifecycle verification';
  end if;
  if abs(coalesce(v_invoice.total_amount, 0) - coalesce(v_schedule.amount, 0)) > 0.01 then
    raise exception 'Issue-month invoice amount does not match the schedule amount';
  end if;

  if exists (
    select 1
    from public.contract_payment_schedules other_schedule
    where other_schedule.company_id = p_company_id
      and other_schedule.id <> v_schedule.id
      and other_schedule.invoice_id = v_candidate_id
      and lower(coalesce(other_schedule.status, '')) not in ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) then
    raise exception 'Issue-month invoice candidate is still linked to another active schedule';
  end if;

  if v_schedule.invoice_id is not distinct from v_candidate_id then
    v_after := v_before;
  else
    update public.contract_payment_schedules schedule
    set invoice_id = v_candidate_id, updated_at = now()
    where schedule.id = v_schedule.id and schedule.company_id = p_company_id;

    select * into v_schedule
    from public.contract_payment_schedules schedule
    where schedule.id = p_entity_id::uuid;
    v_after := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
    if v_schedule.invoice_id is distinct from v_candidate_id then
      raise exception 'Issue-month schedule link failed postcondition verification';
    end if;
  end if;

  if v_before is not distinct from v_after then
    update public.system_agent_findings finding
    set status = 'ignored', repair_id = null, error = null, updated_at = now()
    where finding.id = p_finding_id;
    return jsonb_build_object(
      'status', 'verified_no_change',
      'command', p_command,
      'entity_id', p_entity_id,
      'state', v_after
    );
  end if;

  v_repair_metadata := v_repair_metadata || jsonb_build_object(
    'handler_version', case
      when p_command = 'schedule.repair_invoice_link' then 'contract_schedule_v1'
      else 'contract_invoice_v3'
    end,
    'created_invoice_id', v_created_invoice_id,
    'invoice_month', v_month,
    'billing_date_mode', 'invoice_date'
  );

  insert into public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) values (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, 'contracts', p_command,
    v_registry.entity_table, p_entity_id, v_before, v_after, v_repair_metadata
  );

  update public.system_agent_findings finding
  set status = 'repaired', repair_id = v_repair_id, error = null, updated_at = now()
  where finding.id = p_finding_id;

  return jsonb_build_object(
    'status', 'repaired',
    'repair_id', v_repair_id,
    'command', p_command,
    'entity_id', p_entity_id,
    'before', v_before,
    'after', v_after
  );
end;
$$;
revoke all on function public.system_agent_apply_contract_invoice_issue_month_repair_v4(
  uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb
) from public, anon, authenticated;
grant execute on function public.system_agent_apply_contract_invoice_issue_month_repair_v4(
  uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb
) to service_role;
comment on function public.system_agent_apply_contract_invoice_issue_month_repair_v4(
  uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb
) is 'Canonical issue-month schedule invoice repair with optimistic checks, closed-period protection, audit state, and compatible rollback metadata.';
commit;
