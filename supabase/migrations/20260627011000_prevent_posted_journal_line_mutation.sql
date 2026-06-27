-- Posted journal entry lines are immutable. Corrections must use reversal entries.
CREATE OR REPLACE FUNCTION public.prevent_posted_journal_line_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_journal_entry_id uuid;
  v_parent_status text;
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_journal_entry_id := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

  SELECT status
  INTO v_parent_status
  FROM public.journal_entries
  WHERE id = v_journal_entry_id;

  IF LOWER(COALESCE(v_parent_status, '')) IN ('posted', 'reversed') THEN
    RAISE EXCEPTION 'Posted journal entry lines cannot be changed. Create a reversal entry instead.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_posted_journal_line_mutation_trigger ON public.journal_entry_lines;

CREATE TRIGGER prevent_posted_journal_line_mutation_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.prevent_posted_journal_line_mutation();
