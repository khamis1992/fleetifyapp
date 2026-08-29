-- Rollback: guard_cross_file_duplicate_imports

-- Restore create_customer_payment_batch_v1 without the cross-file guard.
CREATE OR REPLACE FUNCTION public.create_customer_payment_batch_v1(
  p_company_id uuid,
  p_customer_id uuid,
  p_payment_method text,
  p_bank_id uuid DEFAULT NULL,
  p_account_id uuid DEFAULT NULL,
  p_currency text DEFAULT 'QAR',
  p_allocations jsonb DEFAULT '[]'::jsonb,
  p_batch_idempotency_key text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_allocation record;
  v_invoice_id uuid;
  v_contract_id uuid;
  v_payment_date date;
  v_amount numeric;
  v_payment_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_count integer;
BEGIN
  IF p_company_id IS NULL OR p_customer_id IS NULL
     OR NULLIF(BTRIM(COALESCE(p_batch_idempotency_key, '')), '') IS NULL
     OR NULLIF(BTRIM(COALESCE(p_payment_method, '')), '') IS NULL
     OR jsonb_typeof(COALESCE(p_allocations, 'null'::jsonb)) <> 'array'
  THEN
    RAISE EXCEPTION 'Company, customer, payment method, batch key, and allocations are required'
      USING ERRCODE = 'P0001';
  END IF;

  v_count := jsonb_array_length(p_allocations);
  IF v_count < 1 OR v_count > 100 THEN
    RAISE EXCEPTION 'A customer payment batch must contain between 1 and 100 allocations'
      USING ERRCODE = 'P0001';
  END IF;
  IF lower(BTRIM(p_payment_method)) IN (
    'bank_transfer', 'check', 'cheque', 'credit_card', 'debit_card', 'card'
  ) AND p_bank_id IS NULL THEN
    RAISE EXCEPTION 'A bank account is required for non-cash payment batches'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_company_id::text || ':payment-batch:' || BTRIM(p_batch_idempotency_key), 0)
  );

  FOR v_allocation IN
    SELECT item.value, item.ordinality
    FROM jsonb_array_elements(p_allocations) WITH ORDINALITY AS item(value, ordinality)
    ORDER BY item.ordinality
  LOOP
    IF jsonb_typeof(v_allocation.value) <> 'object' THEN
      RAISE EXCEPTION 'Every payment allocation must be a JSON object' USING ERRCODE = 'P0001';
    END IF;

    v_invoice_id := NULLIF(v_allocation.value ->> 'invoice_id', '')::uuid;
    v_contract_id := NULLIF(v_allocation.value ->> 'contract_id', '')::uuid;
    v_payment_date := NULLIF(v_allocation.value ->> 'payment_date', '')::date;
    v_amount := NULLIF(v_allocation.value ->> 'amount', '')::numeric;
    IF v_invoice_id IS NULL OR v_payment_date IS NULL OR v_amount IS NULL
       OR v_amount <= 0 OR v_amount <> round(v_amount, 2)
    THEN
      RAISE EXCEPTION 'Each allocation requires an invoice, date, and positive two-decimal amount'
        USING ERRCODE = 'P0001';
    END IF;

    v_payment_id := public.create_payment_atomic(
      p_company_id => p_company_id,
      p_customer_id => p_customer_id,
      p_contract_id => v_contract_id,
      p_invoice_id => v_invoice_id,
      p_payment_number => NULL,
      p_payment_date => v_payment_date,
      p_amount => v_amount,
      p_payment_method => p_payment_method,
      p_payment_type => p_payment_method,
      p_transaction_type => 'receipt',
      p_reference_number => NULLIF(v_allocation.value ->> 'reference_number', ''),
      p_agreement_number => NULL,
      p_check_number => NULL,
      p_bank_id => p_bank_id,
      p_notes => NULLIF(v_allocation.value ->> 'notes', ''),
      p_created_by => p_actor_id,
      p_idempotency_key => 'payment-batch:' || md5(BTRIM(p_batch_idempotency_key))
        || ':' || v_allocation.ordinality::text || ':' || v_invoice_id::text,
      p_account_id => p_account_id,
      p_cost_center_id => NULL,
      p_currency => COALESCE(NULLIF(BTRIM(p_currency), ''), 'QAR'),
      p_initial_status => 'completed',
      p_registration_metadata => jsonb_build_object(
        'amount_paid', v_amount,
        'payment_month', to_char(v_payment_date, 'YYYY-MM'),
        'due_date', v_payment_date
      )
    );

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'payment_id', v_payment_id,
      'invoice_id', v_invoice_id,
      'contract_id', v_contract_id,
      'payment_date', v_payment_date,
      'amount', v_amount
    ));
  END LOOP;

  UPDATE public.contracts contract
  SET last_payment_date = latest.latest_date,
      updated_at = now()
  FROM (
    SELECT (item.value ->> 'contract_id')::uuid AS contract_id,
           max((item.value ->> 'payment_date')::date) AS latest_date
    FROM jsonb_array_elements(p_allocations) item(value)
    WHERE NULLIF(item.value ->> 'contract_id', '') IS NOT NULL
    GROUP BY (item.value ->> 'contract_id')::uuid
  ) latest
  WHERE contract.id = latest.contract_id
    AND contract.company_id = p_company_id
    AND contract.customer_id = p_customer_id;

  RETURN jsonb_build_object(
    'batch_idempotency_key', BTRIM(p_batch_idempotency_key),
    'payment_count', jsonb_array_length(v_results),
    'payments', v_results
  );
END;
$$;

DROP FUNCTION IF EXISTS public.assert_no_cross_file_duplicate_allocations(uuid, jsonb);