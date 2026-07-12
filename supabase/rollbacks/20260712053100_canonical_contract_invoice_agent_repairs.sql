DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.system_agent_repairs repair
    WHERE repair.status = 'applied'
      AND repair.rollback_metadata ->> 'handler_version' = 'contract_invoice_v3'
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: canonical contract invoice repairs are still applied';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_apply_contract_invoice_repair_v3(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb);
