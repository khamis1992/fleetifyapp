-- ===============================
-- ROLLBACK Migration: Cancel All Contracts
-- ===============================
-- Purpose: Restore original contract statuses from backup
-- Table: contracts
-- Date: 2025-10-25
-- Migration Version: 20251025174500
-- WARNING: Only run this if you need to undo the cancellation migration
-- ===============================

-- Step 1: Verify backup table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'contracts_status_backup'
    ) THEN
        RAISE EXCEPTION 'Backup table contracts_status_backup does not exist. Cannot rollback.';
    END IF;
END $$;

-- Step 2: Restore original statuses from backup
-- This will restore all contracts to their pre-migration status
UPDATE public.contracts c
SET
    status = backup.original_status,
    updated_at = now()
FROM public.contracts_status_backup backup
WHERE c.id = backup.id
  AND backup.migration_version = '20251025174500';

-- Step 3: Verification query (commented out - for manual verification only)
-- Run this query manually after rollback to verify results:
--
-- SELECT c.status as current_status, backup.original_status, COUNT(*) as count
-- FROM public.contracts c
-- LEFT JOIN public.contracts_status_backup backup ON c.id = backup.id
-- WHERE backup.migration_version = '20251025174500'
-- GROUP BY c.status, backup.original_status
-- ORDER BY c.status;

-- Step 4: Optional - Delete backup records for this migration
-- CAUTION: Only uncomment this after verifying the rollback was successful
--
-- DELETE FROM public.contracts_status_backup
-- WHERE migration_version = '20251025174500';

-- Step 5: Optional - Drop backup table completely
-- CAUTION: Only uncomment this if you're absolutely sure you won't need to rollback again
--
-- DROP TABLE IF EXISTS public.contracts_status_backup;

-- Step 6: Success message
DO $$
DECLARE
    v_total_restored INTEGER;
    v_total_contracts INTEGER;
    v_by_status TEXT;
BEGIN
    SELECT COUNT(*) INTO v_total_restored
    FROM public.contracts c
    INNER JOIN public.contracts_status_backup backup ON c.id = backup.id
    WHERE backup.migration_version = '20251025174500';

    SELECT COUNT(*) INTO v_total_contracts
    FROM public.contracts;

    SELECT string_agg(c.status || ': ' || count::text, ', ')
    INTO v_by_status
    FROM (
        SELECT c.status, COUNT(*) as count
        FROM public.contracts c
        INNER JOIN public.contracts_status_backup backup ON c.id = backup.id
        WHERE backup.migration_version = '20251025174500'
        GROUP BY c.status
        ORDER BY c.status
    ) sub;

    RAISE NOTICE '===================================';
    RAISE NOTICE 'Migration ROLLBACK: Cancel All Contracts';
    RAISE NOTICE 'Status: COMPLETED';
    RAISE NOTICE 'Total contracts: %', v_total_contracts;
    RAISE NOTICE 'Contracts restored: %', v_total_restored;
    RAISE NOTICE 'Status breakdown: %', COALESCE(v_by_status, 'none');
    RAISE NOTICE 'Backup table: PRESERVED (safe to delete manually)';
    RAISE NOTICE '===================================';
    RAISE NOTICE 'NOTE: Backup table will be preserved until manually deleted';
    RAISE NOTICE 'To delete backup: DELETE FROM contracts_status_backup WHERE migration_version = ''20251025174500'';';
END $$;
