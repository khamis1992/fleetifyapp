-- Conservative rollback: never remove the gateway after it has posted new journals.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.journal_entries entry
    WHERE entry.reference_type = 'traffic_violation_payment'
  ) OR EXISTS (
    SELECT 1
    FROM public.system_agent_repairs repair
    WHERE repair.command = 'traffic_violation_payment.post_missing_journal'
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: traffic violation payment journals or repairs already exist';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid, text);

DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_traffic_v1(uuid,text)') IS NOT NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair_before_traffic_v1(uuid, text)
      RENAME TO system_agent_rollback_repair;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_apply_traffic_violation_payment_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
);
DROP FUNCTION IF EXISTS public.create_traffic_violation_payment_with_journal(
  uuid, uuid, numeric, text, text, date, text, text, text, text, uuid
);

DELETE FROM public.system_agent_command_registry
WHERE command = 'traffic_violation_payment.post_missing_journal';

DROP INDEX IF EXISTS public.uq_traffic_violation_payments_journal;

DELETE FROM public.default_account_types account_type
WHERE account_type.type_code = 'TRAFFIC_FINE_EXPENSE'
  AND NOT EXISTS (
    SELECT 1 FROM public.account_mappings mapping
    WHERE mapping.default_account_type_id = account_type.id
  );
