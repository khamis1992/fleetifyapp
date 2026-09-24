-- Drop the duplicate FK constraint on journal_entry_lines.account_id.
--
-- Two FK constraints existed between journal_entry_lines(account_id) and
-- chart_of_accounts(id): "fk_journal_entry_lines_account" (added later) and
-- "journal_entry_lines_account_id_fkey" (original). When multiple FKs point
-- between the same tables, PostgREST cannot resolve the
-- chart_of_accounts!account_id(...) embed and every income-statement /
-- balance-sheet query fails with PGRST201.
--
-- The original constraint (with ON DELETE RESTRICT) is kept.

ALTER TABLE public.journal_entry_lines
  DROP CONSTRAINT IF EXISTS fk_journal_entry_lines_account;