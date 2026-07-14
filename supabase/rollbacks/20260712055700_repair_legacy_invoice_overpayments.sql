DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.legacy_invoice_overpayment_repairs WHERE status = 'applied') THEN
    RAISE EXCEPTION 'Rollback applied legacy overpayment repairs before removing migration 20260712055700';
  END IF;
END;
$$;

DELETE FROM public.system_agent_command_registry WHERE command = 'invoice.normalize_legacy_overpayment';
DROP FUNCTION IF EXISTS public.system_agent_apply_legacy_overpayment_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb);
DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid,text);
ALTER FUNCTION public.system_agent_rollback_repair_before_legacy_overpayment_v1(uuid,text)
  RENAME TO system_agent_rollback_repair;
DROP FUNCTION IF EXISTS public.rollback_legacy_invoice_overpayment_repair(uuid,text);
DROP FUNCTION IF EXISTS public.repair_legacy_overpaid_invoice_allocations_atomic(uuid,uuid,text,uuid,boolean);
DROP TABLE IF EXISTS public.legacy_invoice_overpayment_repairs;
