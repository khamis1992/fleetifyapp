-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own reminders" ON personal_reminders;
DROP POLICY IF EXISTS "Users can insert their own reminders" ON personal_reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON personal_reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON personal_reminders;

DROP POLICY IF EXISTS "Users can view their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON user_goals;

DROP POLICY IF EXISTS "Users can view their own notes" ON quick_notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON quick_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON quick_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON quick_notes;

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
  ));;
