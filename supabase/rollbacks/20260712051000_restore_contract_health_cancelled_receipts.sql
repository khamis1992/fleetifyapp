-- Revert only if every payment still matches the exact post-repair snapshot.
-- This intentionally recreates the pre-repair cancelled state and is for emergency rollback only.

DO $$
DECLARE
  snapshot record;
  current_payment public.payments%ROWTYPE;
  reclassification public.journal_entries%ROWTYPE;
  reversal_id uuid;
  actor_id uuid;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  FOR snapshot IN
    SELECT *
    FROM public.financial_data_repair_snapshots
    WHERE migration_version = '20260712051000'
      AND entity_type = 'payment'
      AND rolled_back_at IS NULL
    ORDER BY applied_at DESC
  LOOP
    SELECT * INTO current_payment
    FROM public.payments
    WHERE id = snapshot.entity_id
    FOR UPDATE;

    IF current_payment.id IS NULL
       OR current_payment.payment_status IS DISTINCT FROM (snapshot.after_value ->> 'payment_status')
       OR current_payment.contract_id IS DISTINCT FROM (snapshot.after_value ->> 'contract_id')::uuid
       OR current_payment.invoice_id IS DISTINCT FROM (snapshot.after_value ->> 'invoice_id')::uuid
       OR current_payment.journal_entry_id IS DISTINCT FROM (snapshot.after_value ->> 'journal_entry_id')::uuid
    THEN
      RAISE EXCEPTION 'Payment % changed after repair; rollback refused', snapshot.entity_id;
    END IF;

    UPDATE public.payments
    SET
      contract_id = (snapshot.before_value ->> 'contract_id')::uuid,
      invoice_id = (snapshot.before_value ->> 'invoice_id')::uuid,
      payment_status = snapshot.before_value ->> 'payment_status',
      allocation_status = snapshot.before_value ->> 'allocation_status',
      processing_status = snapshot.before_value ->> 'processing_status',
      processing_notes = snapshot.before_value ->> 'processing_notes',
      updated_at = COALESCE((snapshot.before_value ->> 'updated_at')::timestamptz, now())
    WHERE id = snapshot.entity_id;

    IF NULLIF(snapshot.after_value ->> 'reclassification_journal_id', '') IS NOT NULL THEN
      SELECT * INTO reclassification
      FROM public.journal_entries
      WHERE id = (snapshot.after_value ->> 'reclassification_journal_id')::uuid
      FOR UPDATE;

      IF reclassification.id IS NOT NULL
         AND reclassification.reversal_entry_id IS NULL
         AND lower(COALESCE(reclassification.status, '')) = 'posted'
      THEN
        PERFORM public.assert_financial_period_is_open(reclassification.company_id, CURRENT_DATE);
        reversal_id := gen_random_uuid();
        actor_id := COALESCE(reclassification.created_by, reclassification.posted_by);

        INSERT INTO public.journal_entries (
          id, company_id, entry_number, entry_date, reference_type, reference_id,
          description, total_debit, total_credit, status, created_by,
          created_at, updated_at
        ) VALUES (
          reversal_id, reclassification.company_id,
          'REV-' || reclassification.entry_number,
          CURRENT_DATE, 'journal_reversal', reclassification.id,
          'Emergency rollback of payment reclassification',
          reclassification.total_credit, reclassification.total_debit,
          'draft', actor_id, now(), now()
        );

        INSERT INTO public.journal_entry_lines (
          journal_entry_id, account_id, line_number, line_description,
          debit_amount, credit_amount, cost_center_id, asset_id, employee_id
        )
        SELECT
          reversal_id, line.account_id,
          ROW_NUMBER() OVER (ORDER BY line.line_number, line.id),
          'Rollback reversal - ' || COALESCE(line.line_description, 'payment reclassification'),
          COALESCE(line.credit_amount, 0), COALESCE(line.debit_amount, 0),
          line.cost_center_id, line.asset_id, line.employee_id
        FROM public.journal_entry_lines line
        WHERE line.journal_entry_id = reclassification.id;

        UPDATE public.journal_entries
        SET status = 'posted', posted_by = actor_id, posted_at = now(), updated_at = now()
        WHERE id = reversal_id;

        UPDATE public.journal_entries
        SET status = 'reversed', reversal_entry_id = reversal_id,
            reversed_by = actor_id, reversed_at = now(), updated_at = now()
        WHERE id = reclassification.id;
      END IF;
    END IF;

    UPDATE public.financial_data_repair_snapshots
    SET rolled_back_at = now()
    WHERE id = snapshot.id;
  END LOOP;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
