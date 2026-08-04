-- Track which communications have been replied to / converted into a task by a manager.
-- Used by the team communication log to hide handled items (with an option to view them).

ALTER TABLE public.customer_communications
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_task_id uuid;

-- Allow company managers/admins/owners to update communications (e.g. mark as replied).
-- Mirrors the existing DELETE policy roles for the same table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'customer_communications'
      AND policyname = 'Managers can update company communications'
  ) THEN
    CREATE POLICY "Managers can update company communications"
      ON public.customer_communications
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles profile
          WHERE profile.user_id = auth.uid()
            AND profile.company_id = customer_communications.company_id
            AND profile.role = ANY (ARRAY['admin'::text, 'owner'::text, 'super_admin'::text, 'manager'::text])
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles profile
          WHERE profile.user_id = auth.uid()
            AND profile.company_id = customer_communications.company_id
            AND profile.role = ANY (ARRAY['admin'::text, 'owner'::text, 'super_admin'::text, 'manager'::text])
        )
      );
  END IF;
END $$;
