-- Rollback for 20260804120000_communication_replied_tracking.sql

DROP POLICY IF EXISTS "Managers can update company communications"
  ON public.customer_communications;

ALTER TABLE public.customer_communications
  DROP COLUMN IF EXISTS replied_at,
  DROP COLUMN IF EXISTS replied_task_id;
