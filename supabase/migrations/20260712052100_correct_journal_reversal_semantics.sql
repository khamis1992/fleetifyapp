-- Keep both sides of a reversal posted so the ledger nets to zero.
-- The reversal relationship is represented by reversal_entry_id/reversed_at,
-- not by excluding the original entry from posted-ledger queries.

LOCK TABLE public.journal_entries IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.journal_entry_lines IN SHARE MODE;

CREATE TEMP TABLE validated_journal_reversal_pairs ON COMMIT DROP AS
WITH candidates AS (
  SELECT
    original.id AS original_id,
    original.company_id,
    original.reversal_entry_id,
    original.status::text AS original_status,
    reversal.status::text AS reversal_status
  FROM public.journal_entries original
  JOIN public.journal_entries reversal
    ON reversal.id = original.reversal_entry_id
   AND reversal.company_id = original.company_id
  WHERE lower(COALESCE(original.status::text, '')) = 'reversed'
    AND lower(COALESCE(reversal.status::text, '')) = 'posted'
    AND round(COALESCE(original.total_debit, 0), 2) = round(COALESCE(reversal.total_credit, 0), 2)
    AND round(COALESCE(original.total_credit, 0), 2) = round(COALESCE(reversal.total_debit, 0), 2)
), candidate_entry_ids AS (
  SELECT original_id AS id FROM candidates
  UNION
  SELECT reversal_entry_id AS id FROM candidates
), line_rollup AS (
  SELECT
    line.journal_entry_id,
    line.account_id,
    line.cost_center_id,
    line.asset_id,
    line.employee_id,
    round(SUM(COALESCE(line.debit_amount, 0)), 2) AS debit_amount,
    round(SUM(COALESCE(line.credit_amount, 0)), 2) AS credit_amount
  FROM public.journal_entry_lines line
  JOIN candidate_entry_ids candidate ON candidate.id = line.journal_entry_id
  GROUP BY
    line.journal_entry_id,
    line.account_id,
    line.cost_center_id,
    line.asset_id,
    line.employee_id
), line_signatures AS (
  SELECT
    journal_entry_id,
    md5((jsonb_agg(
      jsonb_build_array(
        account_id::text,
        COALESCE(cost_center_id::text, ''),
        COALESCE(asset_id::text, ''),
        COALESCE(employee_id::text, ''),
        to_char(debit_amount, 'FM999999999999999990.00'),
        to_char(credit_amount, 'FM999999999999999990.00')
      )
      ORDER BY account_id, cost_center_id, asset_id, employee_id
    ))::text) AS normal_signature,
    md5((jsonb_agg(
      jsonb_build_array(
        account_id::text,
        COALESCE(cost_center_id::text, ''),
        COALESCE(asset_id::text, ''),
        COALESCE(employee_id::text, ''),
        to_char(credit_amount, 'FM999999999999999990.00'),
        to_char(debit_amount, 'FM999999999999999990.00')
      )
      ORDER BY account_id, cost_center_id, asset_id, employee_id
    ))::text) AS swapped_signature
  FROM line_rollup
  GROUP BY journal_entry_id
), physical_line_counts AS (
  SELECT line.journal_entry_id, COUNT(*)::integer AS line_count
  FROM public.journal_entry_lines line
  JOIN candidate_entry_ids candidate ON candidate.id = line.journal_entry_id
  GROUP BY line.journal_entry_id
)
SELECT
  candidate.original_id,
  candidate.company_id,
  candidate.reversal_entry_id,
  original_signature.normal_signature AS original_signature,
  reversal_signature.normal_signature AS reversal_signature
FROM candidates candidate
JOIN line_signatures original_signature
  ON original_signature.journal_entry_id = candidate.original_id
JOIN line_signatures reversal_signature
  ON reversal_signature.journal_entry_id = candidate.reversal_entry_id
JOIN physical_line_counts original_count
  ON original_count.journal_entry_id = candidate.original_id
 AND original_count.line_count >= 2
JOIN physical_line_counts reversal_count
  ON reversal_count.journal_entry_id = candidate.reversal_entry_id
 AND reversal_count.line_count >= 2
WHERE original_signature.normal_signature = reversal_signature.swapped_signature;

DO $$
DECLARE
  v_reversed_count integer;
  v_validated_count integer;
BEGIN
  SELECT COUNT(*)::integer
  INTO v_reversed_count
  FROM public.journal_entries
  WHERE lower(COALESCE(status::text, '')) = 'reversed';

  SELECT COUNT(*)::integer
  INTO v_validated_count
  FROM validated_journal_reversal_pairs;

  IF v_reversed_count <> v_validated_count THEN
    RAISE EXCEPTION
      'Journal reversal normalization aborted: % reversed entries found but only % exact reversal pairs validated',
      v_reversed_count,
      v_validated_count
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

