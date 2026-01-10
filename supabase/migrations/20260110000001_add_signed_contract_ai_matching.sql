-- Migration: 20260110000001_add_signed_contract_ai_matching.sql
-- Description: Add AI matching capabilities for signed contract uploads
-- Author: Fleetify Database Architect
-- Date: 2025-01-10
--
-- Feature: Signed Agreements Upload with AI Matching
--
-- This migration adds support for:
-- 1. AI-powered automatic contract matching
-- 2. Manual override capabilities with audit trail
-- 3. Batch upload tracking
-- 4. Processing status and error handling
--
-- Document Type: 'signed_contract'
-- Storage Bucket: 'contract-documents' (already exists)
--
-- ============================================

-- ============================================
-- STEP 1: Add AI matching columns
-- ============================================

-- AI match status tracking
-- Values: pending (awaiting processing), matched (AI found contract),
--          not_matched (no contract found), manual_override (user overrode AI),
--          review_required (low confidence 70-79)
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS ai_match_status TEXT
CHECK (ai_match_status IN ('pending', 'matched', 'not_matched', 'manual_override', 'review_required'))
DEFAULT 'pending';

-- Confidence score from AI (0-100)
-- NULL = not yet processed
-- 0-69 = not_matched
-- 70-79 = review_required
-- 80-100 = matched
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS ai_match_confidence DECIMAL(5,2)
CHECK (ai_match_confidence BETWEEN 0 AND 100)
DEFAULT NULL;

-- Who/what performed the match
-- 'ai' = automatic matching
-- 'manual' = user selected contract
-- 'bulk_import' = imported via CSV/API
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS matched_by TEXT
CHECK (matched_by IN ('ai', 'manual', 'bulk_import'))
DEFAULT NULL;

-- When the match occurred
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP WITH TIME ZONE
DEFAULT NULL;

-- User who verified/overrode the match (FK to profiles)
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS verified_by UUID
REFERENCES profiles(id) ON DELETE SET NULL
DEFAULT NULL;

-- When verification occurred
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE
DEFAULT NULL;

-- Notes about the match (why rejected, override reason, etc.)
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS match_notes TEXT
DEFAULT NULL;

-- ============================================
-- STEP 2: Add batch tracking columns
-- ============================================

-- Batch upload identifier (for tracking bulk uploads)
-- Links documents uploaded together in one batch
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS upload_batch_id UUID
DEFAULT NULL;

-- Original filename before processing
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS original_filename TEXT
DEFAULT NULL;

-- Processing status
-- uploading = file being uploaded to storage
-- parsing = extracting text/data from document
-- matching = AI matching against contracts
-- complete = processing finished successfully
-- failed = processing error occurred
-- review_required = low confidence, needs human review
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS processing_status TEXT
CHECK (processing_status IN ('uploading', 'parsing', 'matching', 'complete', 'failed', 'review_required'))
DEFAULT 'complete';

-- Error details if processing failed
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS processing_error TEXT
DEFAULT NULL;

-- ============================================
-- STEP 3: Create indexes for performance
-- ============================================

-- Index for AI match status queries (dashboard widget)
CREATE INDEX IF NOT EXISTS idx_contract_documents_ai_match_status
ON contract_documents(company_id, ai_match_status)
WHERE ai_match_status IS NOT NULL;

-- Index for processing status queries
CREATE INDEX IF NOT EXISTS idx_contract_documents_processing_status
ON contract_documents(company_id, processing_status)
WHERE processing_status IS NOT NULL;

-- Index for batch uploads (finding all docs in a batch)
CREATE INDEX IF NOT EXISTS idx_contract_documents_upload_batch
ON contract_documents(upload_batch_id)
WHERE upload_batch_id IS NOT NULL;

-- Composite index for dashboard queries (pending matches)
-- Optimizes the most common query: show me pending docs for my company
CREATE INDEX IF NOT EXISTS idx_contract_documents_pending_matches
ON contract_documents(company_id, ai_match_status, created_at DESC)
WHERE ai_match_status IN ('pending', 'review_required');

