-- Drop the older version of create_contract_journal_entry function that only takes uuid parameter
-- This will resolve the "function create_contract_journal_entry(uuid) is not unique" error
DROP FUNCTION IF EXISTS public.create_contract_journal_entry(uuid);

-- Verify that the newer comprehensive version with default parameters remains
-- (This function should already exist with signature: uuid, text DEFAULT 'contract_creation', numeric DEFAULT NULL)