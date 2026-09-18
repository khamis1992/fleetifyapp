-- Rollback: guard_cross_file_duplicate_imports_v2
-- Restores the v1 guard semantics (xls:% references only).

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

    SELECT p.id, p.payment_number
    INTO v_conflict
    FROM public.payments p
    WHERE p.company_id = p_company_id
      AND p.contract_id = v_contract_id
      AND p.payment_status = 'completed'
      AND p.amount = v_amount
      AND ABS(p.payment_date - v_payment_date) <= 1
      AND p.reference_number LIKE 'xls:%'
      AND p.reference_number <> v_reference
    LIMIT 1;

    IF v_conflict IS NOT NULL THEN
      RAISE EXCEPTION 'Cross-file duplicate import blocked' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
END;
$$;