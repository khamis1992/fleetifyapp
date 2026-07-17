CREATE OR REPLACE FUNCTION public.stage_maintenance_journal_before_insert_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_type = 'maintenance'
     AND lower(COALESCE(NEW.status, '')) = 'posted'
     AND NEW.entry_number LIKE 'JE-MNT-%'
  THEN
    NEW.status := 'draft';
    NEW.posted_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_staged_maintenance_journal_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line_count integer;
  v_total_debit numeric;
  v_total_credit numeric;
BEGIN
  IF NEW.reference_type <> 'maintenance'
     OR NEW.entry_number NOT LIKE 'JE-MNT-%'
     OR lower(COALESCE(NEW.status, '')) <> 'draft'
  THEN
    RETURN NEW;
  END IF;

  SELECT
    count(*),
    COALESCE(sum(line.debit_amount), 0),
    COALESCE(sum(line.credit_amount), 0)
  INTO v_line_count, v_total_debit, v_total_credit
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = NEW.id;

  IF v_line_count < 2 OR abs(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Maintenance journal must contain at least two balanced lines before posting'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.journal_entries entry
  SET status = 'posted',
      total_debit = v_total_debit,
      total_credit = v_total_credit,
      posted_by = COALESCE(NEW.posted_by, NEW.created_by),
      posted_at = now(),
      updated_at = now()
  WHERE entry.id = NEW.id
    AND lower(COALESCE(entry.status, '')) = 'draft';

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stage_maintenance_journal_before_insert_v1()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_staged_maintenance_journal_v1()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stage_maintenance_journal_before_insert_v1()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.post_staged_maintenance_journal_v1()
  TO service_role;

DROP TRIGGER IF EXISTS stage_maintenance_journal_before_insert_v1
  ON public.journal_entries;
CREATE TRIGGER stage_maintenance_journal_before_insert_v1
BEFORE INSERT ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.stage_maintenance_journal_before_insert_v1();

DROP TRIGGER IF EXISTS post_staged_maintenance_journal_v1
  ON public.journal_entries;
CREATE CONSTRAINT TRIGGER post_staged_maintenance_journal_v1
AFTER INSERT ON public.journal_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.post_staged_maintenance_journal_v1();

COMMENT ON FUNCTION public.post_staged_maintenance_journal_v1() IS
  'Posts staged maintenance journals only after their balanced lines exist at transaction end.';
