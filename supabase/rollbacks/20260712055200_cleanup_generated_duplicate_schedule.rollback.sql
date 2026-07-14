begin;

drop function if exists public.system_agent_apply_contract_invoice_billing_month_repair_v7(
  uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb
);

commit;
