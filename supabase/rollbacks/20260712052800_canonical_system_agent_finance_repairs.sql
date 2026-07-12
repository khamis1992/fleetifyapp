-- Roll back the canonical finance gateway only when no finance_v2 repair
-- remains applied. Historical audit rows are intentionally preserved.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.system_agent_repairs repair
    WHERE repair.status = 'applied'
      AND repair.rollback_metadata ->> 'handler_version' = 'finance_v2'
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: canonical finance repairs are still applied';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid, text);

DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_legacy_v1(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'Preserved legacy system-agent rollback function is missing';
  END IF;
  ALTER FUNCTION public.system_agent_rollback_repair_legacy_v1(uuid, text)
    RENAME TO system_agent_rollback_repair;
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  TO service_role;

DROP FUNCTION IF EXISTS public.system_agent_apply_finance_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb);
DROP FUNCTION IF EXISTS public.system_agent_active_invoice_allocations(uuid);

UPDATE public.system_agent_command_registry
SET
  allowed_fields = ARRAY['paid_amount', 'balance_due', 'payment_status'],
  description = 'Recalculate an invoice balance from completed receipts.',
  updated_at = now()
WHERE command = 'invoice.recalculate_balance';

UPDATE public.system_agent_command_registry
SET
  allowed_fields = ARRAY['subtotal', 'total_amount', 'balance_due', 'payment_status'],
  description = 'Align a zero-impact invoice amount with its payment schedule.',
  updated_at = now()
WHERE command = 'invoice.sync_zero_impact_amount';

UPDATE public.system_agent_command_registry
SET
  allowed_fields = ARRAY['status', 'payment_status', 'balance_due'],
  description = 'Soft-cancel a zero-impact duplicate or invalid invoice.',
  updated_at = now()
WHERE command = 'invoice.cancel_zero_safe';

UPDATE public.system_agent_command_registry
SET
  allowed_fields = ARRAY['invoice_id', 'journal_entry_id'],
  description = 'Link an unlinked receipt to its one clear same-month invoice.',
  updated_at = now()
WHERE command = 'payment.link_clear_invoice';
