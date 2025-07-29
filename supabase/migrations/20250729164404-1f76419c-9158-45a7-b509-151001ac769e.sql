-- Add missing foreign key constraints for journal_entry_lines table

-- Add foreign key constraint between journal_entry_lines.cost_center_id and cost_centers.id
ALTER TABLE public.journal_entry_lines 
ADD CONSTRAINT fk_journal_entry_lines_cost_center 
FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);

-- Add foreign key constraint between journal_entry_lines.account_id and chart_of_accounts.id
ALTER TABLE public.journal_entry_lines 
ADD CONSTRAINT fk_journal_entry_lines_account 
FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_cost_center_id ON public.journal_entry_lines(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON public.journal_entry_lines(account_id);