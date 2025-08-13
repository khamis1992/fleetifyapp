-- إعادة إنشاء foreign key constraint للربط بين journal_entry_lines و chart_of_accounts
ALTER TABLE public.journal_entry_lines 
ADD CONSTRAINT fk_journal_entry_lines_account 
FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT;