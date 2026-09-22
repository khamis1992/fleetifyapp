-- Stop future-dated posting: system flows schedule future invoices/payments as
-- DRAFT journal entries, a table guard blocks posting entries dated after today
-- unless the explicit app.allow_future_posting exception is set, and the cached
-- chart current_balance stops counting future-dated posted lines.
-- The one-time backfill converts the ~1,877 existing future posted entries back
-- to drafts (with an audit marker), removing the receivables/revenue distortion.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1. Explicit exception predicate (same trust model as financial_controls_bypass).
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.future_posting_exception_enabled()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $fn$
  SELECT COALESCE(current_setting('app.allow_future_posting', true), '') = 'on'
      OR COALESCE(current_setting('app.financial_controls_bypass', true), '') = 'on'
$fn$;
REVOKE ALL ON FUNCTION public.future_posting_exception_enabled() FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Guard: no posting entries dated in the future. Rows already posted/reversed
--    keep their existing transitions (immutability rules govern those), so
--    reversing an old future-dated entry stays possible.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.prevent_future_dated_posting_fn()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
  IF NEW.entry_date IS NOT NULL AND NEW.entry_date > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date
    AND COALESCE(NEW.status, '') = 'posted'
    AND NOT (TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') IN ('posted', 'reversed'))
    AND NOT public.future_posting_exception_enabled() THEN
    RAISE EXCEPTION 'Journal entries cannot be posted with a future entry date; keep the draft scheduled until its date or set the explicit app.allow_future_posting exception'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.prevent_future_dated_posting_fn() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER journal_entries_prevent_future_posting
  BEFORE INSERT OR UPDATE OF status, entry_date ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_future_dated_posting_fn();

-- ---------------------------------------------------------------------------
-- 3. Invoice trigger: future-dated invoices post nothing — their journal stays a
--    scheduled draft until the date arrives (or an explicit exception is used).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_invoice_journal_entry_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry_number text;
  v_journal_id uuid;
  v_ar_account_id uuid;
  v_revenue_account_id uuid;
  v_tax_account_id uuid;
BEGIN
  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_journal_id
  FROM public.journal_entries
  WHERE company_id = NEW.company_id
    AND reference_type = 'invoice'
    AND reference_id = NEW.id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_journal_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT am.chart_of_accounts_id INTO v_ar_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
  WHERE am.company_id = NEW.company_id
    AND dat.type_code = 'RECEIVABLES'
    AND am.is_active = true
  LIMIT 1;

  SELECT am.chart_of_accounts_id INTO v_revenue_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
  WHERE am.company_id = NEW.company_id
    AND dat.type_code IN ('RENTAL_REVENUE', 'SALES_REVENUE', 'REVENUE')
    AND am.is_active = true
  ORDER BY
    CASE dat.type_code
      WHEN 'RENTAL_REVENUE' THEN 1
      WHEN 'SALES_REVENUE' THEN 2
      WHEN 'REVENUE' THEN 3
      ELSE 4
    END
  LIMIT 1;

  IF v_ar_account_id IS NULL OR v_revenue_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_entry_number := 'INV-' || to_char(COALESCE(NEW.invoice_date, CURRENT_DATE), 'YYYYMMDD') || '-' || substring(NEW.id::text, 1, 8);

  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description,
    total_debit, total_credit, status, reference_type, reference_id, created_by
  )
  VALUES (
    NEW.company_id, v_entry_number,
    COALESCE(NEW.invoice_date, CURRENT_DATE),
    'Invoice: ' || COALESCE(NEW.invoice_number, NEW.id::text),
    NEW.total_amount, NEW.total_amount, 'draft', 'invoice', NEW.id, NEW.created_by
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
  VALUES
    (v_journal_id, v_ar_account_id, 1, 'Customer receivable', NEW.total_amount, 0),
    (v_journal_id, v_revenue_account_id, 2, 'Service revenue', 0, COALESCE(NEW.subtotal, NEW.total_amount - COALESCE(NEW.tax_amount, 0)));

  IF COALESCE(NEW.tax_amount, 0) > 0 THEN
    SELECT am.chart_of_accounts_id INTO v_tax_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = NEW.company_id
      AND dat.type_code IN ('TAX_PAYABLE', 'VAT_PAYABLE', 'TAX')
      AND am.is_active = true
    LIMIT 1;

    IF v_tax_account_id IS NOT NULL THEN
      INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
      VALUES (v_journal_id, v_tax_account_id, 3, 'Collected tax', 0, NEW.tax_amount);
    END IF;
  END IF;

  -- Post immediately only when the accounting date has arrived; future invoices
  -- stay scheduled drafts (see post_due_journal_drafts_v1 for the catch-up path).
  IF COALESCE(NEW.invoice_date, CURRENT_DATE) <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN
    UPDATE public.journal_entries
    SET status = 'posted', posted_by = NEW.created_by, posted_at = now(), updated_at = now()
    WHERE id = v_journal_id;
  END IF;

  NEW.journal_entry_id := v_journal_id;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Payment trigger: same rule — a payment dated in the future schedules a draft.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_payment_journal_entry_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry_number text;
  v_journal_id uuid;
  v_cash_account_id uuid;
  v_receivable_account_id uuid;
  v_revenue_account_id uuid;
BEGIN
  IF NEW.payment_status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_journal_id
  FROM public.journal_entries
  WHERE company_id = NEW.company_id
    AND reference_type = 'payment'
    AND reference_id = NEW.id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_journal_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT am.chart_of_accounts_id INTO v_cash_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
  WHERE am.company_id = NEW.company_id
    AND dat.type_code IN ('CASH', 'BANK', 'PETTY_CASH')
    AND am.is_active = true
  ORDER BY dat.type_code
  LIMIT 1;

  SELECT am.chart_of_accounts_id INTO v_receivable_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
  WHERE am.company_id = NEW.company_id
    AND dat.type_code = 'RECEIVABLES'
    AND am.is_active = true
  LIMIT 1;

  SELECT am.chart_of_accounts_id INTO v_revenue_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
  WHERE am.company_id = NEW.company_id
    AND dat.type_code IN ('RENTAL_REVENUE', 'SALES_REVENUE', 'REVENUE')
    AND am.is_active = true
  ORDER BY
    CASE dat.type_code
      WHEN 'RENTAL_REVENUE' THEN 1
      WHEN 'SALES_REVENUE' THEN 2
      WHEN 'REVENUE' THEN 3
      ELSE 4
    END
  LIMIT 1;

  IF v_cash_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.invoice_id IS NOT NULL AND v_receivable_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.invoice_id IS NULL AND v_revenue_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_entry_number := 'PAY-' || to_char(COALESCE(NEW.payment_date, CURRENT_DATE), 'YYYYMMDD') || '-' || substring(NEW.id::text, 1, 8);

  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description,
    total_debit, total_credit, status, reference_type, reference_id, created_by
  )
  VALUES (
    NEW.company_id, v_entry_number,
    COALESCE(NEW.payment_date, CURRENT_DATE),
    'Payment receipt: ' || COALESCE(NEW.payment_number, NEW.reference_number, NEW.id::text),
    NEW.amount, NEW.amount, 'draft', 'payment', NEW.id, NEW.created_by
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
  VALUES
    (v_journal_id, v_cash_account_id, 1, 'Payment received', NEW.amount, 0),
    (v_journal_id,
     CASE WHEN NEW.invoice_id IS NOT NULL THEN v_receivable_account_id ELSE v_revenue_account_id END,
     2,
     CASE WHEN NEW.invoice_id IS NOT NULL THEN 'Receivables settlement' ELSE 'Direct revenue' END,
     0, NEW.amount);

  IF COALESCE(NEW.payment_date, CURRENT_DATE) <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date THEN
    UPDATE public.journal_entries
    SET status = 'posted', posted_by = NEW.created_by, posted_at = now(), updated_at = now()
    WHERE id = v_journal_id;
  END IF;

  NEW.journal_entry_id := v_journal_id;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Cached current_balance is "as of today": future-dated posted lines no
--    longer inflate the chart-of-accounts cache.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_account_current_balance(p_account_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric := 0;
BEGIN
  UPDATE public.chart_of_accounts account
  SET
    current_balance = CASE
      WHEN lower(account.balance_type) = 'debit' THEN COALESCE((
        SELECT SUM(COALESCE(line.debit_amount, 0)) - SUM(COALESCE(line.credit_amount, 0))
        FROM public.journal_entry_lines line
        JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
        WHERE line.account_id = account.id
          AND lower(COALESCE(entry.status::text, '')) = 'posted'
          AND entry.entry_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date
      ), 0)
      ELSE COALESCE((
        SELECT SUM(COALESCE(line.credit_amount, 0)) - SUM(COALESCE(line.debit_amount, 0))
        FROM public.journal_entry_lines line
        JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
        WHERE line.account_id = account.id
          AND lower(COALESCE(entry.status::text, '')) = 'posted'
          AND entry.entry_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date
      ), 0)
    END,
    updated_at = now()
  WHERE account.id = p_account_id
  RETURNING current_balance INTO v_balance;

  RETURN COALESCE(v_balance, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_account_current_balance(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_account_current_balance(uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Scheduled-due catch-up: posts system invoice drafts whose accounting date
--    has arrived. Human drafts are never touched.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.post_due_journal_drafts_v1(
  p_company_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), p_actor_id);
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date;
  v_count integer := 0;
  v_amount numeric := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND v_actor IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF v_actor IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  WITH due AS (
    SELECT id FROM public.journal_entries
    WHERE (p_company_id IS NULL OR company_id = p_company_id)
      AND status = 'draft' AND reference_type = 'invoice'
      AND entry_date IS NOT NULL AND entry_date <= v_today
    ORDER BY entry_date, id
    LIMIT 500
  ), posted AS (
    UPDATE public.journal_entries e
    SET status = 'posted', posted_by = v_actor, posted_at = now(), updated_at = now()
    FROM due WHERE e.id = due.id
    RETURNING e.id, e.total_debit
  )
  SELECT count(*), COALESCE(sum(total_debit), 0) INTO v_count, v_amount FROM posted;

  RETURN jsonb_build_object('postedCount', v_count, 'postedAmount', v_amount, 'asOf', v_today);
END;
$fn$;
REVOKE ALL ON FUNCTION public.post_due_journal_drafts_v1(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_due_journal_drafts_v1(uuid, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.post_due_journal_drafts_v1(uuid, uuid) IS
  'Posts scheduled invoice journal drafts whose accounting date has arrived; future-dated posting remains blocked.';

-- ---------------------------------------------------------------------------
-- 7. One-time repair: convert future-dated posted entries to scheduled drafts.
--    Runs under the documented financial-controls bypass inside this transaction.
-- ---------------------------------------------------------------------------
SET LOCAL app.financial_controls_bypass = 'on';

DO $repair$
DECLARE
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date;
  v_count integer;
  v_max date;
  v_accounts integer;
  r record;
BEGIN
  WITH reverted AS (
    UPDATE public.journal_entries
    SET status = 'draft',
        posted_by = NULL,
        posted_at = NULL,
        updated_at = now(),
        workflow_notes = CASE
          WHEN COALESCE(btrim(workflow_notes), '') = ''
            THEN 'FUTURE_POSTING_REVERTED_TO_DRAFT by migration 20260921130000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
          ELSE workflow_notes || E'\n' || 'FUTURE_POSTING_REVERTED_TO_DRAFT by migration 20260921130000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
        END
    WHERE status = 'posted'
      AND entry_date > v_today
    RETURNING id, company_id, entry_date
  ), touched AS (
    SELECT DISTINCT l.account_id
    FROM reverted rv JOIN public.journal_entry_lines l ON l.journal_entry_id = rv.id
  )
  SELECT (SELECT count(*) FROM reverted), (SELECT max(entry_date) FROM reverted), (SELECT count(*) FROM touched)
  INTO v_count, v_max, v_accounts;

  INSERT INTO public.audit_logs (action, company_id, entity_name, resource_type, severity, notes, metadata)
  VALUES (
    'future_posted_entries_converted_to_draft',
    NULL,
    'journal_entries',
    'journal_entry',
    'warning',
    'Future-dated posted journal entries were converted to scheduled drafts by migration 20260921130000 to stop receivables/revenue distortion.',
    jsonb_build_object('revertedCount', v_count, 'maxEntryDate', v_max, 'touchedAccounts', v_accounts, 'revertedAt', now())
  );

  -- Refresh the cached balances for every touched account.
  FOR r IN
    SELECT DISTINCT l.account_id
    FROM public.journal_entries e
    JOIN public.journal_entry_lines l ON l.journal_entry_id = e.id
    WHERE e.workflow_notes LIKE '%FUTURE_POSTING_REVERTED_TO_DRAFT%'
      AND e.status = 'draft'
  LOOP
    PERFORM public.recalculate_account_current_balance(r.account_id);
  END LOOP;

  RAISE NOTICE 'future-posting repair: % entries reverted (max date %), % accounts refreshed', v_count, v_max, v_accounts;
END
$repair$;

SET LOCAL app.financial_controls_bypass = '';

NOTIFY pgrst,'reload schema';
COMMIT;
