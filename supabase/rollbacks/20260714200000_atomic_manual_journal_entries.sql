DROP FUNCTION IF EXISTS public.post_manual_journal_entry_v1(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.create_manual_journal_entry_v1(uuid, text, date, text, text, uuid, jsonb, uuid, uuid);
DROP INDEX IF EXISTS public.uq_journal_entries_manual_idempotency;
ALTER TABLE public.journal_entries DROP COLUMN IF EXISTS manual_idempotency_key;
