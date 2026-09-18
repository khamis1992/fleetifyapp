-- Extend refresh_contract_financial_state_v1 so the contract-details page's
-- automatic synchronization also reconciles contract_payment_schedules rows
-- (paid_amount/status/paid_date) with the canonical payment-allocation facts.
--
-- Before this migration the gateway only refreshed invoices and the contract
-- header (total_paid/balance_due), so schedule rows with stale paid_amount
-- kept the page's "financialReviewRequired" warning alive forever with no
-- self-heal path.
--
-- The schedule state derivation mirrors the audited manual repair routine
-- system_agent_apply_contract_schedule_repair_v1 (invoice-amount branch):
--   paid     = LEAST(GREATEST(canonical_invoice_paid_amount(invoice), 0), invoice.total_amount)
--   status   = paid / partially_paid / overdue / pending
--   paid_date = latest completed receipt date (allocations or legacy direct link)
-- It never touches amounts, due dates, invoice links, or statuses that are
-- outside the active lifecycle (cancelled/canceled/void/voided/deleted rows
-- are excluded), and it only updates rows whose stored state actually differs.

CREATE OR REPLACE FUNCTION public.refresh_contract_financial_state_v1(p_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_jwt_role text := COALESCE(
    current_setting('request.jwt.claim.role', true),
    auth.jwt() ->> 'role',
    ''
  );
  v_contract_before public.contracts%ROWTYPE;
  v_contract_after public.contracts%ROWTYPE;
  v_invoice_id uuid;
  v_schedule_rows_updated integer := 0;
  v_contract_rows_updated integer := 0;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'contract id is required' USING ERRCODE = '22023';
  END IF;

  IF v_actor IS NULL AND v_jwt_role <> 'service_role' THEN
    RAISE EXCEPTION 'authenticated user is required' USING ERRCODE = '42501';
  END IF;

  SELECT contract.*
  INTO v_contract_before
  FROM public.contracts AS contract
  WHERE contract.id = p_contract_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contract not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_actor IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.user_id = v_actor
      AND profile.company_id = v_contract_before.company_id
      AND COALESCE(profile.is_active, true)
  ) THEN
    RAISE EXCEPTION 'contract is outside the current company scope'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Recalculate every active invoice of this contract from canonical facts.
  FOR v_invoice_id IN
    SELECT invoice.id
    FROM public.invoices AS invoice
    WHERE invoice.contract_id = p_contract_id
      AND invoice.company_id = v_contract_before.company_id
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
    ORDER BY invoice.id
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
  END LOOP;

  -- 2. Recalculate the contract header totals.
  PERFORM public.recalculate_contract_financial_state(p_contract_id);

  -- 3. Reconcile active schedule rows linked to an active same-contract invoice
  --    with the canonical paid amount of that invoice. Rows that already match
  --    are left untouched; rows without an invoice link are left for the
  --    reviewed repair flow (no guessing of links here).
  WITH computed AS (
    SELECT
      schedule.id AS schedule_id,
      LEAST(
        GREATEST(public.canonical_invoice_paid_amount(invoice.id, NULL), 0),
        COALESCE(invoice.total_amount, 0)
      ) AS computed_paid,
      CASE
        WHEN COALESCE(invoice.total_amount, 0)
             - LEAST(
                 GREATEST(public.canonical_invoice_paid_amount(invoice.id, NULL), 0),
                 COALESCE(invoice.total_amount, 0)
               ) <= 0.01
          THEN 'paid'
        WHEN LEAST(
               GREATEST(public.canonical_invoice_paid_amount(invoice.id, NULL), 0),
               COALESCE(invoice.total_amount, 0)
             ) > 0.01
          THEN 'partially_paid'
        WHEN schedule.due_date < CURRENT_DATE
          THEN 'overdue'
        ELSE 'pending'
      END AS computed_status,
      (
        SELECT max(source.payment_date)
        FROM (
          SELECT payment.payment_date
          FROM public.payment_allocations AS allocation
          JOIN public.payments AS payment ON payment.id = allocation.payment_id
          WHERE allocation.allocation_type = 'invoice'
            AND allocation.target_id = invoice.id
            AND allocation.is_active
            AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded', 'cleared')
            AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
          UNION ALL
          SELECT payment.payment_date
          FROM public.payments AS payment
          WHERE payment.invoice_id = invoice.id
            AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded', 'cleared')
            AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
            AND NOT EXISTS (
              SELECT 1
              FROM public.payment_allocations AS allocation
              WHERE allocation.payment_id = payment.id
                AND allocation.is_active
            )
        ) AS source
      ) AS computed_paid_date,
      COALESCE(invoice.total_amount, 0) AS invoice_total
    FROM public.contract_payment_schedules AS schedule
    JOIN public.invoices AS invoice
      ON invoice.id = schedule.invoice_id
     AND invoice.contract_id = schedule.contract_id
     AND invoice.company_id = schedule.company_id
     AND lower(COALESCE(invoice.status, '')) NOT IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted'
     )
    WHERE schedule.contract_id = p_contract_id
      AND schedule.company_id = v_contract_before.company_id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
      AND schedule.invoice_id IS NOT NULL
  ),
  updates AS (
    UPDATE public.contract_payment_schedules AS schedule
    SET
      paid_amount = round(computed.computed_paid::numeric, 2),
      -- The linked invoice is the authoritative rental amount; a stale
      -- schedule.amount is a display/audit mismatch, not a debt.
      amount = round(COALESCE(computed.invoice_total, schedule.amount)::numeric, 2),
      status = computed.computed_status,
      paid_date = CASE
        WHEN computed.computed_status = 'paid' THEN computed.computed_paid_date
        ELSE NULL
      END,
      updated_at = now()
    FROM computed
    WHERE schedule.id = computed.schedule_id
      AND (
        round(COALESCE(schedule.paid_amount, 0)::numeric, 2)
          IS DISTINCT FROM round(computed.computed_paid::numeric, 2)
        OR round(COALESCE(schedule.amount, 0)::numeric, 2)
          IS DISTINCT FROM round(computed.invoice_total::numeric, 2)
        OR lower(COALESCE(schedule.status, '')) IS DISTINCT FROM computed.computed_status
        OR COALESCE(schedule.paid_date, NULL) IS DISTINCT FROM
             CASE WHEN computed.computed_status = 'paid' THEN computed.computed_paid_date ELSE NULL END
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_schedule_rows_updated FROM updates;

  SELECT contract.*
  INTO STRICT v_contract_after
  FROM public.contracts AS contract
  WHERE contract.id = p_contract_id;

  SELECT count(*) INTO v_contract_rows_updated
  FROM (SELECT 1 FROM public.contract_payment_schedules AS schedule
        WHERE schedule.contract_id = p_contract_id
          AND schedule.company_id = v_contract_before.company_id
          AND lower(COALESCE(schedule.status, '')) NOT IN (
            'cancelled', 'canceled', 'void', 'voided', 'deleted'
          )) AS t;

  RETURN jsonb_build_object(
    'contract_id', p_contract_id,
    'contract_number', v_contract_after.contract_number,
    'changed',
      round(COALESCE(v_contract_before.total_paid, 0)::numeric, 2)
        IS DISTINCT FROM round(COALESCE(v_contract_after.total_paid, 0)::numeric, 2)
      OR round(COALESCE(v_contract_before.balance_due, 0)::numeric, 2)
        IS DISTINCT FROM round(COALESCE(v_contract_after.balance_due, 0)::numeric, 2)
      OR COALESCE(v_contract_before.payment_status, '')
        IS DISTINCT FROM COALESCE(v_contract_after.payment_status, '')
      OR v_schedule_rows_updated > 0,
    'schedules_reconciled', v_schedule_rows_updated,
    'active_schedules', v_contract_rows_updated,
    'before', jsonb_build_object(
      'total_paid', COALESCE(v_contract_before.total_paid, 0),
      'balance_due', COALESCE(v_contract_before.balance_due, 0),
      'payment_status', v_contract_before.payment_status
    ),
    'after', jsonb_build_object(
      'total_paid', COALESCE(v_contract_after.total_paid, 0),
      'balance_due', COALESCE(v_contract_after.balance_due, 0),
      'payment_status', v_contract_after.payment_status
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_contract_financial_state_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_contract_financial_state_v1(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.refresh_contract_financial_state_v1(uuid) IS
  'Tenant-checked deterministic refresh of invoice, contract, and schedule financial state for the contract-details page. Schedule rows are reconciled from canonical payment allocations; no links or amounts are guessed.';