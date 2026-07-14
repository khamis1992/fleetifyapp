-- Refuse rollback after any canonical monthly-obligation payment has been recorded.
DO $$
DECLARE
  v_has_rows boolean;
BEGIN
  IF to_regclass('public.monthly_obligation_payments') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.monthly_obligation_payments LIMIT 1)'
      INTO v_has_rows;
    IF v_has_rows THEN
      RAISE EXCEPTION 'Rollback blocked: monthly-obligation payment ledger contains records';
    END IF;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid, text);
ALTER FUNCTION public.system_agent_rollback_repair_before_monthly_obligation_v1(uuid, text)
  RENAME TO system_agent_rollback_repair;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid, text) TO service_role;

DROP FUNCTION IF EXISTS public.system_agent_apply_monthly_obligation_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
);
DELETE FROM public.system_agent_command_registry
WHERE command = 'monthly_obligation.sync_payment_state';

DROP FUNCTION IF EXISTS public.pay_monthly_obligation_installment_v1(
  uuid, uuid, numeric, date, uuid, uuid, text, text, uuid, uuid
);

DROP TRIGGER IF EXISTS a_guard_monthly_obligation_installment_payment_fields
  ON public.monthly_obligation_installments;
DROP FUNCTION IF EXISTS public.guard_monthly_obligation_installment_payment_fields();

DROP TABLE IF EXISTS public.monthly_obligation_payments;

ALTER TABLE public.monthly_obligation_installments
  DROP CONSTRAINT IF EXISTS monthly_obligation_installments_ledger_baseline_v1;
ALTER TABLE public.monthly_obligation_installments
  DROP COLUMN IF EXISTS payment_ledger_baseline;
