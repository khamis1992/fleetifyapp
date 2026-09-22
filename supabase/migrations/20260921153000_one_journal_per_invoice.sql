-- One balanced journal per invoice, enforced forever:
--  * cancels the duplicate/reversal invoice-family journals (the historical
--    duplicate pairs net zero; cancelling both sides keeps reports unchanged
--    while removing thousands of clutter rows);
--  * keeps exactly one live journal per invoice — the earliest 'invoice' one —
--    posting it when its accounting date has already arrived;
--  * adds a partial unique index so a second live journal per invoice can
--    never be inserted again (across the invoice/duplicate reference types).
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $dedup$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date;
  v_cancelled_dup integer := 0;
  v_cancelled_rev integer := 0;
  v_reversed_to_cancel integer := 0;
  v_posted_due integer := 0;
  v_invoices integer := 0;
  r record;
  v_keep uuid;
BEGIN
  SET LOCAL app.financial_controls_bypass = 'on';
  -- The per-row balance recalc trigger makes a multi-thousand-row retirement
  -- unusably slow; disable it for the batch and refresh once at the end.
  ALTER TABLE public.journal_entries DISABLE TRIGGER trg_recalc_balances_on_journal_status;

  -- 1. Cancel every invoice-family journal except the single live canonical
  --    (earliest 'invoice' type, else earliest of any invoice-family type).
  FOR r IN
    SELECT e.reference_id
    FROM public.journal_entries e
    WHERE e.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND e.reference_type IN ('invoice', 'invoice_duplicate')
      AND e.status <> 'cancelled'
    GROUP BY e.reference_id
    HAVING count(*) > 1 OR bool_or(e.reference_type = 'invoice_duplicate')
  LOOP
    v_invoices := v_invoices + 1;
    SELECT e.id INTO v_keep
    FROM public.journal_entries e
    WHERE e.reference_id = r.reference_id
      AND e.reference_type IN ('invoice', 'invoice_duplicate')
      AND e.status <> 'cancelled'
    ORDER BY (e.reference_type = 'invoice') DESC, e.entry_date, e.created_at, e.id
    LIMIT 1;

    WITH dropped AS (
      UPDATE public.journal_entries
      SET status = 'cancelled', updated_at = now(),
        workflow_notes = CASE
          WHEN COALESCE(btrim(workflow_notes), '') = ''
            THEN 'DUPLICATE_INVOICE_JOURNAL_CANCELLED by migration 20260921153000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
          ELSE workflow_notes || E'\n' || 'DUPLICATE_INVOICE_JOURNAL_CANCELLED by migration 20260921153000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
        END
      WHERE reference_id = r.reference_id
        AND reference_type IN ('invoice', 'invoice_duplicate')
        AND status <> 'cancelled'
        AND id <> v_keep
      RETURNING 1
    )
    SELECT count(*) INTO v_cancelled_dup FROM dropped;

    -- Post the kept journal when its date has arrived (scheduled drafts).
    UPDATE public.journal_entries
    SET status = 'posted', posted_at = COALESCE(posted_at, now()), updated_at = now()
    WHERE id = v_keep AND status IN ('draft', 'under_review', 'approved')
      AND entry_date <= v_today;
    IF FOUND THEN v_posted_due := v_posted_due + 1; END IF;
  END LOOP;

  -- 2. Cancel the invoice_duplicate_reversal family entirely (both posted and
  --    draft copies): their originals are the duplicates cancelled above or
  --    'reversed' rows that follow them into cancellation next.
  WITH dropped AS (
    UPDATE public.journal_entries
    SET status = 'cancelled', updated_at = now(),
      workflow_notes = CASE
        WHEN COALESCE(btrim(workflow_notes), '') = ''
          THEN 'DUPLICATE_INVOICE_JOURNAL_CANCELLED by migration 20260921153000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
        ELSE workflow_notes || E'\n' || 'DUPLICATE_INVOICE_JOURNAL_CANCELLED by migration 20260921153000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
      END
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND reference_type = 'invoice_duplicate_reversal'
      AND status <> 'cancelled'
    RETURNING 1
  )
  SELECT count(*) INTO v_cancelled_rev FROM dropped;

  -- 3. 'reversed' originals whose reversal was just cancelled: retire them too.
  WITH dropped AS (
    UPDATE public.journal_entries o
    SET status = 'cancelled', updated_at = now(),
      workflow_notes = CASE
        WHEN COALESCE(btrim(o.workflow_notes), '') = ''
          THEN 'DUPLICATE_INVOICE_JOURNAL_CANCELLED by migration 20260921153000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
        ELSE o.workflow_notes || E'\n' || 'DUPLICATE_INVOICE_JOURNAL_CANCELLED by migration 20260921153000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
      END
    FROM public.journal_entries rv
    WHERE rv.id = o.reversal_entry_id
      AND o.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND o.status = 'reversed'
      AND rv.reference_type = 'invoice_duplicate_reversal'
      AND rv.status = 'cancelled'
      AND o.workflow_notes NOT LIKE '%DUPLICATE_INVOICE_JOURNAL_CANCELLED%'
    RETURNING 1
  )
  SELECT count(*) INTO v_reversed_to_cancel FROM dropped;

  SET LOCAL app.financial_controls_bypass = '';
  ALTER TABLE public.journal_entries ENABLE TRIGGER trg_recalc_balances_on_journal_status;

  -- One consolidated refresh of the cached balances for touched accounts.
  PERFORM public.recalculate_account_current_balance(a.account_id)
  FROM (
    SELECT DISTINCT l.account_id
    FROM public.journal_entry_lines l
    JOIN public.journal_entries e ON e.id = l.journal_entry_id
    WHERE e.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND e.workflow_notes LIKE '%DUPLICATE_INVOICE_JOURNAL_CANCELLED%'
  ) a;

  INSERT INTO public.audit_logs (action, company_id, entity_name, resource_type, severity, notes, metadata)
  VALUES (
    'invoice_duplicate_journals_cancelled',
    '24bc0b21-4e2d-4413-9842-31719a3669f4',
    'journal_entries',
    'journal_entry',
    'warning',
    'Duplicate invoice-family journals cancelled; one live journal per invoice kept and due drafts posted (migration 20260921153000).',
    jsonb_build_object('invoicesTouched', v_invoices, 'duplicatesCancelled', v_cancelled_dup,
      'reversalsCancelled', v_cancelled_rev, 'reversedOriginalsRetired', v_reversed_to_cancel,
      'dueCanonicalPosted', v_posted_due, 'at', now())
  );

  RAISE NOTICE 'dedup: invoices=% dupCancelled=% revCancelled=% reversedRetired=% duePosted=%',
    v_invoices, v_cancelled_dup, v_cancelled_rev, v_reversed_to_cancel, v_posted_due;
END
$dedup$;

-- 4. Root-cause guard: at most ONE live journal per invoice across the
--    invoice-family reference types.
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_live_invoice_journal_per_invoice
  ON public.journal_entries(company_id, reference_id)
  WHERE reference_type IN ('invoice', 'invoice_duplicate') AND status <> 'cancelled';

NOTIFY pgrst,'reload schema';
COMMIT;
