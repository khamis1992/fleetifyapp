-- Isolated fixture. Auth and the v1 accounting engine are explicit test doubles.
-- The v2 migration itself is executed unchanged by the test runner.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
$$ SELECT NULLIF(current_setting('fixture.uid', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS
$$ SELECT current_setting('fixture.role', true) $$;
CREATE FUNCTION public.is_finance_action_authorized(uuid, uuid, text[], text[])
RETURNS boolean LANGUAGE sql AS $$
  SELECT CASE current_setting('fixture.allowed', true)
    WHEN 'null' THEN NULL WHEN 'yes' THEN $2 = '22222222-2222-4222-8222-222222222222'::uuid ELSE false END
$$;
CREATE TABLE public.invoices(id uuid PRIMARY KEY, company_id uuid NOT NULL, balance numeric, status text);
CREATE TABLE public.payments(
  id uuid PRIMARY KEY, company_id uuid NOT NULL, invoice_id uuid, created_by uuid,
  amount numeric(15,2), late_fee_amount numeric(10,2), payment_date date, payment_method text,
  reference_number text, notes text, idempotency_key text UNIQUE, payment_status text
);
CREATE UNIQUE INDEX ON public.payments(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE TABLE public.late_fees(id uuid PRIMARY KEY, company_id uuid, invoice_id uuid, fee_amount numeric(15,3), status text);
CREATE TABLE public.payment_allocations(
  company_id uuid, payment_id uuid, allocation_type text, target_id uuid, amount numeric(14,2), is_active boolean DEFAULT true
);
CREATE TABLE public.delegate_calls(id serial PRIMARY KEY, payment_id uuid);

CREATE FUNCTION public.create_invoice_payment_with_late_fee_v1(
  p_company_id uuid, p_invoice_id uuid, p_amount numeric, p_late_fee_amount numeric,
  p_late_fee_id uuid, p_payment_date date, p_payment_method text,
  p_reference_number text DEFAULT NULL, p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL, p_actor_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid := gen_random_uuid(); v_fee uuid := p_late_fee_id;
BEGIN
  IF current_setting('fixture.period_closed', true) = 'yes' THEN
    RAISE EXCEPTION 'financial period closed';
  END IF;
  IF (SELECT balance FROM public.invoices WHERE id=p_invoice_id) < p_amount-p_late_fee_amount THEN
    RAISE EXCEPTION 'principal overpayment';
  END IF;
  IF current_setting('fixture.delegate_fails', true) = 'yes' THEN
    INSERT INTO public.delegate_calls(payment_id) VALUES(v_id);
    RAISE EXCEPTION 'injected accounting failure';
  END IF;
  IF v_fee IS NULL THEN
    v_fee := gen_random_uuid();
    INSERT INTO public.late_fees VALUES(v_fee,p_company_id,p_invoice_id,p_late_fee_amount,'applied');
  END IF;
  INSERT INTO public.payments VALUES(v_id,p_company_id,p_invoice_id,p_actor_id,p_amount,p_late_fee_amount,
    p_payment_date,p_payment_method,p_reference_number,p_notes,p_idempotency_key,'completed');
  INSERT INTO public.payment_allocations VALUES(p_company_id,v_id,'late_fee',v_fee,p_late_fee_amount,true);
  UPDATE public.invoices SET balance=balance-(p_amount-p_late_fee_amount) WHERE id=p_invoice_id;
  INSERT INTO public.delegate_calls(payment_id) VALUES(v_id);
  RETURN v_id;
END;
$$;
