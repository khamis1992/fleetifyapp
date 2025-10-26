-- Create demo_sessions table for tracking demo account trials
CREATE TABLE IF NOT EXISTS demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_start_date timestamptz NOT NULL DEFAULT now(),
  trial_end_date timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_demo_sessions_user_id ON demo_sessions(demo_user_id);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_active ON demo_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_trial_end ON demo_sessions(trial_end_date);

-- Add is_demo flag to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_end_date timestamptz;

-- Add is_demo_user flag to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_demo_user boolean DEFAULT false;

-- Enable Row Level Security
ALTER TABLE demo_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for demo_sessions
CREATE POLICY "Users can view their own demo sessions"
  ON demo_sessions
  FOR SELECT
  USING (auth.uid() = demo_user_id);

CREATE POLICY "Users can create their own demo sessions"
  ON demo_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = demo_user_id);

CREATE POLICY "Users can update their own demo sessions"
  ON demo_sessions
  FOR UPDATE
  USING (auth.uid() = demo_user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_demo_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_demo_sessions_updated_at
  BEFORE UPDATE ON demo_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_demo_sessions_updated_at();

-- Function to deactivate expired demo sessions (run via cron or manually)
CREATE OR REPLACE FUNCTION deactivate_expired_demo_sessions()
RETURNS void AS $$
BEGIN
  UPDATE demo_sessions
  SET is_active = false
  WHERE is_active = true 
    AND trial_end_date < now();
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE demo_sessions IS 'Tracks demo account trial periods (7-day trials)';
COMMENT ON COLUMN demo_sessions.demo_user_id IS 'Reference to the demo user account';
COMMENT ON COLUMN demo_sessions.trial_start_date IS 'When the trial period started';
COMMENT ON COLUMN demo_sessions.trial_end_date IS 'When the trial period expires';
COMMENT ON COLUMN demo_sessions.is_active IS 'Whether the trial is currently active';
