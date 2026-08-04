BEGIN;

DROP FUNCTION IF EXISTS public.recalculate_contract_financial_states_batch(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.recalculate_invoice_financial_states_batch(uuid, uuid[]);
DROP TABLE IF EXISTS public.daily_invoice_repair_cursors;

COMMIT;
