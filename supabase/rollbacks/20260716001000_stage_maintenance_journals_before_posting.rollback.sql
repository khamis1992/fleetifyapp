DROP TRIGGER IF EXISTS post_staged_maintenance_journal_v1
  ON public.journal_entries;
DROP TRIGGER IF EXISTS stage_maintenance_journal_before_insert_v1
  ON public.journal_entries;
DROP FUNCTION IF EXISTS public.post_staged_maintenance_journal_v1();
DROP FUNCTION IF EXISTS public.stage_maintenance_journal_before_insert_v1();
