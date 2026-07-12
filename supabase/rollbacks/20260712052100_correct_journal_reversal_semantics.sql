-- Roll back journal reversal status normalization.
-- Run only after stopping financial writes for the affected company/companies.

LOCK TABLE public.journal_entries IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.journal_entry_lines IN SHARE MODE;

DROP TRIGGER IF EXISTS a_enforce_posted_journal_reversal_semantics ON public.journal_entries;
DROP FUNCTION IF EXISTS public.enforce_posted_journal_reversal_semantics();
DROP FUNCTION IF EXISTS public.journal_entries_are_exact_reversals(uuid, uuid);

UPDATE public.journal_entries entry
SET
  status = COALESCE(snapshot.before_value ->> 'status', 'reversed'),
  reversal_entry_id = NULLIF(snapshot.before_value ->> 'reversal_entry_id', '')::uuid,
  reversed_at = NULLIF(snapshot.before_value ->> 'reversed_at', '')::timestamptz,
  reversed_by = NULLIF(snapshot.before_value ->> 'reversed_by', '')::uuid,
  updated_at = COALESCE(NULLIF(snapshot.before_value ->> 'updated_at', '')::timestamptz, now())
FROM public.financial_data_repair_snapshots snapshot
WHERE snapshot.migration_version = '20260712052100'
  AND snapshot.entity_type = 'journal_entry'
  AND snapshot.entity_id = entry.id
  AND snapshot.rolled_back_at IS NULL
  AND lower(COALESCE(entry.status::text, '')) = 'posted'
  AND entry.reversal_entry_id = NULLIF(snapshot.before_value ->> 'reversal_entry_id', '')::uuid;

UPDATE public.financial_data_repair_snapshots
SET rolled_back_at = now()
WHERE migration_version = '20260712052100'
  AND entity_type = 'journal_entry'
  AND rolled_back_at IS NULL;

DROP TRIGGER IF EXISTS trg_recalc_balances_on_journal_status ON public.journal_entries;
DROP FUNCTION IF EXISTS public.recalc_balances_after_journal_status_change();

CREATE OR REPLACE FUNCTION public.recalc_account_balance_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_account_id := OLD.account_id;
  ELSE
    v_account_id := NEW.account_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.account_id IS DISTINCT FROM NEW.account_id THEN
    UPDATE public.chart_of_accounts account
    SET
      current_balance = CASE
        WHEN lower(account.balance_type) = 'debit' THEN COALESCE((
          SELECT SUM(COALESCE(line.debit_amount, 0)) - SUM(COALESCE(line.credit_amount, 0))
          FROM public.journal_entry_lines line
          JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
          WHERE line.account_id = OLD.account_id
            AND lower(COALESCE(entry.status::text, '')) = 'posted'
        ), 0)
        ELSE COALESCE((
          SELECT SUM(COALESCE(line.credit_amount, 0)) - SUM(COALESCE(line.debit_amount, 0))
          FROM public.journal_entry_lines line
          JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
          WHERE line.account_id = OLD.account_id
            AND lower(COALESCE(entry.status::text, '')) = 'posted'
        ), 0)
      END,
      updated_at = now()
    WHERE account.id = OLD.account_id;
  END IF;

  IF v_account_id IS NOT NULL THEN
    UPDATE public.chart_of_accounts account
    SET
      current_balance = CASE
        WHEN lower(account.balance_type) = 'debit' THEN COALESCE((
          SELECT SUM(COALESCE(line.debit_amount, 0)) - SUM(COALESCE(line.credit_amount, 0))
          FROM public.journal_entry_lines line
          JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
          WHERE line.account_id = v_account_id
            AND lower(COALESCE(entry.status::text, '')) = 'posted'
        ), 0)
        ELSE COALESCE((
          SELECT SUM(COALESCE(line.credit_amount, 0)) - SUM(COALESCE(line.debit_amount, 0))
          FROM public.journal_entry_lines line
          JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
          WHERE line.account_id = v_account_id
            AND lower(COALESCE(entry.status::text, '')) = 'posted'
        ), 0)
      END,
      updated_at = now()
    WHERE account.id = v_account_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_account_balance ON public.journal_entry_lines;
CREATE TRIGGER trg_recalc_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_account_balance_trigger_fn();

DROP FUNCTION IF EXISTS public.recalculate_account_current_balance(uuid);

DROP FUNCTION IF EXISTS public.update_account_balances_from_entries();

CREATE OR REPLACE FUNCTION public.update_account_balances_from_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_record record;
  calculated_balance numeric;
BEGIN
  FOR account_record IN
    SELECT account.id, account.balance_type
    FROM public.chart_of_accounts account
    WHERE account.is_active = true
  LOOP
    IF account_record.balance_type = 'debit' THEN
      SELECT COALESCE(SUM(line.debit_amount - line.credit_amount), 0)
      INTO calculated_balance
      FROM public.journal_entry_lines line
      JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
      WHERE line.account_id = account_record.id
        AND entry.status = 'posted';
    ELSE
      SELECT COALESCE(SUM(line.credit_amount - line.debit_amount), 0)
      INTO calculated_balance
      FROM public.journal_entry_lines line
      JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
      WHERE line.account_id = account_record.id
        AND entry.status = 'posted';
    END IF;

    UPDATE public.chart_of_accounts account
    SET current_balance = calculated_balance, updated_at = now()
    WHERE account.id = account_record.id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.update_account_balances_from_entries()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_account_balances_from_entries()
  TO authenticated, service_role;

UPDATE public.chart_of_accounts account
SET
  current_balance = CASE
    WHEN lower(account.balance_type) = 'debit' THEN COALESCE((
      SELECT SUM(COALESCE(line.debit_amount, 0)) - SUM(COALESCE(line.credit_amount, 0))
      FROM public.journal_entry_lines line
      JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
      WHERE line.account_id = account.id
        AND lower(COALESCE(entry.status::text, '')) = 'posted'
    ), 0)
    ELSE COALESCE((
      SELECT SUM(COALESCE(line.credit_amount, 0)) - SUM(COALESCE(line.debit_amount, 0))
      FROM public.journal_entry_lines line
      JOIN public.journal_entries entry ON entry.id = line.journal_entry_id
      WHERE line.account_id = account.id
        AND lower(COALESCE(entry.status::text, '')) = 'posted'
    ), 0)
  END,
  updated_at = now()
WHERE COALESCE(account.is_header, false) = false;