-- Index for manual override queries (audit trail)
CREATE INDEX IF NOT EXISTS idx_contract_documents_manual_overrides
ON contract_documents(company_id, matched_by, matched_at DESC)
WHERE matched_by = 'manual';

-- ============================================
-- STEP 4: Add comments for documentation
-- ============================================

COMMENT ON COLUMN contract_documents.ai_match_status IS
'Status of AI matching: pending (awaiting processing), matched (AI found contract), not_matched (no contract found), manual_override (user overrode AI), review_required (low confidence 70-79)';

COMMENT ON COLUMN contract_documents.ai_match_confidence IS
'AI confidence score (0-100) for the match. NULL if not yet processed. Scores < 70 trigger not_matched, 70-79 trigger review_required, 80+ trigger matched';

COMMENT ON COLUMN contract_documents.matched_by IS
'Who performed the matching: ai (automatic), manual (user selection), bulk_import (CSV/API import)';

COMMENT ON COLUMN contract_documents.matched_at IS
'Timestamp when the match was performed (AI or manual)';

COMMENT ON COLUMN contract_documents.verified_by IS
'User who verified or overrode the AI match (FK to profiles.id). NULL if not verified by user';

COMMENT ON COLUMN contract_documents.verified_at IS
'Timestamp when user verified or overrode the match. NULL if not verified';

COMMENT ON COLUMN contract_documents.match_notes IS
'Notes explaining why match was rejected, override reason, verification comments, or any other match-related notes';

COMMENT ON COLUMN contract_documents.upload_batch_id IS
'Identifier for batch upload operations. Links documents uploaded together in one batch. UUID format';

COMMENT ON COLUMN contract_documents.original_filename IS
'Original filename before any processing, renaming, or path generation';

COMMENT ON COLUMN contract_documents.processing_status IS
'Status of document processing pipeline: uploading (file being uploaded to storage), parsing (extracting text/data from document), matching (AI matching against contracts), complete (processing finished successfully), failed (processing error occurred), review_required (low confidence, needs human review)';

COMMENT ON COLUMN contract_documents.processing_error IS
'Error message if processing failed. Contains details about validation errors, parsing errors, matching errors, etc.';

-- ============================================
-- STEP 5: Create helper functions
-- ============================================

-- Function: record_ai_match_result
-- Purpose: Record AI match results with automatic status determination
-- Security: SECURITY DEFINER with company_id check
-- Usage: Called by backend service after AI processing
CREATE OR REPLACE FUNCTION record_ai_match_result(
  p_document_id UUID,
  p_contract_id UUID,
  p_confidence DECIMAL,
  p_status TEXT DEFAULT 'matched'
)
RETURNS JSONB AS $$
DECLARE
  v_match_status TEXT;
  v_company_id TEXT;
BEGIN
  -- Validate inputs
  IF p_confidence < 0 OR p_confidence > 100 THEN
    RAISE EXCEPTION 'Confidence must be between 0 and 100';
  END IF;

  -- Get company_id for security check
  SELECT company_id INTO v_company_id
  FROM contract_documents
  WHERE id = p_document_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  -- Determine match status based on confidence
  IF p_confidence >= 80 THEN
    v_match_status := 'matched';
  ELSIF p_confidence >= 70 THEN
    v_match_status := 'review_required';
  ELSE
    v_match_status := 'not_matched';
  END IF;

  -- Update document record
  UPDATE contract_documents
  SET
    contract_id = p_contract_id,
    ai_match_confidence = p_confidence,
    ai_match_status = v_match_status,
    matched_by = 'ai',
    matched_at = NOW(),
    processing_status = 'complete',
    processing_error = NULL
  WHERE id = p_document_id
  AND company_id = v_company_id;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'document_id', p_document_id,
    'contract_id', p_contract_id,
    'status', v_match_status,
    'confidence', p_confidence,
    'processed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: override_contract_match
