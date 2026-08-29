-- Migration: add_signed_contract_ai_matching
-- Description: Add AI matching capabilities for signed contract uploads

-- ============================================
-- STEP 1: Add AI matching columns
-- ============================================

ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS ai_match_status TEXT
CHECK (ai_match_status IN ('pending', 'matched', 'not_matched', 'manual_override', 'review_required'))
DEFAULT 'pending';

ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS ai_match_confidence DECIMAL(5,2)
CHECK (ai_match_confidence BETWEEN 0 AND 100)
DEFAULT NULL;

ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS matched_by TEXT
CHECK (matched_by IN ('ai', 'manual', 'bulk_import'))
DEFAULT NULL;

ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP WITH TIME ZONE
DEFAULT NULL;

ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS verified_by UUID
REFERENCES profiles(id) ON DELETE SET NULL
DEFAULT NULL;

ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE
DEFAULT NULL;

ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS match_notes TEXT
DEFAULT NULL;

-- ============================================
-- STEP 2: Add batch tracking columns
-- ============================================

ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS upload_batch_id UUID
DEFAULT NULL;

ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS original_filename TEXT
DEFAULT NULL;

ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS processing_status TEXT
CHECK (processing_status IN ('uploading', 'parsing', 'matching', 'complete', 'failed', 'review_required'))
DEFAULT 'complete';

ALTER TABLE contract_documents
ADD COLUMN IF NOT EXISTS processing_error TEXT
DEFAULT NULL;

-- ============================================
-- STEP 3: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contract_documents_ai_match_status
ON contract_documents(company_id, ai_match_status)
WHERE ai_match_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contract_documents_processing_status
ON contract_documents(company_id, processing_status)
WHERE processing_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contract_documents_upload_batch
ON contract_documents(upload_batch_id)
WHERE upload_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contract_documents_pending_matches
ON contract_documents(company_id, ai_match_status, created_at DESC)
WHERE ai_match_status IN ('pending', 'review_required');

CREATE INDEX IF NOT EXISTS idx_contract_documents_manual_overrides
ON contract_documents(company_id, matched_by, matched_at DESC)
WHERE matched_by = 'manual';

-- ============================================
-- STEP 4: Add comments
-- ============================================

COMMENT ON COLUMN contract_documents.ai_match_status IS 'Status of AI matching: pending, matched, not_matched, manual_override, review_required';
COMMENT ON COLUMN contract_documents.ai_match_confidence IS 'AI confidence score (0-100) for the match';
COMMENT ON COLUMN contract_documents.matched_by IS 'Who performed the matching: ai, manual, bulk_import';
COMMENT ON COLUMN contract_documents.matched_at IS 'Timestamp when the match was performed';
COMMENT ON COLUMN contract_documents.verified_by IS 'User who verified or overrode the AI match';
COMMENT ON COLUMN contract_documents.verified_at IS 'Timestamp when user verified or overrode the match';
COMMENT ON COLUMN contract_documents.match_notes IS 'Notes explaining match decision';
COMMENT ON COLUMN contract_documents.upload_batch_id IS 'Identifier for batch upload operations';
COMMENT ON COLUMN contract_documents.original_filename IS 'Original filename before processing';
COMMENT ON COLUMN contract_documents.processing_status IS 'Status of document processing pipeline';
COMMENT ON COLUMN contract_documents.processing_error IS 'Error message if processing failed';

-- ============================================
-- STEP 5: Create helper functions
-- ============================================

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

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

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
    processing_status = 'complete',
    processing_error = NULL
  WHERE id = p_document_id
  AND company_id = v_company_id;

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

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

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
-- STEP 6: Create views for dashboard queries (FIXED column names)
-- ============================================

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

COMMENT ON VIEW pending_contract_matches IS 'Dashboard view showing signed contract documents pending AI matching';

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

COMMENT ON VIEW contract_match_statistics IS 'Aggregate statistics for signed contract AI matching performance';

-- ============================================
-- STEP 7: Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION record_ai_match_result TO authenticated;
GRANT EXECUTE ON FUNCTION override_contract_match TO authenticated;
GRANT SELECT ON pending_contract_matches TO authenticated;
GRANT SELECT ON contract_match_statistics TO authenticated;;
