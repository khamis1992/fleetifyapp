DROP FUNCTION IF EXISTS public.reverse_manual_bank_transaction_v1(uuid, uuid, date, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.create_manual_bank_transaction_v1(uuid, uuid, text, numeric, date, text, text, uuid, uuid, uuid, uuid);
DROP INDEX IF EXISTS public.uq_bank_transactions_manual_idempotency;
ALTER TABLE public.bank_transactions
  DROP COLUMN IF EXISTS manual_counterpart_account_id,
  DROP COLUMN IF EXISTS manual_bank_account_id,
  DROP COLUMN IF EXISTS manual_idempotency_key;
