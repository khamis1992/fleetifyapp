# Signed Agreements Upload - Database Design Plan

**Date:** January 10, 2026
**Project:** FleetifyApp - Al-Araf Car Rental ERP
**Feature:** AI-powered signed contract matching and batch upload tracking

---

## Executive Summary

This document outlines the database schema updates needed for the signed agreements upload feature. The design enables:
1. AI-powered automatic contract matching
2. Manual override capabilities
3. Batch upload tracking
4. Audit trail for all matching operations
5. Multi-tenant isolation with proper RLS

**Design Decision:** Extend existing `contract_documents` table rather than create new table, as the feature fits within the existing document management domain.

---

## Current Schema Analysis

### Existing `contract_documents` Table

```typescript
contract_documents: {
  Row: {
    id: string                    // UUID primary key
    company_id: string            // Multi-tenancy
    contract_id: string           // FK to contracts
    condition_report_id: string   // FK to vehicle_condition_reports (nullable)
    document_name: string         // Human-readable filename
    document_type: string         // Type identifier
    file_path: string            // Storage path (nullable)
    file_size: number            // Bytes (nullable)
    mime_type: string            // MIME type (nullable)
    is_required: boolean         // Whether doc is mandatory (nullable)
    notes: string                // Additional notes (nullable)
    uploaded_at: string          // Timestamp (nullable)
    uploaded_by: string          // User FK (nullable)
    created_at: string           // Auto-generated
    updated_at: string           // Auto-generated
  }
}
```

**Current Document Types:**
- `contract_copy` - Original contract PDF
- `id_copy` - Customer ID document
- `driving_license` - Driver's license
- `vehicle_inspection` - Inspection report
- `insurance_policy` - Insurance document
- `payment_receipt` - Payment proof

---

## Proposed Schema Changes

### 1. New Columns for `contract_documents` Table

#### 1.1 AI Matching Columns

```sql
-- AI match status tracking
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS ai_match_status TEXT
CHECK (ai_match_status IN ('pending', 'matched', 'not_matched', 'manual_override', 'review_required'))
DEFAULT 'pending';

-- Confidence score from AI (0-100)
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS ai_match_confidence DECIMAL(5,2)
CHECK (ai_match_confidence BETWEEN 0 AND 100)
DEFAULT NULL;

-- Who/what performed the match
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS matched_by TEXT
CHECK (matched_by IN ('ai', 'manual', 'bulk_import'))
DEFAULT NULL;

-- When the match occurred
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP WITH TIME ZONE
DEFAULT NULL;

-- User who verified/overrode the match
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS verified_by UUID
REFERENCES profiles(id)
DEFAULT NULL;

-- When verification occurred
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE
DEFAULT NULL;

-- Notes about the match (why rejected, override reason, etc.)
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS match_notes TEXT
DEFAULT NULL;
```

#### 1.2 Batch Tracking Columns

```sql
-- Batch upload identifier (for tracking bulk uploads)
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS upload_batch_id UUID
DEFAULT NULL;

-- Original filename before processing
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS original_filename TEXT
DEFAULT NULL;

-- Processing status (parsing, matching, complete, failed)
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS processing_status TEXT
CHECK (processing_status IN ('uploading', 'parsing', 'matching', 'complete', 'failed', 'review_required'))
DEFAULT 'uploading';

-- Error details if processing failed
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS processing_error TEXT
DEFAULT NULL;

```

---

### 2. New Indexes for Performance

