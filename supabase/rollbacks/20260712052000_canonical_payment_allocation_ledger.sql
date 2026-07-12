-- Architecture rollback is allowed only while no allocation history exists.
-- Once allocations exist, use allocation reversal/void commands instead of dropping the ledger.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.payment_allocations LIMIT 1) THEN
    RAISE EXCEPTION 'Canonical allocation ledger contains history and cannot be dropped safely';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS payment_allocation_auto_seed_after_payment ON public.payments;
DROP TRIGGER IF EXISTS after_payment_allocation_change_trigger ON public.payment_allocations;
DROP TRIGGER IF EXISTS validate_payment_allocation_row_trigger ON public.payment_allocations;

DROP FUNCTION IF EXISTS public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid);
DROP FUNCTION IF EXISTS public.auto_seed_payment_invoice_allocation();
DROP FUNCTION IF EXISTS public.after_payment_allocation_change();
DROP FUNCTION IF EXISTS public.sync_payment_allocation_state(uuid);
DROP FUNCTION IF EXISTS public.validate_payment_allocation_row();
DROP FUNCTION IF EXISTS public.recalculate_invoice_financial_state(uuid);
DROP FUNCTION IF EXISTS public.canonical_invoice_paid_amount(uuid, uuid);

DROP TABLE IF EXISTS public.payment_allocation_change_log;
DROP TABLE IF EXISTS public.payment_allocations;

-- Reapply the previous payment/invoice control and integrity-report definitions
-- from 20260627001000 and the payment total trigger definition from 20260712050000.
