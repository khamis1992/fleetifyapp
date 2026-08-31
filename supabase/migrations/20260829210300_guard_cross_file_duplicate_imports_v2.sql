-- ================================================================
-- Migration: Broaden cross-file duplicate guard to legacy import formats
-- Created: 2026-08-29
-- Description: The v1 guard only compared new 'xls:%' references against
--   existing 'xls:%' payments. The 126 real duplicates pair legacy
--   imports: 'PAY-XLS-*' (numeric reference_number) vs 'PBC-*'
--   (PBCFULL-<n> reference). This update makes the guard compare new
--   Excel allocations against ALL imported-payment shapes.
-- (Mirror of applied migration guard_cross_file_duplicate_imports_v2)
-- ================================================================

CREATE OR REPLACE FUNCTION public.assert_no_cross_file_duplicate_allocations(
  p_company_id uuid,
  p_allocations jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_allocation record;
  v_contract_id uuid;
  v_invoice_id uuid;
  v_payment_date date;
  v_amount numeric;
  v_reference text;
  v_conflict record;
BEGIN
  IF p_company_id IS NULL OR jsonb_typeof(COALESCE(p_allocations, 'null'::jsonb)) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_allocation IN
    SELECT item.value, item.ordinality
    FROM jsonb_array_elements(p_allocations) WITH ORDINALITY AS item(value, ordinality)
    ORDER BY item.ordinality
  LOOP
    v_reference := NULLIF(BTRIM(COALESCE(v_allocation.value ->> 'reference_number', '')), '');

    IF v_reference IS NULL OR v_reference NOT LIKE 'xls:%' THEN
      CONTINUE;
    END IF;

    v_contract_id := NULLIF(v_allocation.value ->> 'contract_id', '')::uuid;
    v_invoice_id := NULLIF(v_allocation.value ->> 'invoice_id', '')::uuid;
    v_payment_date := NULLIF(v_allocation.value ->> 'payment_date', '')::date;
    v_amount := NULLIF(v_allocation.value ->> 'amount', '')::numeric;

    IF v_contract_id IS NULL OR v_payment_date IS NULL OR v_amount IS NULL THEN
      CONTINUE;
    END IF;

    SELECT
      p.id,
      p.payment_number,
      p.reference_number,
      p.payment_date
    INTO v_conflict
    FROM public.payments p
    WHERE p.company_id = p_company_id
      AND p.contract_id = v_contract_id
      AND p.payment_status = 'completed'
      AND p.amount = v_amount
      AND ABS(p.payment_date - v_payment_date) <= 1
      AND (
        (p.payment_number LIKE 'PAY-XLS-%' AND p.reference_number ~ '^\d+$')
        OR (p.payment_number LIKE 'PBC-%' AND p.reference_number LIKE 'PBCFULL-%')
        OR p.reference_number LIKE 'xls:%'
      )
      AND COALESCE(p.reference_number, '') <> v_reference
    LIMIT 1;

    IF v_conflict IS NOT NULL THEN
      RAISE EXCEPTION
        'Cross-file duplicate import blocked: a completed payment (% QAR on %, ref %) already exists as payment % (ref %) for the same contract. The same source row was imported from another file; remove the duplicate row before approving.',
        v_amount, v_payment_date, v_reference, v_conflict.payment_number, v_conflict.reference_number
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assert_no_cross_file_duplicate_allocations(uuid, jsonb)
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_no_cross_file_duplicate_allocations(uuid, jsonb)
  TO service_role;