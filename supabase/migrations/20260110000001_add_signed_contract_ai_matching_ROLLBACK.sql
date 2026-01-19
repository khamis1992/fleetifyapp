-- Migration: 20260110000001_add_signed_contract_ai_matching_ROLLBACK.sql
-- Description: Rollback AI matching features for signed contracts
-- Author: Fleetify Database Architect
-- Date: 2025-01-10
--
-- WARNING: This rollback will:
-- 1. Delete all AI matching data (status, confidence, audit trail)
-- 2. Remove helper functions
-- 3. Remove performance indexes
-- 4. Drop dashboard views
--
-- DO NOT run this if you need to preserve AI matching history!
--
-- ============================================

-- Begin transaction for safety
BEGIN;

-- ============================================
-- STEP 1: Drop views (must be done before dropping columns)
-- ============================================

DROP VIEW IF EXISTS pending_contract_matches CASCADE;
DROP VIEW IF EXISTS contract_match_statistics CASCADE;

-- ============================================
-- STEP 2: Drop functions
-- ============================================

DROP FUNCTION IF EXISTS record_ai_match_result(UUID, UUID, DECIMAL, TEXT) CASCADE;
DROP FUNCTION IF EXISTS override_contract_match(UUID, UUID, UUID, TEXT) CASCADE;

-- ============================================
-- STEP 3: Drop indexes
-- ============================================

DROP INDEX IF EXISTS idx_contract_documents_ai_match_status CASCADE;
DROP INDEX IF EXISTS idx_contract_documents_processing_status CASCADE;
DROP INDEX IF EXISTS idx_contract_documents_upload_batch CASCADE;
DROP INDEX IF EXISTS idx_contract_documents_pending_matches CASCADE;
DROP INDEX IF EXISTS idx_contract_documents_manual_overrides CASCADE;

-- ============================================
-- STEP 4: Drop columns (order matters for FK constraints)
-- ============================================

-- Drop columns that reference other tables first
ALTER TABLE contract_documents DROP COLUMN IF EXISTS verified_by CASCADE;

-- Drop AI matching columns
ALTER TABLE contract_documents DROP COLUMN IF EXISTS ai_match_status CASCADE;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS ai_match_confidence CASCADE;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS matched_by CASCADE;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS matched_at CASCADE;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS verified_at CASCADE;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS match_notes CASCADE;

-- Drop batch tracking columns
ALTER TABLE contract_documents DROP COLUMN IF EXISTS upload_batch_id CASCADE;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS original_filename CASCADE;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS processing_status CASCADE;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS processing_error CASCADE;

-- ============================================
-- ROLLBACK COMPLETE
-- ============================================

-- Commit the rollback
-- UNCOMMENT THE LINE BELOW TO ACTUALLY EXECUTE THE ROLLBACK
-- COMMIT;

-- Verification queries after rollback:
--
-- 1. Verify columns removed:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'contract_documents'
-- AND column_name IN ('ai_match_status', 'ai_match_confidence', 'matched_by');
-- (Should return no rows)
--
-- 2. Verify indexes removed:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'contract_documents'
-- AND indexname LIKE 'idx_contract_documents_%';
-- (Should return no rows for the indexes we dropped)
--
-- 3. Verify functions removed:
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name LIKE '%contract%match%';
-- (Should return no rows)
--
-- 4. Verify views removed:
-- SELECT table_name FROM information_schema.views
-- WHERE table_schema = 'public'
-- AND table_name LIKE '%contract%match%';
-- (Should return no rows)

-- ============================================
-- DATA LOSS WARNING
-- ============================================
--
-- The following data will be PERMANENTLY LOST if you commit this rollback:
--
-- 1. All AI match statuses (pending, matched, review_required, etc.)
-- 2. All AI confidence scores
-- 3. All manual override history (who overrode, when, why)
-- 4. All batch upload identifiers
-- 5. All processing statuses and error messages
-- 6. Original filenames before processing
--
-- If you need to preserve this data for audit or analytics:
-- 1. Export to a backup table before running this rollback
-- 2. Or use a different approach (e.g., mark feature as disabled instead)
--
-- Example: Create backup table before rollback
-- CREATE TABLE contract_documents_ai_backup AS
-- SELECT * FROM contract_documents
-- WHERE document_type = 'signed_contract';
