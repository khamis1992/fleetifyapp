BEGIN;

-- Closing the rental does not settle or transfer the customer's traffic debt.
-- Remove only the legacy status gate; keep all financial and tenant guards.
DROP TRIGGER IF EXISTS trg_block_contract_close_with_unpaid_penalties ON public.contracts;

COMMIT;
