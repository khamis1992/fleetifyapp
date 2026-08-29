BEGIN;

CREATE TABLE IF NOT EXISTS public._backup_contract_amount_20260803 (
  contract_id uuid PRIMARY KEY,
  contract_number text,
  old_contract_amount numeric,
  old_total_paid numeric,
  old_balance_due numeric,
  old_payment_status text,
  new_contract_amount numeric,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_target record;
  v_contract public.contracts%ROWTYPE;
  v_fixed integer := 0;
BEGIN
  -- The atomic-graph guard (20260803172500) blocks financial-terms changes on
  -- billable contracts unless this audited repair session flag is set.
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);

  FOR v_target IN
    SELECT *
    FROM (VALUES
      ('AGR-202504-399591', 40500.00,   54000.00),
      ('AGR-202504-405141', 40900.00,   55700.00),
      ('AGR-202504-424958', 54950.00,   60650.00),
      ('C-ALF-0033',        20400.00,   59500.00),
      ('CNT-25-0466',       31186.50,   33150.00),
      ('LTO2024248',        84000.00,   63000.00),
      ('LTO2024261',        82250.00,   63000.00),
      ('LTO2024263',        84600.00,   66600.00),
      ('LTO2024341',        56050.00,   56050.00),
      ('LTO20247',          63000.00,   66600.00)
    ) AS t(contract_number, expected_old_amount, new_amount)
  LOOP
    SELECT *
    INTO v_contract
    FROM public.contracts contract
    WHERE contract.company_id = v_company_id
      AND contract.contract_number = v_target.contract_number
      AND contract.status IN ('active', 'under_legal_procedure')
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Expected active contract % was not found', v_target.contract_number;
    END IF;

    -- Guard: never rewrite a contract whose amount drifted from the verified
    -- snapshot. A drifted row means newer data needs a fresh analysis.
    IF abs(COALESCE(v_contract.contract_amount, 0) - v_target.expected_old_amount) > 0.01 THEN
      RAISE EXCEPTION 'Contract % amount drifted from the verified snapshot (% != %); aborting for review',
        v_target.contract_number, v_contract.contract_amount, v_target.expected_old_amount;
    END IF;

    -- LTO2024341 is already correct; record and skip without rewriting.
    IF abs(COALESCE(v_contract.contract_amount, 0) - v_target.new_amount) <= 0.01 THEN
      INSERT INTO public._backup_contract_amount_20260803 (
        contract_id, contract_number, old_contract_amount, old_total_paid,
        old_balance_due, old_payment_status, new_contract_amount
      ) VALUES (
        v_contract.id, v_contract.contract_number, v_contract.contract_amount,
        v_contract.total_paid, v_contract.balance_due, v_contract.payment_status,
        v_target.new_amount
      ) ON CONFLICT (contract_id) DO NOTHING;
      CONTINUE;
    END IF;

    INSERT INTO public._backup_contract_amount_20260803 (
      contract_id, contract_number, old_contract_amount, old_total_paid,
      old_balance_due, old_payment_status, new_contract_amount
    ) VALUES (
      v_contract.id, v_contract.contract_number, v_contract.contract_amount,
      v_contract.total_paid, v_contract.balance_due, v_contract.payment_status,
      v_target.new_amount
    ) ON CONFLICT (contract_id) DO NOTHING;

    UPDATE public.contracts contract
    SET contract_amount = v_target.new_amount,
        updated_at = now()
    WHERE contract.id = v_contract.id;

    -- Recompute principal-capped totals against the corrected amount.
    PERFORM public.recalculate_contract_financial_state(v_contract.id);
    v_fixed := v_fixed + 1;
  END LOOP;

  RAISE NOTICE 'contract_amount graph repair completed for % contracts', v_fixed;
END;
$$;

COMMENT ON TABLE public._backup_contract_amount_20260803 IS
  'Before-images for the 2026-08-03 contract_amount graph repair; used by the matching rollback.';

COMMIT;;
