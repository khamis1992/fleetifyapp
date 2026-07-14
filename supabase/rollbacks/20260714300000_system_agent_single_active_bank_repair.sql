DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid,text);
ALTER FUNCTION public.system_agent_rollback_repair_before_payment_single_active_bank_v1(uuid,text)
  RENAME TO system_agent_rollback_repair;
DELETE FROM public.system_agent_command_registry
WHERE command='accounting.assign_single_active_bank';
DROP FUNCTION IF EXISTS public.system_agent_apply_bank_payment_integrity_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb);
