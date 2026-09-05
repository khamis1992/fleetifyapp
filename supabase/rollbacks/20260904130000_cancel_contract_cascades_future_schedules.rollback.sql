-- Rollback: drop the cascade trigger/function; cancelled-contract orphan
-- rows are historical data and are NOT resurrected by this rollback.
DROP TRIGGER IF EXISTS trg_cancel_contract_future_schedules ON public.contracts;
DROP FUNCTION IF EXISTS public.cancel_contract_future_schedules();