-- Fix payment inserts failing because NEW was parsed as a SQL relation inside VALUES.

CREATE OR REPLACE FUNCTION public.sync_contract_last_payment_date_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_contract_id uuid;
  v_old_company_id uuid;
  v_new_contract_id uuid;
  v_new_company_id uuid;
  v_contract_id uuid;
  v_company_id uuid;
  v_last_date date;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_company_id := OLD.company_id;
    v_old_contract_id := OLD.contract_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new_company_id := NEW.company_id;
    v_new_contract_id := NEW.contract_id;
  END IF;

  FOR v_company_id, v_contract_id IN
    SELECT pair.company_id, pair.contract_id
    FROM (
      VALUES
        (v_old_company_id, v_old_contract_id),
        (v_new_company_id, v_new_contract_id)
    ) AS pair(company_id, contract_id)
    WHERE pair.company_id IS NOT NULL
      AND pair.contract_id IS NOT NULL
    GROUP BY pair.company_id, pair.contract_id
  LOOP
    SELECT max(payment.payment_date)
    INTO v_last_date
    FROM public.payments payment
    WHERE payment.company_id = v_company_id
      AND payment.contract_id = v_contract_id
      AND lower(COALESCE(payment.payment_status, '')) = 'completed'
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt';

    UPDATE public.contracts contract
    SET last_payment_date = v_last_date,
        updated_at = now()
    WHERE contract.id = v_contract_id
      AND contract.company_id = v_company_id
      AND contract.last_payment_date IS DISTINCT FROM v_last_date;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.sync_contract_last_payment_date_from_payment() IS
  'Synchronizes contract last_payment_date without referencing trigger records inside SQL VALUES expressions.';
