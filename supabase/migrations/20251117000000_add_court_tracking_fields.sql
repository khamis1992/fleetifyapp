-- =====================================================
-- Add Court Tracking Fields to Legal Cases
-- Created: 2025-11-17
-- Description: Add complaint_number and judge_name fields for better court case tracking
-- =====================================================

-- Add complaint_number field (رقم البلاغ)
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS complaint_number VARCHAR(200);

-- Add judge_name field (القاضي المسؤول)
ALTER TABLE legal_cases 
ADD COLUMN IF NOT EXISTS judge_name VARCHAR(300);

-- Add index for complaint_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_legal_cases_complaint_number 
ON legal_cases(complaint_number);

-- Add comment to document the fields
COMMENT ON COLUMN legal_cases.complaint_number IS 'رقم البلاغ - Complaint/Report number filed with authorities';
COMMENT ON COLUMN legal_cases.judge_name IS 'القاضي المسؤول - Name of the judge assigned to the case';
