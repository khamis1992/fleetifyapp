-- ============================================================================
-- Migration: Enhance traffic_violations table for MOI Qatar PDF import
-- Date: 2025-01-12
-- Description: Add fields for reference numbers, match confidence, and import tracking
-- ============================================================================

-- Add reference number field (MOI specific - unique identifier from MOI)
ALTER TABLE traffic_violations
ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- Add match confidence field for UI feedback (high, medium, low)
ALTER TABLE traffic_violations
ADD COLUMN IF NOT EXISTS match_confidence TEXT;

-- Add source tracking to know where violation came from (moi_pdf, manual, api)
ALTER TABLE traffic_violations
ADD COLUMN IF NOT EXISTS import_source TEXT;

-- Add file number for MOI documents (e.g., 86-2015-17)
ALTER TABLE traffic_violations
ADD COLUMN IF NOT EXISTS file_number TEXT;

-- Index for duplicate detection by reference number
CREATE INDEX IF NOT EXISTS idx_traffic_violations_reference
ON traffic_violations(reference_number)
WHERE reference_number IS NOT NULL;

-- Composite unique index for duplicate detection
-- Prevents duplicate violations for same vehicle, same violation number, same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_traffic_violations_unique_violation
ON traffic_violations(vehicle_id, violation_number, violation_date)
WHERE vehicle_id IS NOT NULL AND violation_number IS NOT NULL AND violation_date IS NOT NULL;

-- Index for match confidence queries
CREATE INDEX IF NOT EXISTS idx_traffic_violations_match_confidence
ON traffic_violations(match_confidence)
WHERE match_confidence IS NOT NULL;

-- Index for file number lookups
CREATE INDEX IF NOT EXISTS idx_traffic_violations_file_number
ON traffic_violations(file_number)
WHERE file_number IS NOT NULL;

-- Add constraint for match_confidence values
ALTER TABLE traffic_violations
ADD CONSTRAINT IF NOT EXISTS check_match_confidence
CHECK (match_confidence IN ('high', 'medium', 'low', 'none'));

-- Add constraint for import_source values
ALTER TABLE traffic_violations
ADD CONSTRAINT IF NOT EXISTS check_import_source
CHECK (import_source IN ('moi_pdf', 'manual', 'api', 'bulk_import'));

-- Add comment for documentation
COMMENT ON COLUMN traffic_violations.reference_number IS 'MOI reference number from PDF (10 digits)';
COMMENT ON COLUMN traffic_violations.match_confidence IS 'Confidence level of contract/customer match: high, medium, low, none';
COMMENT ON COLUMN traffic_violations.import_source IS 'Source of violation import: moi_pdf, manual, api, bulk_import';
COMMENT ON COLUMN traffic_violations.file_number IS 'MOI file number (e.g., 86-2015-17)';
