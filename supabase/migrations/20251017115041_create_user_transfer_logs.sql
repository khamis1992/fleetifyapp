-- Create user_transfer_logs table to track user transfers between companies
CREATE TABLE IF NOT EXISTS user_transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  to_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  transfer_reason TEXT,
  data_handling_strategy JSONB,
  new_roles TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_transfer_logs_user_id ON user_transfer_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transfer_logs_from_company ON user_transfer_logs(from_company_id);
CREATE INDEX IF NOT EXISTS idx_user_transfer_logs_to_company ON user_transfer_logs(to_company_id);
CREATE INDEX IF NOT EXISTS idx_user_transfer_logs_transferred_at ON user_transfer_logs(transferred_at DESC);

-- Add RLS policies
ALTER TABLE user_transfer_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all transfer logs
CREATE POLICY "Super admins can view all transfer logs"
  ON user_transfer_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Company admins can view transfers related to their company
CREATE POLICY "Company admins can view their company transfers"
  ON user_transfer_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.id = auth.uid()
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('company_admin', 'super_admin')
      AND (
        user_transfer_logs.from_company_id = p.company_id
        OR user_transfer_logs.to_company_id = p.company_id
      )
    )
  );

-- Only super admins can insert transfer logs (via Edge Function)
CREATE POLICY "Only super admins can insert transfer logs"
  ON user_transfer_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Add comment
COMMENT ON TABLE user_transfer_logs IS 'Tracks user transfers between companies for audit purposes';
