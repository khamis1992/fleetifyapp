DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.rental_payment_receipts receipt
    WHERE receipt.canonical_payment_id IS NOT NULL OR receipt.idempotency_key IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Rollback blocked: canonical rental receipts have been recorded';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid, text);
ALTER FUNCTION public.system_agent_rollback_repair_before_rental_receipt_v1(uuid, text)
  RENAME TO system_agent_rollback_repair;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid, text) TO service_role;

DROP FUNCTION IF EXISTS public.system_agent_apply_rental_receipt_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
);
DELETE FROM public.system_agent_command_registry
WHERE command = 'rental_receipt.sync_payment_state';

DROP FUNCTION IF EXISTS public.create_rental_receipt_payment_v1(
  uuid, uuid, text, uuid, uuid, text, date, numeric, numeric, numeric,
  numeric, text, uuid, text, text, uuid, uuid
);
DROP TRIGGER IF EXISTS a_guard_canonical_rental_receipt_v1
  ON public.rental_payment_receipts;
DROP FUNCTION IF EXISTS public.guard_canonical_rental_receipt_v1();
DROP INDEX IF EXISTS public.idx_rental_receipts_canonical_payment;
DROP INDEX IF EXISTS public.idx_rental_receipts_company_idempotency;
ALTER TABLE public.rental_payment_receipts
  DROP COLUMN IF EXISTS canonical_payment_id,
  DROP COLUMN IF EXISTS idempotency_key;
