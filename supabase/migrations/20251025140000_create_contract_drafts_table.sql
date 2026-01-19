-- Migration: Create Contract Drafts Table
-- Description: Allows users to save incomplete contracts and resume later
-- Date: 2025-10-25
-- Author: Claude Code - Phase 2 UX Improvements

-- Create contract_drafts table
CREATE TABLE IF NOT EXISTS contract_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  draft_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days') NOT NULL,
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contract_drafts_company ON contract_drafts(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_drafts_user ON contract_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_drafts_customer ON contract_drafts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contract_drafts_vehicle ON contract_drafts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_contract_drafts_expires ON contract_drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_contract_drafts_updated ON contract_drafts(updated_at DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_contract_drafts_user_company ON contract_drafts(user_id, company_id, updated_at DESC);

-- Enable Row Level Security
ALTER TABLE contract_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own company's drafts
CREATE POLICY "Users can view own company drafts"
  ON contract_drafts FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can create drafts in their company
CREATE POLICY "Users can create drafts"
  ON contract_drafts FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- RLS Policy: Users can update their own drafts
CREATE POLICY "Users can update own drafts"
  ON contract_drafts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can delete their own drafts
CREATE POLICY "Users can delete own drafts"
  ON contract_drafts FOR DELETE
  USING (user_id = auth.uid());

-- Create or replace trigger for updated_at
CREATE OR REPLACE FUNCTION update_contract_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contract_drafts_updated_at ON contract_drafts;
CREATE TRIGGER trigger_update_contract_drafts_updated_at
  BEFORE UPDATE ON contract_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_drafts_updated_at();

-- Function to clean up expired drafts (can be called via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_contract_drafts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM contract_drafts
  WHERE expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE contract_drafts IS 'Stores draft contracts that users can save and resume later. Drafts expire after 30 days.';

-- Comment on columns
COMMENT ON COLUMN contract_drafts.draft_data IS 'JSONB containing all contract form data';
COMMENT ON COLUMN contract_drafts.draft_name IS 'Optional user-given name for the draft';
COMMENT ON COLUMN contract_drafts.expires_at IS 'Draft expiration date (default 30 days from creation)';

-- Grant necessary permissions (adjust as needed based on your auth setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON contract_drafts TO authenticated;
-- GRANT USAGE ON SEQUENCE contract_drafts_id_seq TO authenticated;

-- Rollback instructions (for documentation):
-- To rollback this migration, run:
-- DROP TABLE IF EXISTS contract_drafts CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_expired_contract_drafts() CASCADE;
-- DROP FUNCTION IF EXISTS update_contract_drafts_updated_at() CASCADE;
