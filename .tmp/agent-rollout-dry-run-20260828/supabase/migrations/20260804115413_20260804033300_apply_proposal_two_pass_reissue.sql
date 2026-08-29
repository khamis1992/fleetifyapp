BEGIN;

CREATE OR REPLACE FUNCTION public.apply_contract_terms_scan_proposal(
  p_proposal_id uuid,
  p_decision_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    ''
  );
  v_actor uuid := auth.uid();
  v_allowed boolean := v_role = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin');
  v_proposal public.contract_terms_scan_proposals%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_terms jsonb;
  v_monthly numeric;
  v_total numeric;
  v_start date;
  v_end date;
  v_schedule record;
  v_invoice record;
  v_first_schedule_id uuid;
  v_new_invoice_id uuid;
  v_schedules_updated integer := 0;
  v_schedules_kept_paid integer := 0;
  v_invoices_reissued integer := 0;
  v_invoices_credited integer := 0;
  v_credit_delta numeric := 0;
  v_cancelled_months jsonb := '[]'::jsonb;
  v_cancelled record;
  v_invoices_kept_paid integer := 0;
  v_schedules_cancelled_outside integer := 0;
  v_links_realigned integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_paid_review jsonb := '[]'::jsonb;
BEGIN
  IF NOT v_allowed THEN
    v_allowed := v_actor IS NOT NULL AND public.is_finance_action_authorized(
      v_actor,
      (SELECT proposal.company_id FROM public.contract_terms_scan_proposals proposal WHERE proposal.id = p_proposal_id),
      ARRAY['finance.contracts.write', 'contracts.write', 'operations.contracts.write'],
      ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant']
    );
  END IF;
  IF NOT COALESCE(v_allowed, false) THEN
    RAISE EXCEPTION 'Not authorized to apply contract term corrections' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_proposal
  FROM public.contract_terms_scan_proposals proposal
  WHERE proposal.id = p_proposal_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found' USING ERRCODE = 'P0001';
  END IF;
  IF v_proposal.status NOT IN ('pending', 'approved', 'applied') THEN
    RAISE EXCEPTION 'Proposal % is % and cannot be applied', p_proposal_id, v_proposal.status
      USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_array_length(COALESCE(v_proposal.proposed_changes, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Proposal contains no changes to apply' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_proposal.contract_id
    AND contract.company_id = v_proposal.company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract is outside the proposal company' USING ERRCODE = 'P0001';
  END IF;

  v_terms := v_proposal.extracted_terms;
  v_monthly := NULLIF(v_terms ->> 'monthly_amount', '')::numeric;
  v_total := NULLIF(v_terms ->> 'total_amount', '')::numeric;
  v_start := NULLIF(v_terms ->> 'start_date', '')::date;
  v_end := NULLIF(v_terms ->> 'end_date', '')::date;

  IF COALESCE(v_total, 0) <= 0 THEN
    IF v_monthly IS NOT NULL AND v_start IS NOT NULL AND v_end IS NOT NULL THEN
      v_total := round(v_monthly * GREATEST(1, (
        (EXTRACT(YEAR FROM v_end) - EXTRACT(YEAR FROM v_start)) * 12
        + EXTRACT(MONTH FROM v_end) - EXTRACT(MONTH FROM v_start) + 1
      )::integer), 2);
    END IF;
  END IF;

  IF COALESCE(v_monthly, 0) <= 0 OR COALESCE(v_total, 0) <= 0
     OR v_start IS NULL OR v_end IS NULL OR v_end < v_start
  THEN
    RAISE EXCEPTION 'Proposal terms are incomplete; monthly, period, and total are required'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  -- Nested canonical commands (invoice cancel/regenerate) run as the internal service actor.
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  -- 1) Contract terms from the signed document.
  UPDATE public.contracts contract
  SET monthly_amount = v_monthly,
      contract_amount = v_total,
      start_date = v_start,
      end_date = v_end,
      updated_at = now()
  WHERE contract.id = v_contract.id;

  -- 2) Schedules outside the written period are cancelled when they carry no
  --    payment history; a bare invoice link is detached first.
  FOR v_schedule IN
    SELECT schedule.*
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract.id
      AND schedule.company_id = v_contract.company_id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND (schedule.due_date < v_start OR schedule.due_date > v_end)
  LOOP
    IF COALESCE(v_schedule.paid_amount, 0) > 0.01
       OR v_schedule.paid_date IS NOT NULL
    THEN
      v_paid_review := v_paid_review || jsonb_build_array(jsonb_build_object(
        'schedule_id', v_schedule.id,
        'due_date', v_schedule.due_date,
        'reason', 'outside_written_period_with_history'
      ));
      CONTINUE;
    END IF;
    -- A bare invoice link is not payment history: detach it so the written
    -- period can cancel the extra schedule safely.
    UPDATE public.contract_payment_schedules schedule
    SET status = 'cancelled', invoice_id = NULL, updated_at = now()
    WHERE schedule.id = v_schedule.id;
    v_schedules_cancelled_outside := v_schedules_cancelled_outside + 1;
  END LOOP;

  -- 3) Schedules inside the written period adopt the written amount. The
  --    amount is the written obligation; paid_amount is received history and
  --    is preserved even when it exceeds the corrected amount (the excess
  --    surfaces as an overpayment credit, never deleted).
  FOR v_schedule IN
    SELECT schedule.*
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract.id
      AND schedule.company_id = v_contract.company_id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND schedule.due_date >= v_start
      AND schedule.due_date <= v_end
    ORDER BY schedule.due_date, schedule.id
  LOOP
    IF COALESCE(v_schedule.paid_amount, 0) > 0.01 OR v_schedule.paid_date IS NOT NULL THEN
      v_schedules_kept_paid := v_schedules_kept_paid + 1;
    END IF;
    IF abs(COALESCE(v_schedule.amount, 0) - v_monthly) > 0.01 THEN
      UPDATE public.contract_payment_schedules schedule
      SET amount = v_monthly, updated_at = now()
      WHERE schedule.id = v_schedule.id;
      v_schedules_updated := v_schedules_updated + 1;
    END IF;
  END LOOP;

  -- 4a) Invoices without payment history are cancelled with journal reversal
  --     first; regeneration happens in a second pass because the canonical
  --     generator validates the complete contract graph on every call.
  --     Invoices with payment history receive a discount (credit) journal for
  --     the delta and are aligned to the written amount; the customer payment
  --     is never rewritten.
  FOR v_invoice IN
    SELECT invoice.*
    FROM public.invoices invoice
    WHERE invoice.contract_id = v_contract.id
      AND invoice.company_id = v_contract.company_id
      AND COALESCE(invoice.total_amount, 0) > 0.01
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    ORDER BY COALESCE(invoice.invoice_month, invoice.invoice_date), invoice.id
  LOOP
    IF abs(COALESCE(v_invoice.total_amount, 0) - v_monthly) <= 0.01 THEN
      CONTINUE;
    END IF;

    IF COALESCE(v_invoice.paid_amount, 0) > 0.01
       OR EXISTS (
         SELECT 1 FROM public.payments payment
         WHERE payment.invoice_id = v_invoice.id
       )
       OR EXISTS (
         SELECT 1 FROM public.payment_allocations allocation
         WHERE allocation.allocation_type = 'invoice'
           AND allocation.target_id = v_invoice.id
           AND allocation.is_active = true
       )
    THEN
      -- Payment history is never rewritten. The written-amount delta is posted
      -- as a discount (credit) journal and the invoice is aligned to the
      -- written amount; any excess the customer paid remains as an overpayment
      -- credit visible in the ledger.
      BEGIN
        v_credit_delta := round(COALESCE(v_invoice.total_amount, 0) - v_monthly, 2);
        IF v_credit_delta > 0.01 THEN
          PERFORM public.create_invoice_discount_journal_entry(
            v_invoice.id,
            v_credit_delta,
            'Signed-contract rent correction credit (proposal ' || p_proposal_id::text || ')'
          );
        END IF;
        UPDATE public.invoices invoice
        SET total_amount = v_monthly,
            subtotal = v_monthly,
            discount_amount = round(COALESCE(invoice.discount_amount, 0) + GREATEST(v_credit_delta, 0), 2),
            updated_at = now()
        WHERE invoice.id = v_invoice.id
          AND invoice.company_id = v_contract.company_id;
        PERFORM public.recalculate_invoice_financial_state(v_invoice.id);
        v_invoices_credited := v_invoices_credited + 1;
      EXCEPTION WHEN OTHERS THEN
        v_invoices_kept_paid := v_invoices_kept_paid + 1;
        v_paid_review := v_paid_review || jsonb_build_array(jsonb_build_object(
          'invoice_id', v_invoice.id,
          'invoice_number', v_invoice.invoice_number,
          'month', date_trunc('month', COALESCE(v_invoice.invoice_month, v_invoice.invoice_date))::date,
          'current_amount', v_invoice.total_amount,
          'written_amount', v_monthly,
          'reason', 'credit_correction_failed: ' || left(SQLERRM, 300)
        ));
      END;
      CONTINUE;
    END IF;

    BEGIN
      PERFORM public.cancel_invoice_with_reversal(
        v_invoice.id,
        v_contract.company_id,
        'Signed-contract terms correction: reissue at written amount '
          || v_monthly::text || ' (proposal ' || p_proposal_id::text || ')'
      );
      v_cancelled_months := v_cancelled_months || jsonb_build_array(jsonb_build_object(
        'month', date_trunc('month', COALESCE(v_invoice.invoice_month, v_invoice.invoice_date))::date,
        'old_invoice_id', v_invoice.id
      ));
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.invoice_number,
        'error', left(SQLERRM, 400)
      ));
    END;
  END LOOP;

  -- 4b) Regenerate the cancelled months only after every wrong payment-free
  --     invoice is gone: the canonical generator validates the whole graph on
  --     each call, so interleaving cancel+generate deadlocks the correction.
  FOR v_cancelled IN
    SELECT value ->> 'month' AS cancelled_month
    FROM jsonb_array_elements(v_cancelled_months)
  LOOP
    BEGIN
      v_new_invoice_id := public.generate_invoice_for_contract_month(
        v_contract.id,
        v_cancelled.cancelled_month::date
      );
      IF v_new_invoice_id IS NULL THEN
        RAISE EXCEPTION 'canonical generator returned no invoice for the corrected month';
      END IF;
      v_invoices_reissued := v_invoices_reissued + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'month', v_cancelled.cancelled_month,
        'error', left(SQLERRM, 400)
      ));
    END;
  END LOOP;

  -- 5) Realign schedule links to the same-month invoice (one-to-one by
  --    canonical month), fixing shifted links left by legacy tools.
  FOR v_schedule IN
    SELECT schedule.id, date_trunc('month', schedule.due_date)::date AS schedule_month
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract.id
      AND schedule.company_id = v_contract.company_id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
  LOOP
    UPDATE public.contract_payment_schedules schedule
    SET invoice_id = match.invoice_id,
        updated_at = now()
    FROM (
      SELECT invoice.id AS invoice_id
      FROM public.invoices invoice
      WHERE invoice.contract_id = v_contract.id
        AND invoice.company_id = v_contract.company_id
        AND COALESCE(invoice.total_amount, 0) > 0.01
        AND date_trunc(
          'month',
          COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp without time zone
        )::date = v_schedule.schedule_month
        AND lower(COALESCE(invoice.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
        AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
        )
      ORDER BY invoice.created_at, invoice.id
      LIMIT 1
    ) match
    WHERE schedule.id = v_schedule.id
      AND schedule.invoice_id IS DISTINCT FROM match.invoice_id;
    IF FOUND THEN
      v_links_realigned := v_links_realigned + 1;
    END IF;
  END LOOP;

  -- 6) Canonical totals against the corrected terms.
  PERFORM public.recalculate_contract_financial_state(v_contract.id);

  UPDATE public.contract_terms_scan_proposals proposal
  SET status = 'applied',
      decided_by = v_actor,
      decided_at = now(),
      decision_notes = NULLIF(BTRIM(COALESCE(p_decision_notes, '')), ''),
      updated_at = now()
  WHERE proposal.id = p_proposal_id;

  RETURN jsonb_build_object(
    'status', 'applied',
    'proposal_id', p_proposal_id,
    'contract_id', v_contract.id,
    'applied_terms', jsonb_build_object(
      'monthly_amount', v_monthly,
      'contract_amount', v_total,
      'start_date', v_start,
      'end_date', v_end
    ),
    'schedules_amount_updated', v_schedules_updated,
    'schedules_cancelled_outside_period', v_schedules_cancelled_outside,
    'schedules_kept_with_payment_history', v_schedules_kept_paid,
    'invoices_reissued_at_written_amount', v_invoices_reissued,
    'invoices_corrected_with_credit_journal', v_invoices_credited,
    'invoices_kept_with_payment_history', v_invoices_kept_paid,
    'schedule_links_realigned', v_links_realigned,
    'requires_credit_review', v_paid_review,
    'errors', v_errors
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_contract_terms_scan_proposal(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_contract_terms_scan_proposal(uuid, text)
  TO authenticated, service_role;

COMMIT;;