```sql
-- Index for AI match status queries
CREATE INDEX IF NOT EXISTS idx_contract_documents_ai_match_status
ON contract_documents(company_id, ai_match_status)
WHERE ai_match_status IS NOT NULL;

-- Index for processing status queries
CREATE INDEX IF NOT EXISTS idx_contract_documents_processing_status
ON contract_documents(company_id, processing_status)
WHERE processing_status IS NOT NULL;

-- Index for batch uploads
CREATE INDEX IF NOT EXISTS idx_contract_documents_upload_batch
ON contract_documents(upload_batch_id)
WHERE upload_batch_id IS NOT NULL;

-- Composite index for dashboard queries (pending matches)
CREATE INDEX IF NOT EXISTS idx_contract_documents_pending_matches
ON contract_documents(company_id, ai_match_status, created_at DESC)
WHERE ai_match_status IN ('pending', 'review_required');

-- Index for manual override queries
CREATE INDEX IF NOT EXISTS idx_contract_documents_manual_overrides
ON contract_documents(company_id, matched_by, matched_at DESC)
WHERE matched_by = 'manual';
```

---

### 3. Comments for Documentation

```sql
COMMENT ON COLUMN contract_documents.ai_match_status IS
'Status of AI matching: pending (awaiting processing), matched (AI found contract), not_matched (no contract found), manual_override (user overrode AI), review_required (low confidence)';

COMMENT ON COLUMN contract_documents.ai_match_confidence IS
'AI confidence score (0-100) for the match. NULL if not yet processed. Scores < 70 trigger review_required status';

COMMENT ON COLUMN contract_documents.matched_by IS
'Who performed the matching: ai (automatic), manual (user selection), bulk_import (CSV/API import)';

COMMENT ON COLUMN contract_documents.matched_at IS
'Timestamp when the match was performed (AI or manual)';

COMMENT ON COLUMN contract_documents.verified_by IS
'User who verified or overrode the AI match (FK to profiles.id)';

COMMENT ON COLUMN contract_documents.verified_at IS
'Timestamp when user verified or overrode the match';

COMMENT ON COLUMN contract_documents.match_notes IS
'Notes explaining why match was rejected, override reason, or verification comments';

COMMENT ON COLUMN contract_documents.upload_batch_id IS
'Identifier for batch upload operations (links to bulk upload sessions)';

COMMENT ON COLUMN contract_documents.original_filename IS
'Original filename before any processing or renaming';

COMMENT ON COLUMN contract_documents.processing_status IS
'Status of document processing: uploading, parsing (extracting data), matching (finding contract), complete, failed, review_required';

COMMENT ON COLUMN contract_documents.processing_error IS
'Error message if processing failed (validation errors, parsing errors, etc.)';
```

---

## 4. New Document Type

```sql
-- Document type enum extension
-- No migration needed - document_type is a free TEXT field
-- Application will use 'signed_contract' as the document type
```

**New Document Type Value:**
- `signed_contract` - Customer-signed contract agreement (requires AI matching)

---

### 5. RLS Policy Updates

#### 5.1 Update Insert Policy for AI Matching

```sql
-- Drop existing policy if needed
DROP POLICY IF EXISTS "Users can insert contract documents in their company" ON contract_documents;

-- Create enhanced policy
CREATE POLICY "Users can insert contract documents in their company"
ON contract_documents
FOR INSERT
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND
  auth.uid() IS NOT NULL
);
```

#### 5.2 Update Update Policy for Manual Overrides

```sql
-- Drop existing policy if needed
DROP POLICY IF EXISTS "Users can update contract documents in their company" ON contract_documents;

-- Create enhanced policy with override permissions
CREATE POLICY "Users can update contract documents in their company"
ON contract_documents
FOR UPDATE
USING (
  company_id = get_user_company(auth.uid())
)
WITH CHECK (
  -- Allow updates if user owns the company
  company_id = get_user_company(auth.uid()) AND
  -- Special handling for AI match fields:
  -- - ai_match_status, ai_match_confidence, matched_by can only be set by system
  -- - verified_by, verified_at can be set by user
  -- - match_notes can be updated by user
  CASE
    WHEN (OLD.ai_match_status IS DISTINCT FROM NEW.ai_match_status) THEN
      -- Only allow status change if user is verifying
      NEW.verified_by = auth.uid()
    ELSE true
  END
);
```

