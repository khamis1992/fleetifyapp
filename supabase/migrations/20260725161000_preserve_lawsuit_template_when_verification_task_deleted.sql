-- Lawsuit preparation is a retained legal record. Deleting a contract cascades
-- its verification tasks, so the lawsuit template must release the task link
-- instead of blocking the entire permanent-deletion transaction.

ALTER TABLE public.lawsuit_templates
  DROP CONSTRAINT IF EXISTS lawsuit_templates_verification_task_id_fkey;

ALTER TABLE public.lawsuit_templates
  ADD CONSTRAINT lawsuit_templates_verification_task_id_fkey
  FOREIGN KEY (verification_task_id)
  REFERENCES public.customer_verification_tasks(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.lawsuit_templates.verification_task_id IS
'Optional source verification task. The legal template is retained and this link is cleared when the task is deleted.';
