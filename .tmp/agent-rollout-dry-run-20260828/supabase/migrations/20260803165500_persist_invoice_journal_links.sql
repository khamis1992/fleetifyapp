-- Persist the invoice -> journal link created by the canonical trigger.
-- The existing trigger is AFTER INSERT, so assigning NEW.journal_entry_id in
-- its function cannot modify the stored invoice row. Running the same trigger
-- function BEFORE INSERT makes the assignment part of the inserted tuple.

BEGIN;
DO $$
BEGIN
  IF to_regprocedure('public.trg_invoice_journal_entry_fn()') IS NULL THEN
    RAISE EXCEPTION 'trg_invoice_journal_entry_fn() is required';
  END IF;
END;
$$;
CREATE FUNCTION public.persist_invoice_reference_journal_link_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_journal_id uuid;
  v_journal_count integer;
BEGIN
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    (array_agg(entry.id ORDER BY entry.id))[1],
    count(*)
  INTO v_journal_id, v_journal_count
  FROM public.journal_entries entry
  WHERE entry.company_id = NEW.company_id
    AND entry.reference_type = 'invoice'
    AND entry.reference_id = NEW.id;

  IF v_journal_count > 1 THEN
    RAISE EXCEPTION 'Invoice % has multiple reference journals', NEW.id
      USING ERRCODE = 'P0001';
  END IF;
  IF v_journal_count = 1 THEN
    NEW.journal_entry_id := v_journal_id;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.persist_invoice_reference_journal_link_before_insert()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS trg_invoice_journal_entry ON public.invoices;
CREATE TRIGGER trg_invoice_journal_entry
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.trg_invoice_journal_entry_fn();
-- Trigger names of the same timing/event execute alphabetically. This runs
-- after trg_invoice_journal_entry and also links an unambiguous journal that
-- existed before a retried invoice insert.
DROP TRIGGER IF EXISTS zz_persist_invoice_reference_journal_link ON public.invoices;
CREATE TRIGGER zz_persist_invoice_reference_journal_link
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.persist_invoice_reference_journal_link_before_insert();
-- Repair only unambiguous historical links. Journals are matched by both
-- company and canonical reference, and invoices with duplicate journals are
-- deliberately left untouched for manual review.
DO $$
DECLARE
  v_previous_bypass text := COALESCE(
    current_setting('app.financial_controls_bypass', true),
    ''
  );
BEGIN
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  WITH unique_links AS (
    SELECT
      invoice.id AS invoice_id,
      invoice.company_id,
      (array_agg(entry.id ORDER BY entry.id))[1] AS journal_entry_id
    FROM public.invoices invoice
    JOIN public.journal_entries entry
      ON entry.company_id = invoice.company_id
     AND entry.reference_type = 'invoice'
     AND entry.reference_id = invoice.id
    WHERE invoice.journal_entry_id IS NULL
    GROUP BY invoice.id, invoice.company_id
    HAVING count(*) = 1
  )
  UPDATE public.invoices invoice
  SET journal_entry_id = unique_link.journal_entry_id,
      updated_at = now()
  FROM unique_links unique_link
  WHERE invoice.id = unique_link.invoice_id
    AND invoice.company_id = unique_link.company_id
    AND invoice.journal_entry_id IS NULL;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
COMMENT ON TRIGGER trg_invoice_journal_entry ON public.invoices IS
  'Creates the invoice journal before insert so journal_entry_id is persisted atomically on the invoice row.';
COMMENT ON TRIGGER zz_persist_invoice_reference_journal_link ON public.invoices IS
  'Persists one existing company-scoped invoice reference journal after the canonical journal trigger runs.';
COMMIT;
