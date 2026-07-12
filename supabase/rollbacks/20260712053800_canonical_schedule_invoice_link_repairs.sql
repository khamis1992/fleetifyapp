-- Remove the single-schedule link gateway only when no applied repair depends on it.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.system_agent_repairs repair
    WHERE repair.status = 'applied'
      AND repair.rollback_metadata ->> 'handler_version' = 'schedule_invoice_link_v1'
  ) THEN
    RAISE EXCEPTION 'Applied schedule invoice-link repairs must be rolled back before reverting this migration';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_apply_schedule_invoice_link_repair_v1(
  uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb
);

DELETE FROM public.system_agent_command_registry
WHERE command = 'schedule.link_invoice_by_billing_month';

DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid,text);
ALTER FUNCTION public.system_agent_rollback_repair_before_schedule_invoice_link_v1(uuid,text)
  RENAME TO system_agent_rollback_repair;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  TO service_role;
