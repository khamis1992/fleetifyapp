-- Check if there are any journal entry lines referencing inactive accounts
SELECT COUNT(*) as count_lines, COUNT(DISTINCT journal_entry_id) as count_entries
FROM public.journal_entry_lines jel
WHERE jel.account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);

-- Delete complete journal entries that have lines referencing inactive accounts
DELETE FROM public.journal_entries 
WHERE id IN (
    SELECT DISTINCT journal_entry_id 
    FROM public.journal_entry_lines 
    WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false)
);

-- Now try to delete the inactive accounts
DELETE FROM public.chart_of_accounts WHERE is_active = false;