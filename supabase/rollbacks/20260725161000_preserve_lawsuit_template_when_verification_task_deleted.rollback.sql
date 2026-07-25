ALTER TABLE public.lawsuit_templates
  DROP CONSTRAINT IF EXISTS lawsuit_templates_verification_task_id_fkey;

ALTER TABLE public.lawsuit_templates
  ADD CONSTRAINT lawsuit_templates_verification_task_id_fkey
  FOREIGN KEY (verification_task_id)
  REFERENCES public.customer_verification_tasks(id);
