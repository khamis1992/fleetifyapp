-- Check what data exists and fix the Financial Summary to work with actual data
-- First check if we have journal_entries with data
SELECT COUNT(*) as journal_entries_count FROM journal_entries;

-- Check if we have payments data  
SELECT COUNT(*) as payments_count FROM payments;

-- Check if we have bank_transactions data
SELECT COUNT(*) as bank_transactions_count FROM bank_transactions;