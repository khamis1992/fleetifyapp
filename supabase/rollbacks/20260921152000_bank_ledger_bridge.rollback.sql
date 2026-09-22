-- Rollback of 20260921152000_bank_ledger_bridge.sql
BEGIN;
SET LOCAL lock_timeout = '5s';

DROP TRIGGER IF EXISTS trg_bank_transaction_journal ON public.bank_transactions;
DROP FUNCTION IF EXISTS public.trg_bank_transaction_journal_fn();
DROP FUNCTION IF EXISTS public.sync_ledger_to_bank_v1(uuid, uuid);
DROP FUNCTION IF EXISTS public.post_bank_transaction_journal_v1(uuid, uuid, uuid, uuid);

-- Remove the ledger-sync mirror transactions (keep journals — they are the ledger).
SET LOCAL app.financial_controls_bypass = 'on';
UPDATE public.bank_transactions SET journal_entry_id = NULL
WHERE reference_number = 'LEDGER-SYNC';
DELETE FROM public.bank_transactions WHERE reference_number = 'LEDGER-SYNC';
SET LOCAL app.financial_controls_bypass = '';

NOTIFY pgrst,'reload schema';
COMMIT;
