-- Relink note-mentioned receipts and generate missing monthly invoices
-- for billable contracts that have schedules but zero invoices.
-- Does not attach PYINV3 invoices (those already journaled as customer advances).
-- Mentioned contract number regex: ترحيل من الاتفاقية القديمة: ([A-Z0-9-]+)

CREATE TABLE IF NOT EXISTS public._backup_disconnected_payment_relink_20260904 (
  payment_id uuid PRIMARY KEY,
  old_contract_id uuid,
  new_contract_id uuid,
  mentioned_contract_number text,
  amount numeric,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.repair_disconnected_contract_financials_v1(
  p_company_id uuid,
  p_dry_run boolean DEFAULT true,
  p_contract_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_relinked integer := 0;
  v_invoices integer := 0;
  v_contracts integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
  v_previous_atomic text := COALESCE(current_setting('fleetify.atomic_contract_creation', true), '');
  v_pay RECORD;
  v_mentioned text;
  v_target uuid;
  v_old uuid;
  v_contract RECORD;
  v_month date;
  v_end_month date;
  v_first_due date;
  v_expected_months integer;
  v_current_months integer;
  v_invoice_id uuid;
  v_recalc_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);

  FOR v_pay IN
    SELECT
      p.id,
      p.contract_id,
      p.amount,
      substring(
        p.notes
        FROM 'ترحيل من الاتفاقية القديمة:\s*([A-Z0-9-]+)'
      ) AS mentioned_number
    FROM public.payments p
    WHERE p.company_id = p_company_id
      AND p.payment_status = 'completed'
      AND p.invoice_id IS NULL
      AND p.notes ~ 'ترحيل من الاتفاقية القديمة:\s*[A-Z0-9-]+'
  LOOP
    v_mentioned := v_pay.mentioned_number;
    CONTINUE WHEN v_mentioned IS NULL;

    SELECT c.id
      INTO v_target
    FROM public.contracts c
    WHERE c.company_id = p_company_id
      AND c.contract_number = v_mentioned
    LIMIT 1;

    CONTINUE WHEN v_target IS NULL;
    CONTINUE WHEN v_target = v_pay.contract_id;

    v_old := v_pay.contract_id;
    v_relinked := v_relinked + 1;
    v_recalc_ids := v_recalc_ids || v_target;
    IF v_old IS NOT NULL THEN
      v_recalc_ids := v_recalc_ids || v_old;
    END IF;

    IF NOT p_dry_run THEN
      INSERT INTO public._backup_disconnected_payment_relink_20260904 (
        payment_id,
        old_contract_id,
        new_contract_id,
        mentioned_contract_number,
        amount
      )
      VALUES (v_pay.id, v_old, v_target, v_mentioned, v_pay.amount)
      ON CONFLICT (payment_id) DO NOTHING;

      UPDATE public.payments
      SET contract_id = v_target,
          updated_at = now()
      WHERE id = v_pay.id
        AND company_id = p_company_id;
    END IF;
  END LOOP;

  FOR v_contract IN
    SELECT
      c.id,
      c.contract_number,
      c.start_date,
      c.end_date,
      c.monthly_amount,
      c.contract_amount
    FROM public.contracts c
    WHERE c.company_id = p_company_id
      AND c.status IN ('active', 'under_legal_procedure')
      AND COALESCE(c.monthly_amount, 0) > 0
      AND (p_contract_id IS NULL OR c.id = p_contract_id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.company_id = p_company_id
          AND i.contract_id = c.id
          AND i.status <> 'cancelled'
      )
  LOOP
    BEGIN
      SELECT MIN(ps.due_date)
        INTO v_first_due
      FROM public.contract_payment_schedules ps
      WHERE ps.company_id = p_company_id
        AND ps.contract_id = v_contract.id
        AND ps.status <> 'cancelled'
        AND (v_contract.end_date IS NULL OR ps.due_date <= v_contract.end_date);

      CONTINUE WHEN v_first_due IS NULL OR v_contract.end_date IS NULL;

      v_end_month := date_trunc('month', v_contract.end_date)::date;
      SELECT COUNT(*)::integer
        INTO v_expected_months
      FROM generate_series(
        date_trunc('month', v_first_due)::date,
        v_end_month,
        interval '1 month'
      );

      CONTINUE WHEN v_expected_months IS NULL OR v_expected_months < 1;

      v_current_months := CEIL(
        COALESCE(v_contract.contract_amount, 0) / NULLIF(v_contract.monthly_amount, 0)
      )::integer;

      IF NOT p_dry_run THEN
        UPDATE public.contract_payment_schedules
        SET status = 'cancelled',
            notes = COALESCE(notes || E'\n', '')
              || 'Cancelled extra schedule after contract end',
            updated_at = now()
        WHERE company_id = p_company_id
          AND contract_id = v_contract.id
          AND status = 'unpaid'
          AND invoice_id IS NULL
          AND due_date > v_contract.end_date;

        IF v_current_months > v_expected_months THEN
          EXECUTE 'ALTER TABLE public.contracts DISABLE TRIGGER USER';
          UPDATE public.contracts
          SET contract_amount = ROUND(v_contract.monthly_amount * v_expected_months, 3),
              updated_at = now()
          WHERE id = v_contract.id
            AND company_id = p_company_id;
          EXECUTE 'ALTER TABLE public.contracts ENABLE TRIGGER USER';
        END IF;

        FOR v_month IN
          SELECT generate_series(
            date_trunc('month', v_first_due)::date,
            v_end_month,
            interval '1 month'
          )::date
        LOOP
          v_invoice_id := public.generate_invoice_for_contract_month(v_contract.id, v_month);
          IF v_invoice_id IS NOT NULL THEN
            v_invoices := v_invoices + 1;
          END IF;
        END LOOP;

        PERFORM public.allocate_contract_receipts_fifo(
          p_company_id,
          v_contract.id,
          false,
          50
        );
        PERFORM public.recalculate_contract_financial_state(v_contract.id);
      ELSE
        v_invoices := v_invoices + v_expected_months;
      END IF;

      v_contracts := v_contracts + 1;
      v_recalc_ids := v_recalc_ids || v_contract.id;
    EXCEPTION
      WHEN OTHERS THEN
        IF NOT p_dry_run THEN
          EXECUTE 'ALTER TABLE public.contracts ENABLE TRIGGER USER';
        END IF;
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object(
            'contract_id', v_contract.id,
            'contract_number', v_contract.contract_number,
            'error', SQLERRM
          )
        );
    END;
  END LOOP;

  IF NOT p_dry_run THEN
    PERFORM public.recalculate_contract_financial_state(cid)
    FROM (
      SELECT DISTINCT unnest(v_recalc_ids) AS cid
    ) x
    WHERE cid IS NOT NULL;
  END IF;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  PERFORM set_config('fleetify.atomic_contract_creation', v_previous_atomic, true);

  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'company_id', p_company_id,
    'payments_relinked', v_relinked,
    'contracts_invoiced', v_contracts,
    'invoices_generated', v_invoices,
    'errors', v_errors
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    PERFORM set_config('fleetify.atomic_contract_creation', v_previous_atomic, true);
    EXECUTE 'ALTER TABLE public.contracts ENABLE TRIGGER USER';
    RAISE;
END;
$$;
