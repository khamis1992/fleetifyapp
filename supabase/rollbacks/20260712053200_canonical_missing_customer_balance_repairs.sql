DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.system_agent_repairs repair
    WHERE repair.status = 'applied'
      AND repair.rollback_metadata ->> 'handler_version' = 'customer_balance_create_v1'
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: created customer balance repairs are still applied';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid,text);
ALTER FUNCTION public.system_agent_rollback_repair_before_customer_balance_v1(uuid,text)
  RENAME TO system_agent_rollback_repair;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  TO service_role;

DROP FUNCTION IF EXISTS public.system_agent_apply_customer_balance_create_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb);
DROP FUNCTION IF EXISTS public.system_agent_customer_balance_state_for_customer(uuid,uuid);
DELETE FROM public.system_agent_command_registry WHERE command = 'customer.create_balance';
