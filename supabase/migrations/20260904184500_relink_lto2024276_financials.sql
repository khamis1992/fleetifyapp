-- Relink LTO2024276 migrated receipts and generate the missing monthly
-- invoice graph. Does not attach the 1,250 PYINV3 payment-migration invoices
-- (wrong amount, already journalled) and does not rewrite those journals.

BEGIN;

CREATE TABLE IF NOT EXISTS public._backup_lto2024276_payment_relink_20260904 (
  payment_id uuid PRIMARY KEY,
  old_contract_id uuid,
  new_contract_id uuid NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public._backup_lto2024276_contract_amount_20260904 (
  contract_id uuid PRIMARY KEY,
  old_contract_amount numeric,
  new_contract_amount numeric,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract public.contracts%ROWTYPE;
  v_wrong_contract_id uuid;
  v_invoice_count integer := 0;
  v_invoice_month date;
  v_invoice_id uuid;
  v_fifo jsonb;
  v_canonical_amount numeric := 54000;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  SELECT contract.*
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.company_id = v_company_id
    AND contract.contract_number = 'LTO2024276'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE NOTICE 'LTO2024276 not found; skipping financial relink';
    RETURN;
  END IF;

  SELECT contract.id
  INTO v_wrong_contract_id
  FROM public.contracts contract
  WHERE contract.company_id = v_company_id
    AND contract.contract_number = 'MR2024302';

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);

  INSERT INTO public._backup_lto2024276_payment_relink_20260904 (
    payment_id,
    old_contract_id,
    new_contract_id
  )
  SELECT
    payment.id,
    payment.contract_id,
    v_contract.id
  FROM public.payments payment
  WHERE payment.company_id = v_company_id
    AND payment.notes ILIKE '%LTO2024276%'
    AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
    AND payment.contract_id IS DISTINCT FROM v_contract.id
    AND (
      v_wrong_contract_id IS NULL
      OR payment.contract_id = v_wrong_contract_id
      OR payment.contract_id IS NULL
    )
  ON CONFLICT (payment_id) DO NOTHING;

  UPDATE public.payments payment
  SET
    contract_id = v_contract.id,
    updated_at = now()
  WHERE payment.id IN (
    SELECT backup.payment_id
    FROM public._backup_lto2024276_payment_relink_20260904 backup
  )
    AND payment.contract_id IS DISTINCT FROM v_contract.id;

  UPDATE public.contract_payment_schedules schedule
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE schedule.contract_id = v_contract.id
    AND schedule.due_date > v_contract.end_date
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'deleted', 'inactive'
    );

  IF abs(COALESCE(v_contract.contract_amount, 0) - v_canonical_amount) > 0.01 THEN
    INSERT INTO public._backup_lto2024276_contract_amount_20260904 (
      contract_id,
      old_contract_amount,
      new_contract_amount
    ) VALUES (
      v_contract.id,
      v_contract.contract_amount,
      v_canonical_amount
    )
    ON CONFLICT (contract_id) DO NOTHING;

    ALTER TABLE public.contracts DISABLE TRIGGER USER;

    UPDATE public.contracts contract
    SET
      contract_amount = v_canonical_amount,
      balance_due = GREATEST(v_canonical_amount - COALESCE(contract.total_paid, 0), 0),
      updated_at = now()
    WHERE contract.id = v_contract.id;

    ALTER TABLE public.contracts ENABLE TRIGGER USER;
  END IF;

  -- Bulk schedule RPC rejects a 37-month amount against a 36-month window.
  -- Generate each in-window month through the canonical single-month command.
  FOR v_invoice_month IN
    SELECT generate_series('2024-09-01'::date, '2027-08-01'::date, '1 month')::date
  LOOP
    v_invoice_id := public.generate_invoice_for_contract_month(v_contract.id, v_invoice_month);
    IF v_invoice_id IS NOT NULL THEN
      v_invoice_count := v_invoice_count + 1;
    END IF;
  END LOOP;

  v_fifo := public.allocate_contract_receipts_fifo(
    v_company_id,
    v_contract.id,
    false,
    50
  );

  PERFORM public.recalculate_contract_financial_state(v_contract.id);
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  RAISE NOTICE 'LTO2024276 repair invoices_created=% fifo=%', v_invoice_count, v_fifo;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    ALTER TABLE public.contracts ENABLE TRIGGER USER;
    RAISE;
END;
$$;

COMMIT;
