-- Keep contract.last_payment_date in the same transaction as payment state changes.

CREATE OR REPLACE FUNCTION public.sync_contract_last_payment_date_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
  v_company_id uuid;
  v_last_date date;
BEGIN
  FOR v_company_id,v_contract_id IN
    SELECT pair.company_id,pair.contract_id FROM (
      VALUES
        (CASE WHEN TG_OP IN('UPDATE','DELETE') THEN OLD.company_id END,CASE WHEN TG_OP IN('UPDATE','DELETE') THEN OLD.contract_id END),
        (CASE WHEN TG_OP IN('INSERT','UPDATE') THEN NEW.company_id END,CASE WHEN TG_OP IN('INSERT','UPDATE') THEN NEW.contract_id END)
    ) pair(company_id,contract_id)
    WHERE pair.company_id IS NOT NULL AND pair.contract_id IS NOT NULL
    GROUP BY pair.company_id,pair.contract_id
  LOOP
    SELECT max(payment.payment_date) INTO v_last_date
    FROM public.payments payment
    WHERE payment.company_id = v_company_id
      AND payment.contract_id = v_contract_id
      AND lower(COALESCE(payment.payment_status, '')) = 'completed'
      AND lower(COALESCE(payment.transaction_type, 'receipt')) = 'receipt';
    UPDATE public.contracts contract
    SET last_payment_date = v_last_date, updated_at = now()
    WHERE contract.id = v_contract_id AND contract.company_id = v_company_id
      AND contract.last_payment_date IS DISTINCT FROM v_last_date;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_contract_last_payment_date_trigger ON public.payments;
CREATE TRIGGER sync_contract_last_payment_date_trigger
AFTER INSERT OR UPDATE OF payment_status, payment_date, contract_id OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_contract_last_payment_date_from_payment();

REVOKE ALL ON FUNCTION public.sync_contract_last_payment_date_from_payment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_contract_last_payment_date_from_payment() TO service_role;
