-- Enforce one accounting journal entry per financial source document.
-- This complements the centralized RPC paths and prevents client or trigger
-- regressions from creating duplicate journals for the same business record.

DO $$
DECLARE
  v_duplicate_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_duplicate_count
  FROM (
    SELECT company_id, reference_type, reference_id
    FROM public.journal_entries
    WHERE reference_type IN ('payment', 'invoice', 'contract')
      AND reference_id IS NOT NULL
    GROUP BY company_id, reference_type, reference_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION
      'Cannot create unique journal reference index: % duplicate financial references exist. Run SELECT public.cleanup_all_duplicate_financial_journal_references(500, 50, NULL), confirm remaining_duplicate_groups = 0, then rerun this migration.',
      v_duplicate_count;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_unique_financial_reference
ON public.journal_entries(company_id, reference_type, reference_id)
WHERE reference_type IN ('payment', 'invoice', 'contract')
  AND reference_id IS NOT NULL;