INSERT INTO public.financial_data_repair_snapshots (
  migration_version,
  repair_key,
  company_id,
  entity_type,
  entity_id,
  before_value,
  after_value,
  metadata
)
SELECT
  '20260712052100',
  'normalize_exact_journal_reversal_pair',
  pair.company_id,
  'journal_entry',
  pair.original_id,
  jsonb_build_object(
    'status', original.status,
    'reversal_entry_id', original.reversal_entry_id,
    'reversed_at', original.reversed_at,
    'reversed_by', original.reversed_by,
    'updated_at', original.updated_at
  ),
  jsonb_build_object(
    'status', 'posted',
    'reversal_entry_id', original.reversal_entry_id,
    'reversed_at', original.reversed_at,
    'reversed_by', original.reversed_by
  ),
  jsonb_build_object(
    'validation', 'exact_opposite_lines_and_totals',
    'reversal_entry_id', pair.reversal_entry_id,
    'original_signature', pair.original_signature,
    'reversal_signature', pair.reversal_signature
  )
FROM validated_journal_reversal_pairs pair
JOIN public.journal_entries original ON original.id = pair.original_id
ON CONFLICT (migration_version, entity_type, entity_id) DO NOTHING;

UPDATE public.journal_entries original
SET
  status = 'posted',
  updated_at = now()