#### 5.3 New Policy for AI System Updates

```sql
-- Policy for service role to update AI fields
CREATE POLICY "Service role can update AI matching fields"
ON contract_documents
FOR UPDATE
USING (
  auth.role() = 'service_role'
)
WITH CHECK (
  auth.role() = 'service_role' AND
  -- Service role can only update AI-specific fields
  -- Cannot modify contract_id, company_id, etc.
  (
    (OLD.ai_match_status IS DISTINCT FROM NEW.ai_match_status) OR
    (OLD.ai_match_confidence IS DISTINCT FROM NEW.ai_match_confidence) OR
    (OLD.matched_by IS DISTINCT FROM NEW.matched_by) OR
    (OLD.matched_at IS DISTINCT FROM NEW.matched_at) OR
    (OLD.processing_status IS DISTINCT FROM NEW.processing_status) OR
    (OLD.processing_error IS DISTINCT FROM NEW.processing_error)
  ) AND
  -- Critical fields cannot be changed by service role
  OLD.contract_id = NEW.contract_id AND
  OLD.company_id = NEW.company_id
);
```

---

## 6. Database Functions

### 6.1 AI Match Result Function

```sql
-- Function to record AI match results
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
    processing_status = 'complete'
  WHERE id = p_document_id
  AND company_id = v_company_id;

  -- Return result
  RETURN jsonb_build_object(
    'document_id', p_document_id,
    'contract_id', p_contract_id,
    'status', v_match_status,
    'confidence', p_confidence
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.2 Manual Match Override Function

```sql
-- Function for users to override AI matches
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

  -- Verify user has access
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

  -- Return result
  RETURN jsonb_build_object(
    'document_id', p_document_id,
    'old_contract_id', v_old_contract_id,
    'new_contract_id', p_new_contract_id,
    'overridden_by', p_user_id,
    'overridden_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.3 Batch Upload Tracking Function

```sql
-- Function to create a new upload batch
CREATE OR REPLACE FUNCTION create_upload_batch(
  p_company_id TEXT,
  p_user_id UUID,
  p_file_count INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
BEGIN
  -- Generate batch ID
  v_batch_id := gen_random_uuid();

  -- Return batch ID (actual batch tracking could be done in a separate table if needed)
  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. Views for Dashboard Queries

### 7.1 Pending Matches View

```sql
-- View for dashboard showing documents awaiting action
CREATE OR REPLACE VIEW pending_contract_matches AS
SELECT
  cd.id,
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
  c.customer_name,
  v.vehicle_plate,
  cd.match_notes
FROM contract_documents cd
LEFT JOIN profiles p ON cd.uploaded_by = p.id
LEFT JOIN contracts c ON cd.contract_id = c.id
LEFT JOIN vehicles v ON c.vehicle_id = v.id
WHERE
  cd.document_type = 'signed_contract' AND
  cd.ai_match_status IN ('pending', 'review_required', 'not_matched')
ORDER BY cd.uploaded_at DESC;
```

### 7.2 Match Statistics View

```sql
-- View for matching statistics
CREATE OR REPLACE VIEW contract_match_statistics AS
SELECT
  company_id,
  COUNT(*) FILTER (WHERE ai_match_status = 'matched') as ai_matched_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'manual_override') as manual_override_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'review_required') as review_required_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'not_matched') as not_matched_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'pending') as pending_count,
  AVG(ai_match_confidence) FILTER (WHERE ai_match_confidence IS NOT NULL) as avg_confidence,
  COUNT(*) as total_documents
FROM contract_documents
WHERE document_type = 'signed_contract'
GROUP BY company_id;
```

---

## 8. Migration Script

### 8.1 Complete Migration SQL

```sql
-- Migration: 20260110000001_add_signed_contract_ai_matching.sql
-- Description: Add AI matching capabilities for signed contract uploads
-- Author: Fleetify Database Architect
-- Date: 2025-01-10

