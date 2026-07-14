DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid,text);
ALTER FUNCTION public.system_agent_rollback_repair_before_legal_integrity_v1(uuid,text) RENAME TO system_agent_rollback_repair;
DELETE FROM public.system_agent_command_registry WHERE command IN('legal.sync_contract_state','legal.reset_unsupported_repayment');
DROP FUNCTION IF EXISTS public.system_agent_apply_legal_integrity_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb);
