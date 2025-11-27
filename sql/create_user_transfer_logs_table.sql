-- Create user_transfer_logs table to track user transfers between companies
CREATE TABLE IF NOT EXISTS user_transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  to_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  old_roles TEXT[],
  new_roles TEXT[],
  transfer_reason TEXT,
  transferred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_transfer_logs_user_id ON user_transfer_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transfer_logs_transferred_at ON user_transfer_logs(transferred_at DESC);

-- Enable RLS
ALTER TABLE user_transfer_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

CREATE POLICY "Super admins can insert transfer logs"
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

-- Grant permissions
GRANT SELECT, INSERT ON user_transfer_logs TO authenticated;

COMMENT ON TABLE user_transfer_logs IS 'Logs all user transfers between companies for audit purposes';