-- Purpose: Allow users to manually override AI matches
-- Security: SECURITY DEFINER with company_id access check
-- Usage: Called when user manually selects a different contract
CREATE OR REPLACE FUNCTION override_contract_match(
  p_document_id UUID,
  p_new_contract_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_company_id TEXT;
  v_old_contract_id UUID;
BEGIN
  -- Get current state
  SELECT company_id, contract_id INTO v_company_id, v_old_contract_id
  FROM contract_documents
  WHERE id = p_document_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  -- Verify user has access to this company
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'User does not have access to this document';
  END IF;

  -- Update with manual override
  UPDATE contract_documents
  SET
    contract_id = p_new_contract_id,
    ai_match_status = 'manual_override',
    matched_by = 'manual',
    matched_at = NOW(),
    verified_by = p_user_id,
    verified_at = NOW(),
    match_notes = p_notes,
    processing_status = 'complete',
    processing_error = NULL
  WHERE id = p_document_id;

  -- Return result for audit
  RETURN jsonb_build_object(
    'success', true,
    'document_id', p_document_id,
    'old_contract_id', v_old_contract_id,
    'new_contract_id', p_new_contract_id,
    'overridden_by', p_user_id,
    'overridden_at', NOW(),
    'notes', p_notes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Create views for dashboard queries
-- ============================================

-- View: pending_contract_matches
-- Purpose: Dashboard view showing documents awaiting action
-- Security: RLS applies to underlying table
CREATE OR REPLACE VIEW pending_contract_matches AS
SELECT
  cd.id as document_id,
  cd.company_id,
  cd.document_name,
  cd.document_type,
  cd.ai_match_status,
  cd.ai_match_confidence,
  cd.processing_status,
  cd.uploaded_at,
  cd.uploaded_by,
  p.first_name || ' ' || p.last_name as uploader_name,
  c.contract_number,
  cust.first_name || ' ' || cust.last_name as customer_name,
  v.plate_number as vehicle_plate,
  cd.match_notes
FROM contract_documents cd
LEFT JOIN profiles p ON cd.uploaded_by = p.id
LEFT JOIN contracts c ON cd.contract_id = c.id
LEFT JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN vehicles v ON c.vehicle_id = v.id
WHERE
  cd.document_type = 'signed_contract' AND
  cd.ai_match_status IN ('pending', 'review_required', 'not_matched');

COMMENT ON VIEW pending_contract_matches IS
'Dashboard view showing signed contract documents that are pending AI matching, require review due to low confidence, or were not matched automatically';

-- View: contract_match_statistics
-- Purpose: Aggregate statistics for AI matching performance
-- Security: RLS applies to underlying table
CREATE OR REPLACE VIEW contract_match_statistics AS
SELECT
  company_id,
  COUNT(*) FILTER (WHERE ai_match_status = 'matched') as ai_matched_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'manual_override') as manual_override_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'review_required') as review_required_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'not_matched') as not_matched_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'pending') as pending_count,
  ROUND(AVG(ai_match_confidence) FILTER (WHERE ai_match_confidence IS NOT NULL)::NUMERIC, 2) as avg_confidence,
  COUNT(*) as total_documents
FROM contract_documents
WHERE document_type = 'signed_contract'
GROUP BY company_id;

COMMENT ON VIEW contract_match_statistics IS
'Aggregate statistics for signed contract AI matching performance, grouped by company';

-- ============================================
-- STEP 7: Update RLS policies (if needed)
-- ============================================

-- Note: Existing RLS policies should handle the new columns
-- The service_role will need to update AI fields via the functions above
-- Regular users will access through the views which enforce RLS

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION record_ai_match_result TO authenticated;
GRANT EXECUTE ON FUNCTION override_contract_match TO authenticated;

-- Grant select on views to authenticated users
GRANT SELECT ON pending_contract_matches TO authenticated;
GRANT SELECT ON contract_match_statistics TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verification queries:
--
-- 1. Check new columns exist:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'contract_documents'
-- AND column_name IN ('ai_match_status', 'ai_match_confidence', 'matched_by');
--
-- 2. Check indexes created:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'contract_documents'
-- AND indexname LIKE 'idx_contract_documents_%';
--
-- 3. Check functions created:
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name LIKE '%contract%match%';
--
-- 4. Check views created:
-- SELECT table_name FROM information_schema.views
-- WHERE table_schema = 'public'
-- AND table_name LIKE '%contract%match%';
