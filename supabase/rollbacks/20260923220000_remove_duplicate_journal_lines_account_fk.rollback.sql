-- Re-add the duplicate FK removed by 20260923220000_remove_duplicate_journal_lines_account_fk.sql
-- Only use this if the constraint drop must be reverted.

ALTER TABLE public.journal_entry_lines
  ADD CONSTRAINT fk_journal_entry_lines_account
  FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);