FROM validated_journal_reversal_pairs pair
WHERE original.id = pair.original_id
  AND original.company_id = pair.company_id
  AND lower(COALESCE(original.status::text, '')) = 'reversed'
  AND original.reversal_entry_id = pair.reversal_entry_id;

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
  WHERE account.id = p_account_id
  RETURNING current_balance INTO v_balance;

  RETURN COALESCE(v_balance, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_account_current_balance(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_account_current_balance(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.recalc_account_balance_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_account_current_balance(OLD.account_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.account_id IS DISTINCT FROM NEW.account_id THEN
    PERFORM public.recalculate_account_current_balance(OLD.account_id);
  END IF;

  PERFORM public.recalculate_account_current_balance(NEW.account_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_account_balance ON public.journal_entry_lines;
CREATE TRIGGER trg_recalc_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_account_balance_trigger_fn();

CREATE OR REPLACE FUNCTION public.recalc_balances_after_journal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  FOR v_account_id IN
    SELECT DISTINCT line.account_id
    FROM old_journal_rows old_row
    JOIN new_journal_rows new_row ON new_row.id = old_row.id
    JOIN public.journal_entry_lines line ON line.journal_entry_id = old_row.id
    WHERE old_row.status IS DISTINCT FROM new_row.status
  LOOP
    PERFORM public.recalculate_account_current_balance(v_account_id);
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_balances_on_journal_status ON public.journal_entries;
CREATE TRIGGER trg_recalc_balances_on_journal_status
  AFTER UPDATE ON public.journal_entries
  REFERENCING OLD TABLE AS old_journal_rows NEW TABLE AS new_journal_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.recalc_balances_after_journal_status_change();

CREATE OR REPLACE FUNCTION public.journal_entries_are_exact_reversals(
  p_original_entry_id uuid,
  p_reversal_entry_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH entry_pair AS (
    SELECT
      original.id AS original_id,
      reversal.id AS reversal_id
    FROM public.journal_entries original
    JOIN public.journal_entries reversal
      ON reversal.id = p_reversal_entry_id
     AND reversal.company_id = original.company_id
    WHERE original.id = p_original_entry_id
      AND lower(COALESCE(reversal.status::text, '')) = 'posted'
      AND round(COALESCE(original.total_debit, 0), 2) = round(COALESCE(reversal.total_credit, 0), 2)
      AND round(COALESCE(original.total_credit, 0), 2) = round(COALESCE(reversal.total_debit, 0), 2)
  ), line_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE line.journal_entry_id = p_original_entry_id) AS original_count,
      COUNT(*) FILTER (WHERE line.journal_entry_id = p_reversal_entry_id) AS reversal_count
    FROM public.journal_entry_lines line
    WHERE line.journal_entry_id IN (p_original_entry_id, p_reversal_entry_id)
  ), line_deltas AS (
    SELECT
      line.account_id,
      line.cost_center_id,
      line.asset_id,
      line.employee_id,
      SUM(CASE
        WHEN line.journal_entry_id = p_original_entry_id THEN COALESCE(line.debit_amount, 0)
        ELSE -COALESCE(line.credit_amount, 0)
      END) AS debit_delta,
      SUM(CASE
        WHEN line.journal_entry_id = p_original_entry_id THEN COALESCE(line.credit_amount, 0)
        ELSE -COALESCE(line.debit_amount, 0)
      END) AS credit_delta
    FROM public.journal_entry_lines line
    WHERE line.journal_entry_id IN (p_original_entry_id, p_reversal_entry_id)
    GROUP BY line.account_id, line.cost_center_id, line.asset_id, line.employee_id
  )
  SELECT
    EXISTS (SELECT 1 FROM entry_pair)
    AND COALESCE((SELECT original_count >= 2 AND reversal_count >= 2 FROM line_counts), false)
    AND NOT EXISTS (
      SELECT 1
      FROM line_deltas
      WHERE abs(debit_delta) >= 0.005
         OR abs(credit_delta) >= 0.005
    );
$$;

REVOKE ALL ON FUNCTION public.journal_entries_are_exact_reversals(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.journal_entries_are_exact_reversals(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_posted_journal_reversal_semantics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(NEW.status::text, '')) <> 'reversed' THEN
    RETURN NEW;
  END IF;

  IF NEW.reversal_entry_id IS NULL THEN
    RAISE EXCEPTION 'A journal cannot be marked reversed without an exact posted reversal entry. Use reverse_journal_entry().'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.journal_entries_are_exact_reversals(NEW.id, NEW.reversal_entry_id) THEN
    RAISE EXCEPTION 'The linked journal reversal must be posted and exactly offset every account and accounting dimension.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.financial_data_repair_snapshots (
    migration_version,
    repair_key,
    company_id,
    entity_type,
    entity_id,
    before_value,
    after_value,
    metadata
  ) VALUES (
    '20260712052100',
    'enforce_posted_journal_reversal_pair',
    NEW.company_id,
    'journal_entry',
    NEW.id,
    jsonb_build_object(
      'status', 'reversed',
      'reversal_entry_id', NEW.reversal_entry_id,
      'reversed_at', COALESCE(NEW.reversed_at, now()),
      'reversed_by', NEW.reversed_by,
      'updated_at', NEW.updated_at
    ),
    jsonb_build_object(
      'status', 'posted',
      'reversal_entry_id', NEW.reversal_entry_id,
      'reversed_at', COALESCE(NEW.reversed_at, now()),
      'reversed_by', NEW.reversed_by
    ),
    jsonb_build_object('normalized_on_write', true)
  )
  ON CONFLICT (migration_version, entity_type, entity_id) DO NOTHING;

  NEW.status := 'posted';
  NEW.reversed_at := COALESCE(NEW.reversed_at, now());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_posted_journal_reversal_semantics()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS a_enforce_posted_journal_reversal_semantics ON public.journal_entries;
CREATE TRIGGER a_enforce_posted_journal_reversal_semantics
  BEFORE INSERT OR UPDATE OF status, reversal_entry_id ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_posted_journal_reversal_semantics();

DROP FUNCTION IF EXISTS public.update_account_balances_from_entries();

CREATE OR REPLACE FUNCTION public.update_account_balances_from_entries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_company_id uuid;
  v_scope_all boolean := false;
  v_has_finance_role boolean := false;
  v_updated_count integer := 0;
BEGIN
  IF v_actor_role = 'service_role' OR session_user IN ('postgres', 'supabase_admin') THEN
    v_scope_all := true;
  ELSE
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
    END IF;

    SELECT
      COALESCE(bool_or(role.role::text = 'super_admin'), false),
      COALESCE(bool_or(role.role::text IN ('super_admin', 'admin', 'company_admin', 'manager', 'accountant')), false)
    INTO v_scope_all, v_has_finance_role
    FROM public.user_roles role
    WHERE role.user_id = v_actor;

    IF NOT v_has_finance_role THEN
      RAISE EXCEPTION 'Financial role required' USING ERRCODE = 'P0001';
    END IF;

    IF NOT v_scope_all THEN
      v_company_id := public.get_user_company_id();
      IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Company context is required' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

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
  WHERE COALESCE(account.is_header, false) = false
    AND (v_scope_all OR account.company_id = v_company_id);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'accounts_updated', v_updated_count,
    'company_id', CASE WHEN v_scope_all THEN NULL ELSE v_company_id END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_account_balances_from_entries()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_account_balances_from_entries()
  TO authenticated, service_role;

-- Rebuild every posting account once after the historical status normalization.
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

COMMENT ON FUNCTION public.enforce_posted_journal_reversal_semantics() IS
'Preserves double-entry reversal integrity by keeping the original and its exact reversal posted while retaining reversal audit metadata.';

COMMENT ON FUNCTION public.journal_entries_are_exact_reversals(uuid, uuid) IS
'Validates that two same-company journals have swapped totals and exactly opposite account, cost-center, asset, and employee dimensions.';

COMMENT ON FUNCTION public.update_account_balances_from_entries() IS
'Rebuilds posting-account balances from posted journal lines with tenant and finance-role authorization.';