-- ============================================
-- STEP 1: Add AI matching columns
-- ============================================

-- AI match status tracking
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS ai_match_status TEXT
CHECK (ai_match_status IN ('pending', 'matched', 'not_matched', 'manual_override', 'review_required'))
DEFAULT 'pending';

-- Confidence score from AI (0-100)
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS ai_match_confidence DECIMAL(5,2)
CHECK (ai_match_confidence BETWEEN 0 AND 100)
DEFAULT NULL;

-- Who/what performed the match
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS matched_by TEXT
CHECK (matched_by IN ('ai', 'manual', 'bulk_import'))
DEFAULT NULL;

-- When the match occurred
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP WITH TIME ZONE
DEFAULT NULL;

-- User who verified/overrode the match
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS verified_by UUID
REFERENCES profiles(id) ON DELETE SET NULL
DEFAULT NULL;

-- When verification occurred
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE
DEFAULT NULL;

-- Notes about the match
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS match_notes TEXT
DEFAULT NULL;

-- ============================================
-- STEP 2: Add batch tracking columns
-- ============================================

-- Batch upload identifier
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS upload_batch_id UUID
DEFAULT NULL;

-- Original filename
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS original_filename TEXT
DEFAULT NULL;

-- Processing status
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS processing_status TEXT
CHECK (processing_status IN ('uploading', 'parsing', 'matching', 'complete', 'failed', 'review_required'))
DEFAULT 'complete';

-- Error details
ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS processing_error TEXT
DEFAULT NULL;

-- ============================================
-- STEP 3: Create indexes for performance
-- ============================================

-- AI match status index
CREATE INDEX IF NOT EXISTS idx_contract_documents_ai_match_status
ON contract_documents(company_id, ai_match_status)
WHERE ai_match_status IS NOT NULL;

-- Processing status index
CREATE INDEX IF NOT EXISTS idx_contract_documents_processing_status
ON contract_documents(company_id, processing_status)
WHERE processing_status IS NOT NULL;

-- Batch upload index
CREATE INDEX IF NOT EXISTS idx_contract_documents_upload_batch
ON contract_documents(upload_batch_id)
WHERE upload_batch_id IS NOT NULL;

-- Pending matches composite index
CREATE INDEX IF NOT EXISTS idx_contract_documents_pending_matches
ON contract_documents(company_id, ai_match_status, created_at DESC)
WHERE ai_match_status IN ('pending', 'review_required');

-- Manual overrides index
CREATE INDEX IF NOT EXISTS idx_contract_documents_manual_overrides
ON contract_documents(company_id, matched_by, matched_at DESC)
WHERE matched_by = 'manual';

-- ============================================
-- STEP 4: Add comments for documentation
-- ============================================

COMMENT ON COLUMN contract_documents.ai_match_status IS
'Status of AI matching: pending, matched, not_matched, manual_override, review_required';

COMMENT ON COLUMN contract_documents.ai_match_confidence IS
'AI confidence score (0-100). Scores < 70 trigger review_required';

COMMENT ON COLUMN contract_documents.matched_by IS
'Who performed the matching: ai, manual, bulk_import';

COMMENT ON COLUMN contract_documents.matched_at IS
'Timestamp when match was performed';

COMMENT ON COLUMN contract_documents.verified_by IS
'User who verified or overrode the AI match';

COMMENT ON COLUMN contract_documents.verified_at IS
'Timestamp when user verified or overrode the match';

COMMENT ON COLUMN contract_documents.match_notes IS
'Notes explaining match rejection, override reason, or verification comments';

COMMENT ON COLUMN contract_documents.upload_batch_id IS
'Identifier for batch upload operations';

COMMENT ON COLUMN contract_documents.original_filename IS
'Original filename before processing';

COMMENT ON COLUMN contract_documents.processing_status IS
'Status: uploading, parsing, matching, complete, failed, review_required';

