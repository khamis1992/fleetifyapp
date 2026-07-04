-- Repair duplicate auto-fixed payment receipt lines created by a historical
-- maintenance script that sampled only the first 10k journal lines.
DO $$
DECLARE
  v_deleted_count integer := 0;
BEGIN
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  WITH target_entries AS (
    SELECT id, entry_number, total_debit, total_credit
    FROM public.journal_entries
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
      AND entry_number IN (
        'JE-PAY-REC-26-1023',
        'JE-PAY-REC-26-1024',
        'JE-PAY-REC-26-1025'
      )
      AND status = 'posted'
  ),
  line_totals AS (
    SELECT
      te.id,
      te.entry_number,
      te.total_debit,
      te.total_credit,
      COUNT(jel.id) AS line_count,
      COALESCE(SUM(jel.debit_amount), 0) AS line_debit,
      COALESCE(SUM(jel.credit_amount), 0) AS line_credit
    FROM target_entries te
    JOIN public.journal_entry_lines jel ON jel.journal_entry_id = te.id
    GROUP BY te.id, te.entry_number, te.total_debit, te.total_credit
  ),
  duplicate_ranked AS (
    SELECT
      jel.id,
      ROW_NUMBER() OVER (
        PARTITION BY
          jel.journal_entry_id,
          jel.line_number,
          jel.account_id,
          jel.debit_amount,
          jel.credit_amount,
          jel.line_description
        ORDER BY jel.created_at ASC, jel.id ASC
      ) AS duplicate_position
    FROM public.journal_entry_lines jel
    JOIN line_totals lt ON lt.id = jel.journal_entry_id
    WHERE lt.line_count = 4
      AND lt.line_debit = lt.total_debit * 2
      AND lt.line_credit = lt.total_credit * 2
      AND jel.line_description IN (
        'Payment receipt (auto-fixed) ' || lt.entry_number,
        'Cash receipt (auto-fixed) ' || lt.entry_number
      )
  ),
  deleted AS (
    DELETE FROM public.journal_entry_lines jel
    USING duplicate_ranked dr
    WHERE jel.id = dr.id
      AND dr.duplicate_position > 1
    RETURNING jel.id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  IF v_deleted_count NOT IN (0, 6) THEN
    RAISE EXCEPTION 'Expected to delete 0 or 6 duplicate journal lines, deleted %', v_deleted_count;
  END IF;

  PERFORM set_config('app.financial_controls_bypass', '', true);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.financial_controls_bypass', '', true);
  RAISE;
END $$;
