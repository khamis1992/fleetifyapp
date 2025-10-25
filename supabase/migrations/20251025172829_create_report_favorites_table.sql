-- =====================================================
-- Report Favorites Table
-- Created: 2025-10-25
-- Description: Store user's favorite report configurations for quick access
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- REPORT FAVORITES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS report_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  report_config JSONB,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_report_favorites_company ON report_favorites(company_id);
CREATE INDEX idx_report_favorites_user ON report_favorites(user_id);
CREATE INDEX idx_report_favorites_type ON report_favorites(report_type);
CREATE INDEX idx_report_favorites_created_at ON report_favorites(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE report_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their company's report favorites
CREATE POLICY "Users can view company report favorites"
  ON report_favorites FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can create their own report favorites
CREATE POLICY "Users can create own report favorites"
  ON report_favorites FOR INSERT
  WITH CHECK (
    user_id = (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own report favorites
CREATE POLICY "Users can delete own report favorites"
  ON report_favorites FOR DELETE
  USING (
    user_id = (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE report_favorites IS 'Store user favorite report configurations for quick access in Reports Hub';
COMMENT ON COLUMN report_favorites.report_type IS 'Type of report (e.g., daily_revenue, fleet_utilization)';
COMMENT ON COLUMN report_favorites.report_config IS 'JSON configuration for the report (filters, parameters, etc.)';
COMMENT ON COLUMN report_favorites.name IS 'User-defined name for the favorite report';