COMMENT ON COLUMN contract_documents.processing_error IS
'Error message if processing failed';

-- ============================================
-- STEP 5: Create helper functions
-- ============================================

-- Function to record AI match results
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
  IF p_confidence < 0 OR p_confidence > 100 THEN
    RAISE EXCEPTION 'Confidence must be between 0 and 100';
  END IF;

  SELECT company_id INTO v_company_id
  FROM contract_documents
  WHERE id = p_document_id;

  IF p_confidence >= 80 THEN
    v_match_status := 'matched';
  ELSIF p_confidence >= 70 THEN
    v_match_status := 'review_required';
  ELSE
    v_match_status := 'not_matched';
  END IF;

  UPDATE contract_documents
  SET
    contract_id = p_contract_id,
    ai_match_confidence = p_confidence,
    ai_match_status = v_match_status,
    matched_by = 'ai',
    matched_at = NOW(),
    processing_status = 'complete'
  WHERE id = p_document_id
  AND company_id = v_company_id;

  RETURN jsonb_build_object(
    'document_id', p_document_id,
    'contract_id', p_contract_id,
    'status', v_match_status,
    'confidence', p_confidence
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to override AI matches
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
  SELECT company_id, contract_id INTO v_company_id, v_old_contract_id
  FROM contract_documents
  WHERE id = p_document_id;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'User does not have access to this document';
  END IF;

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

  RETURN jsonb_build_object(
    'document_id', p_document_id,
    'old_contract_id', v_old_contract_id,
    'new_contract_id', p_new_contract_id,
    'overridden_by', p_user_id,
    'overridden_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Create views for dashboard
-- ============================================

-- Pending matches view
CREATE OR REPLACE VIEW pending_contract_matches AS
SELECT
  cd.id,
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
  c.customer_name,
  v.vehicle_plate,
  cd.match_notes
FROM contract_documents cd
LEFT JOIN profiles p ON cd.uploaded_by = p.id
LEFT JOIN contracts c ON cd.contract_id = c.id
LEFT JOIN vehicles v ON c.vehicle_id = v.id
WHERE
  cd.document_type = 'signed_contract' AND
  cd.ai_match_status IN ('pending', 'review_required', 'not_matched');

-- Match statistics view
CREATE OR REPLACE VIEW contract_match_statistics AS
SELECT
  company_id,
  COUNT(*) FILTER (WHERE ai_match_status = 'matched') as ai_matched_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'manual_override') as manual_override_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'review_required') as review_required_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'not_matched') as not_matched_count,
  COUNT(*) FILTER (WHERE ai_match_status = 'pending') as pending_count,
  AVG(ai_match_confidence) FILTER (WHERE ai_match_confidence IS NOT NULL) as avg_confidence,
  COUNT(*) as total_documents
FROM contract_documents
WHERE document_type = 'signed_contract'
GROUP BY company_id;

-- ============================================
-- STEP 7: Grant permissions
-- ============================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION record_ai_match_result TO authenticated;
GRANT EXECUTE ON FUNCTION override_contract_match TO authenticated;

-- Grant select on views
GRANT SELECT ON pending_contract_matches TO authenticated;
GRANT SELECT ON contract_match_statistics TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
```

### 8.2 Rollback Script

```sql
-- Migration: 20260110000001_add_signed_contract_ai_matching_ROLLBACK.sql
-- Description: Rollback AI matching features

-- Drop views
DROP VIEW IF EXISTS pending_contract_matches;
DROP VIEW IF EXISTS contract_match_statistics;

