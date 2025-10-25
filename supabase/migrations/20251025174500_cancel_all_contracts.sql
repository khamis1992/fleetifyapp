-- ===============================
-- Migration: Cancel All Contracts/Agreements
-- ===============================
-- Purpose: Update all current contracts to cancelled status (الملغية)
--          in preparation for creating new agreements
-- Table: contracts (main contracts table)
-- Date: 2025-10-25
-- Reversible: Yes (via backup table)
-- Risk Level: Medium (affects all contracts across all companies)
-- ===============================

-- Step 1: Create backup table to store original statuses
-- This enables rollback if needed
CREATE TABLE IF NOT EXISTS public.contracts_status_backup (
    id UUID PRIMARY KEY,
    original_status TEXT NOT NULL,
    backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    migration_version TEXT DEFAULT '20251025174500'
);

-- Add comment to backup table
COMMENT ON TABLE public.contracts_status_backup IS 'Backup of contracts statuses before mass cancellation migration';
COMMENT ON COLUMN public.contracts_status_backup.original_status IS 'Original status before migration (draft, under_review, active, expired, cancelled, suspended)';
COMMENT ON COLUMN public.contracts_status_backup.migration_version IS 'Migration version that created this backup';

-- Step 2: Backup all current statuses
-- Only backup contracts that are NOT already cancelled
INSERT INTO public.contracts_status_backup (id, original_status)
SELECT id, status
FROM public.contracts
WHERE status != 'cancelled'
ON CONFLICT (id) DO NOTHING; -- Prevent duplicate backups if migration is re-run

-- Step 3: Update all contracts to 'cancelled' status
-- This updates all contracts except those already cancelled
UPDATE public.contracts
SET
    status = 'cancelled',
    updated_at = now()
WHERE status != 'cancelled';

-- Step 4: Verification queries (commented out - for manual verification only)
-- Run these queries manually after migration to verify results:
--
-- Check status distribution:
-- SELECT status, COUNT(*) as count
-- FROM public.contracts
-- GROUP BY status
-- ORDER BY status;
--
-- Check backup table:
-- SELECT original_status, COUNT(*) as count
-- FROM public.contracts_status_backup
-- WHERE migration_version = '20251025174500'
-- GROUP BY original_status
-- ORDER BY original_status;

-- Step 5: Success message
DO $$
DECLARE
    v_total_updated INTEGER;
    v_total_contracts INTEGER;
    v_by_status TEXT;
BEGIN
    SELECT COUNT(*) INTO v_total_updated
    FROM public.contracts_status_backup
    WHERE migration_version = '20251025174500';

    SELECT COUNT(*) INTO v_total_contracts
    FROM public.contracts;

    SELECT string_agg(original_status || ': ' || count::text, ', ')
    INTO v_by_status
    FROM (
        SELECT original_status, COUNT(*) as count
        FROM public.contracts_status_backup
        WHERE migration_version = '20251025174500'
        GROUP BY original_status
        ORDER BY original_status
    ) sub;

    RAISE NOTICE '===================================';
    RAISE NOTICE 'Migration: Cancel All Contracts';
    RAISE NOTICE 'Status: COMPLETED';
    RAISE NOTICE 'Total contracts: %', v_total_contracts;
    RAISE NOTICE 'Contracts cancelled: %', v_total_updated;
    RAISE NOTICE 'Breakdown: %', COALESCE(v_by_status, 'none');
    RAISE NOTICE 'Backup records created: %', v_total_updated;
    RAISE NOTICE 'Rollback available: YES';
    RAISE NOTICE '===================================';
END $$;
