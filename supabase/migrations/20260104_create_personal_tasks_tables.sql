-- Personal Reminders table
CREATE TABLE IF NOT EXISTS personal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reminder_time TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  related_entity JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Goals table
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_count INTEGER NOT NULL DEFAULT 1,
  current_count INTEGER DEFAULT 0,
  period_type TEXT DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  category TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quick Notes table
CREATE TABLE IF NOT EXISTS quick_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'other' CHECK (note_type IN ('idea', 'alert', 'call', 'reminder', 'other')),
  color TEXT DEFAULT '#f0f0f0',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  related_entity JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_personal_reminders_user_id ON personal_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_reminders_company_id ON personal_reminders(company_id);
CREATE INDEX IF NOT EXISTS idx_personal_reminders_reminder_time ON personal_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_personal_reminders_is_completed ON personal_reminders(is_completed);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_company_id ON user_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_period_type ON user_goals(period_type);
CREATE INDEX IF NOT EXISTS idx_user_goals_is_completed ON user_goals(is_completed);

CREATE INDEX IF NOT EXISTS idx_quick_notes_user_id ON quick_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_notes_company_id ON quick_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_quick_notes_is_archived ON quick_notes(is_archived);
CREATE INDEX IF NOT EXISTS idx_quick_notes_is_pinned ON quick_notes(is_pinned);

-- Enable RLS
ALTER TABLE personal_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personal_reminders
CREATE POLICY "Users can view their own reminders"
  ON personal_reminders FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE id = personal_reminders.user_id
  ));

CREATE POLICY "Users can insert their own reminders"
  ON personal_reminders FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE id = personal_reminders.user_id
  ));

CREATE POLICY "Users can update their own reminders"
  ON personal_reminders FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE id = personal_reminders.user_id
  ));

CREATE POLICY "Users can delete their own reminders"
  ON personal_reminders FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE id = personal_reminders.user_id
  ));

-- RLS Policies for user_goals
CREATE POLICY "Users can view their own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE id = user_goals.user_id
  ));

CREATE POLICY "Users can insert their own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE id = user_goals.user_id
  ));

CREATE POLICY "Users can update their own goals"
  ON user_goals FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE id = user_goals.user_id
  ));

CREATE POLICY "Users can delete their own goals"
  ON user_goals FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE id = user_goals.user_id
  ));

-- RLS Policies for quick_notes
CREATE POLICY "Users can view their own notes"
  ON quick_notes FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE id = quick_notes.user_id
  ));

CREATE POLICY "Users can insert their own notes"
  ON quick_notes FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE id = quick_notes.user_id
  ));

CREATE POLICY "Users can update their own notes"
  ON quick_notes FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE id = quick_notes.user_id
  ));

CREATE POLICY "Users can delete their own notes"
  ON quick_notes FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE id = quick_notes.user_id
  ));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_personal_reminders_updated_at
  BEFORE UPDATE ON personal_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quick_notes_updated_at
  BEFORE UPDATE ON quick_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();







