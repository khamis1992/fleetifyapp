-- Fix RLS policies for personal_reminders, user_goals, and quick_notes tables
-- The issue: policies were checking auth.uid() = profiles.id, but should check auth.uid() = profiles.user_id

-- ============================================================================
-- FIX personal_reminders RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own reminders" ON personal_reminders;
DROP POLICY IF EXISTS "Users can insert their own reminders" ON personal_reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON personal_reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON personal_reminders;

-- Create corrected policies
CREATE POLICY "Users can view their own reminders"
  ON personal_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = personal_reminders.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own reminders"
  ON personal_reminders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = personal_reminders.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own reminders"
  ON personal_reminders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = personal_reminders.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own reminders"
  ON personal_reminders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = personal_reminders.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FIX user_goals RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON user_goals;

-- Create corrected policies
CREATE POLICY "Users can view their own goals"
  ON user_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = user_goals.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own goals"
  ON user_goals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = user_goals.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own goals"
  ON user_goals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = user_goals.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own goals"
  ON user_goals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = user_goals.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FIX quick_notes RLS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notes" ON quick_notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON quick_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON quick_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON quick_notes;

-- Create corrected policies
CREATE POLICY "Users can view their own notes"
  ON quick_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = quick_notes.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own notes"
  ON quick_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = quick_notes.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notes"
  ON quick_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = quick_notes.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own notes"
  ON quick_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = quick_notes.user_id 
      AND profiles.user_id = auth.uid()
    )
  );