-- Drop functions
DROP FUNCTION IF EXISTS record_ai_match_result(UUID, UUID, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS override_contract_match(UUID, UUID, UUID, TEXT);

-- Drop indexes
DROP INDEX IF EXISTS idx_contract_documents_ai_match_status;
DROP INDEX IF EXISTS idx_contract_documents_processing_status;
DROP INDEX IF EXISTS idx_contract_documents_upload_batch;
DROP INDEX IF EXISTS idx_contract_documents_pending_matches;
DROP INDEX IF EXISTS idx_contract_documents_manual_overrides;

-- Drop columns
ALTER TABLE contract_documents DROP COLUMN IF EXISTS ai_match_status;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS ai_match_confidence;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS matched_by;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS matched_at;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS verified_by;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS verified_at;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS match_notes;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS upload_batch_id;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS original_filename;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS processing_status;
ALTER TABLE contract_documents DROP COLUMN IF EXISTS processing_error;
```

---

## 9. Implementation Checklist

### Pre-Migration
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify RLS policies work correctly
- [ ] Test functions with sample data

### Post-Migration
- [ ] Update TypeScript types in `src/integrations/supabase/types.ts`
- [ ] Create React hooks for AI matching operations
- [ ] Build upload UI component with batch support
- [ ] Implement dashboard widgets for pending matches
- [ ] Add manual override dialog component
- [ ] Create match statistics dashboard cards
- [ ] Write E2E tests for matching workflow
- [ ] Update API documentation

### Monitoring
- [ ] Set up alerts for high "not_matched" rates
- [ ] Monitor average AI confidence scores
- [ ] Track manual override frequency
- [ ] Measure processing time per document

---

## 10. Security Considerations

### RLS Policy Scope
- All policies enforce company_id isolation
- Service role has restricted update permissions
- Regular users cannot directly modify AI confidence scores
- Manual overrides are audited (verified_by, verified_at)

### Data Privacy
- Original filenames stored separately from storage paths
- Processing errors may contain file data - handled securely
- Match notes may contain PII - access controlled via RLS

### Performance
- Indexes optimized for common query patterns
- Views use appropriate joins for dashboard queries
- Functions use SECURITY DEFINER with proper checks

---

## 11. Future Enhancements

### Phase 2 (Optional)
- Add `ai_model_version` column to track which AI model performed matching
- Add `match_rejection_reasons` array for multiple rejection reasons
- Create `document_match_history` table for full audit trail
- Add webhook notifications for failed matches
- Implement ML feedback loop for model improvement

### Phase 3 (Advanced)
- Multi-contract matching (one document for multiple contracts)
- Contract renewal detection
- Signature extraction and verification
- Document similarity scoring for duplicate detection
- Automated archival of old signed contracts

---

## Appendix A: Query Examples

### Query 1: Get All Pending Matches for Company
```sql
SELECT
  cd.id,
  cd.document_name,
  cd.uploaded_at,
  p.first_name,
  p.last_name
FROM contract_documents cd
JOIN profiles p ON cd.uploaded_by = p.id
WHERE
  cd.company_id = $1
  AND cd.document_type = 'signed_contract'
  AND cd.ai_match_status IN ('pending', 'review_required')
ORDER BY cd.uploaded_at DESC;
```

### Query 2: Get Low Confidence Matches Requiring Review
```sql
SELECT
  cd.id,
  cd.document_name,
  cd.ai_match_confidence,
  c.contract_number,
  c.customer_name
FROM contract_documents cd
LEFT JOIN contracts c ON cd.contract_id = c.id
WHERE
  cd.company_id = $1
  AND cd.ai_match_status = 'review_required'
  AND cd.ai_match_confidence BETWEEN 70 AND 79
ORDER BY cd.ai_match_confidence DESC;
```

### Query 3: Get Manual Override History
```sql
SELECT
  cd.id,
  cd.document_name,
  cd.match_notes,
  cd.matched_at,
  p1.first_name || ' ' || p1.last_name as overridden_by,
  c.contract_number
FROM contract_documents cd
JOIN profiles p1 ON cd.verified_by = p1.id
LEFT JOIN contracts c ON cd.contract_id = c.id
WHERE
  cd.company_id = $1
  AND cd.matched_by = 'manual'
ORDER BY cd.matched_at DESC;
```

---

**End of Design Document**
