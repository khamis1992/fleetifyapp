DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.system_agent_repairs repair
    WHERE repair.status = 'applied'
      AND repair.rollback_metadata ->> 'handler_version' = 'payment_classification_v1'
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: payment classification repairs are still applied';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payment_accounting_classifications) THEN
    RAISE EXCEPTION 'Rollback blocked: payment accounting classifications still exist';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid,text);
ALTER FUNCTION public.system_agent_rollback_repair_before_payment_classification_v1(uuid,text)
  RENAME TO system_agent_rollback_repair;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  TO service_role;

DROP FUNCTION IF EXISTS public.system_agent_apply_payment_classification_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb);
DROP FUNCTION IF EXISTS public.system_agent_reverse_payment_base_journal(uuid,uuid,uuid,text);
DROP FUNCTION IF EXISTS public.system_agent_ensure_payment_customer_advance_base(uuid,uuid);
DROP FUNCTION IF EXISTS public.system_agent_payment_base_state(uuid,uuid);

DELETE FROM public.system_agent_command_registry
WHERE command = 'payment.classify_customer_advance';

DROP TABLE public.payment_accounting_classifications;
