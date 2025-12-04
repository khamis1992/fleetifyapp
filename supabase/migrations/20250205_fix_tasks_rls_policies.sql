-- Fix RLS policies for tasks table
-- This migration ensures that authenticated users can create and manage tasks within their company

-- First, drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view tasks in their company" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their company" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their company" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their company" ON tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create new policies

-- SELECT: Users can view tasks in their company
CREATE POLICY "tasks_select_policy" ON tasks
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid()::uuid OR user_id = auth.uid()
  )
);

-- INSERT: Users can create tasks in their company
CREATE POLICY "tasks_insert_policy" ON tasks
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid()::uuid OR user_id = auth.uid()
  )
);

-- UPDATE: Users can update tasks in their company
CREATE POLICY "tasks_update_policy" ON tasks
FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid()::uuid OR user_id = auth.uid()
  )
);

-- DELETE: Users can delete tasks in their company
CREATE POLICY "tasks_delete_policy" ON tasks
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid()::uuid OR user_id = auth.uid()
  )
);

-- Also fix task_checklists, task_comments, task_notifications policies
DO $$
BEGIN
  -- task_checklists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_checklists') THEN
    DROP POLICY IF EXISTS "task_checklists_select" ON task_checklists;
    DROP POLICY IF EXISTS "task_checklists_insert" ON task_checklists;
    DROP POLICY IF EXISTS "task_checklists_update" ON task_checklists;
    DROP POLICY IF EXISTS "task_checklists_delete" ON task_checklists;
    
    ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "task_checklists_select" ON task_checklists FOR SELECT TO authenticated
    USING (task_id IN (SELECT id FROM tasks WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
    )));
    
    CREATE POLICY "task_checklists_insert" ON task_checklists FOR INSERT TO authenticated
    WITH CHECK (task_id IN (SELECT id FROM tasks WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
    )));
    
    CREATE POLICY "task_checklists_update" ON task_checklists FOR UPDATE TO authenticated
    USING (task_id IN (SELECT id FROM tasks WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
    )));
    
    CREATE POLICY "task_checklists_delete" ON task_checklists FOR DELETE TO authenticated
    USING (task_id IN (SELECT id FROM tasks WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
    )));
  END IF;
  
  -- task_comments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_comments') THEN
    DROP POLICY IF EXISTS "task_comments_select" ON task_comments;
    DROP POLICY IF EXISTS "task_comments_insert" ON task_comments;
    DROP POLICY IF EXISTS "task_comments_delete" ON task_comments;
    
    ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "task_comments_select" ON task_comments FOR SELECT TO authenticated
    USING (task_id IN (SELECT id FROM tasks WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
    )));
    
    CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT TO authenticated
    WITH CHECK (task_id IN (SELECT id FROM tasks WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()
    )));
    
    CREATE POLICY "task_comments_delete" ON task_comments FOR DELETE TO authenticated
    USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()));
  END IF;
  
  -- task_notifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_notifications') THEN
    DROP POLICY IF EXISTS "task_notifications_select" ON task_notifications;
    DROP POLICY IF EXISTS "task_notifications_insert" ON task_notifications;
    DROP POLICY IF EXISTS "task_notifications_update" ON task_notifications;
    
    ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "task_notifications_select" ON task_notifications FOR SELECT TO authenticated
    USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()));
    
    CREATE POLICY "task_notifications_insert" ON task_notifications FOR INSERT TO authenticated
    WITH CHECK (true);
    
    CREATE POLICY "task_notifications_update" ON task_notifications FOR UPDATE TO authenticated
    USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()::uuid OR user_id = auth.uid()));
  END IF;
END $$;

