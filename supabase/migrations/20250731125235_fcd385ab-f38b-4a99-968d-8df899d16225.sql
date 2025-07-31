-- Remove the duplicate foreign key constraint
-- Keep the standard foreign key and remove the custom named one
ALTER TABLE public.journal_entry_lines 
DROP CONSTRAINT IF EXISTS fk_journal_entry_lines_journal_entry;