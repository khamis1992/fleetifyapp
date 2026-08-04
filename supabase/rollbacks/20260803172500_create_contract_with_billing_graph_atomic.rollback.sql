BEGIN;

DROP FUNCTION IF EXISTS public.create_contract_with_billing_graph_atomic(
  uuid, uuid, uuid, text, date, date, numeric, numeric, text, text, uuid, uuid, uuid, date, boolean, text, text
);
DROP FUNCTION IF EXISTS public.create_customer_with_contract_idempotent(
  uuid, text, text, numeric, text
);
DROP FUNCTION IF EXISTS public.activate_contract_with_billing_graph_atomic(uuid);
DROP FUNCTION IF EXISTS public.renew_contract_with_billing_graph_atomic(uuid, date, numeric, text);

DROP TRIGGER IF EXISTS trg_require_atomic_contract_billing_graph
  ON public.contracts;
DROP FUNCTION IF EXISTS public.require_atomic_contract_billing_graph();

-- Restore the trigger definition that was active before this migration.
CREATE OR REPLACE FUNCTION public.trigger_calculate_contract_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration_days integer;
  v_duration_months decimal(10,2);
BEGIN
  IF TG_OP = 'INSERT' OR
     (TG_OP = 'UPDATE' AND (
       NEW.monthly_amount IS DISTINCT FROM OLD.monthly_amount OR
       NEW.start_date IS DISTINCT FROM OLD.start_date OR
       NEW.end_date IS DISTINCT FROM OLD.end_date
     )) THEN
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
      v_duration_days := NEW.end_date - NEW.start_date;
      v_duration_months := round(v_duration_days::decimal / 30, 2);
      IF v_duration_months < 1 THEN
        v_duration_months := 1;
      END IF;
      IF NEW.monthly_amount IS NOT NULL AND NEW.monthly_amount > 0 THEN
        NEW.contract_amount := NEW.monthly_amount * v_duration_months;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_calculate_contract_amount() IS
  'Auto-trigger to calculate contract amount on insert/update. Uses IS DISTINCT FROM for proper NULL handling.';

CREATE OR REPLACE FUNCTION public.create_customer_with_contract(
  p_company_id uuid,
  p_first_name text,
  p_last_name text,
  p_monthly_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_contract_id uuid;
  v_customer_code text;
  v_contract_number text;
  v_start_date date := CURRENT_DATE;
  v_end_date date := (CURRENT_DATE + interval '1 year' - interval '1 day')::date;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(p_company_id);
  IF NULLIF(btrim(COALESCE(p_first_name, '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(p_last_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Customer first and last names are required' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(p_monthly_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Monthly amount must be greater than zero' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':quick-customer-contract', 0));
  v_customer_code := 'CUST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  v_contract_number := 'CNT-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS')
    || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.customers (
    company_id, customer_code, first_name, last_name, customer_type, phone, is_active
  ) VALUES (
    p_company_id, v_customer_code, btrim(p_first_name), btrim(p_last_name),
    'individual', '000000000', true
  ) RETURNING id INTO v_customer_id;
  INSERT INTO public.contracts (
    customer_id, company_id, contract_number, contract_date, start_date, end_date,
    contract_type, contract_amount, monthly_amount, status
  ) VALUES (
    v_customer_id, p_company_id, v_contract_number, v_start_date, v_start_date, v_end_date,
    'vehicle_rental', round(p_monthly_amount * 12, 2), round(p_monthly_amount, 2), 'active'
  ) RETURNING id INTO v_contract_id;
  RETURN json_build_object(
    'success', true,
    'customer_id', v_customer_id,
    'contract_id', v_contract_id,
    'customer_code', v_customer_code,
    'contract_number', v_contract_number
  );
END;
$$;

DROP INDEX IF EXISTS public.uq_contracts_company_creation_idempotency;
ALTER TABLE public.contracts DROP COLUMN IF EXISTS creation_idempotency_key;

COMMIT;
