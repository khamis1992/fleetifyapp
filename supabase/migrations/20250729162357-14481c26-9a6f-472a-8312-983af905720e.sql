-- Add foreign key constraints between journal_entries and profiles
-- First, let's add the foreign key constraint for created_by
ALTER TABLE public.journal_entries 
ADD CONSTRAINT fk_journal_entries_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

-- Add foreign key constraint for posted_by
ALTER TABLE public.journal_entries 
ADD CONSTRAINT fk_journal_entries_posted_by 
FOREIGN KEY (posted_by) REFERENCES public.profiles(user_id);

-- Also ensure journal_entry_lines has proper foreign key to journal_entries if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_journal_entry_lines_journal_entry'
        AND table_name = 'journal_entry_lines'
    ) THEN
        ALTER TABLE public.journal_entry_lines 
        ADD CONSTRAINT fk_journal_entry_lines_journal_entry 
        FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE CASCADE;
    END IF;
END $$;