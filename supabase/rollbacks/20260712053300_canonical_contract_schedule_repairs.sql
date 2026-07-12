DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.system_agent_repairs repair
    WHERE repair.status = 'applied'
      AND repair.rollback_metadata ->> 'handler_version' = 'contract_schedule_v1'
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: contract schedule repairs are still applied';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid,text);
ALTER FUNCTION public.system_agent_rollback_repair_before_contract_schedule_v1(uuid,text)
  RENAME TO system_agent_rollback_repair;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  TO service_role;

DROP FUNCTION IF EXISTS public.system_agent_apply_contract_schedule_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb);
DROP FUNCTION IF EXISTS public.system_agent_contract_schedule_state(uuid);

DELETE FROM public.system_agent_command_registry
WHERE command IN (
  'schedule.consolidate_duplicate_rows',
  'schedule.repair_invoice_link',
  'schedule.sync_amount_from_invoice'
);
