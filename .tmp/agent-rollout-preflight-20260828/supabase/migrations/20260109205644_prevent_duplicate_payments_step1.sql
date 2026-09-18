-- Step 1: Add idempotency_key column to prevent duplicate requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments'
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.payments
    ADD COLUMN idempotency_key TEXT UNIQUE;

    COMMENT ON COLUMN public.payments.idempotency_key IS
    'Unique key to prevent duplicate payment requests from retries/double-submissions';
  END IF;
END $$;;
