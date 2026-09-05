-- Adapter on top of invoice-fee-replay-schema.sql. The runner REPLACES the
-- simplified v1 with the unchanged function from its real migration.
-- Auth, period policy, canonical totals, bank and synchronization helpers remain
-- explicit doubles. This is RPC integration coverage, NOT full-schema posting.
CREATE TYPE public.transaction_type AS ENUM ('receipt');
ALTER TABLE public.invoices
  ADD COLUMN customer_id uuid,
  ADD COLUMN contract_id uuid,
  ADD COLUMN payment_status text DEFAULT 'unpaid',
  ADD COLUMN total_amount numeric(15,2),
  ADD COLUMN due_date date;
ALTER TABLE public.invoices ADD COLUMN paid_amount numeric(15,2) DEFAULT 0;
ALTER TABLE public.payments
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ADD COLUMN customer_id uuid,
  ADD COLUMN contract_id uuid,
  ADD COLUMN payment_number text,
  ADD COLUMN payment_type text,
  ADD COLUMN transaction_type public.transaction_type,
  ADD COLUMN bank_id uuid,
  ADD COLUMN allocation_status text,
  ADD COLUMN processing_status text,
  ADD COLUMN currency text,
  ADD COLUMN late_fine_amount numeric(15,2),
  ADD COLUMN late_fine_status text,
  ADD COLUMN late_fine_type text,
  ADD COLUMN amount_paid numeric(15,2),
  ADD COLUMN remaining_amount numeric(15,2),
  ADD COLUMN due_date date,
  ADD COLUMN days_overdue integer,
  ADD COLUMN created_at timestamptz,
  ADD COLUMN updated_at timestamptz;
ALTER TABLE public.payments
  ADD COLUMN agreement_number text, ADD COLUMN check_number text,
  ADD COLUMN account_id uuid, ADD COLUMN bank_account text, ADD COLUMN cost_center_id uuid;
ALTER TABLE public.late_fees
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ADD COLUMN contract_id uuid,
  ADD COLUMN original_amount numeric,
  ADD COLUMN days_overdue integer,
  ADD COLUMN fee_type text,
  ADD COLUMN applied_at timestamptz,
  ADD COLUMN applied_by uuid,
  ADD COLUMN created_at timestamptz DEFAULT now();
ALTER TABLE public.payment_allocations
  ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN created_at timestamptz DEFAULT now(),
  ADD COLUMN updated_at timestamptz DEFAULT now(),
  ADD COLUMN voided_at timestamptz,
  ADD COLUMN void_reason text,
  ADD COLUMN allocated_date timestamptz,
  ADD COLUMN allocation_method text,
  ADD COLUMN allocation_order integer,
  ADD COLUMN notes text,
  ADD COLUMN created_by uuid;

CREATE TABLE public.fixture_effects(id serial PRIMARY KEY, operation text, target uuid, batch text);
CREATE FUNCTION public.fixture_effect(text,uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.fixture_effects(operation,target,batch)
  VALUES($1,$2,current_setting('app.payment_allocation_batch_mode',true));
  IF current_setting('fixture.fail_effect',true) = $1 THEN
    RAISE EXCEPTION 'injected downstream failure: %', $1;
  END IF;
END;
$$;
CREATE FUNCTION public.assert_financial_period_is_open(uuid,date) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('fixture.period_closed',true)='yes' THEN
    RAISE EXCEPTION 'financial period closed';
  END IF;
END;
$$;
CREATE FUNCTION public.canonical_invoice_paid_amount(uuid,uuid) RETURNS numeric LANGUAGE sql AS $$
  SELECT COALESCE(sum(a.amount),0)
  FROM public.payment_allocations a JOIN public.payments p ON p.id=a.payment_id AND p.company_id=a.company_id
  WHERE a.target_id=$1 AND a.allocation_type='invoice' AND a.is_active AND p.payment_status='completed'
    AND ($2 IS NULL OR p.id<>$2)
$$;
CREATE FUNCTION public.financial_controls_bypass_enabled() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('app.financial_controls_bypass',true),'')='on'
$$;
CREATE FUNCTION public.resolve_payment_bank_id(uuid,uuid,text,text) RETURNS uuid LANGUAGE sql AS $$
  SELECT '88888888-8888-4888-8888-888888888888'::uuid
$$;
CREATE SEQUENCE public.fixture_payment_numbers;
CREATE FUNCTION public.generate_payment_number(uuid) RETURNS text LANGUAGE sql AS $$
  SELECT 'TEST-' || nextval('public.fixture_payment_numbers')::text
$$;
CREATE FUNCTION public.sync_payment_allocation_state(uuid) RETURNS void LANGUAGE sql AS $$
  SELECT public.fixture_effect('allocation',$1)
$$;
CREATE FUNCTION public.recalculate_invoice_financial_state(uuid) RETURNS void LANGUAGE sql AS $$
  SELECT public.fixture_effect('invoice',$1)
$$;
CREATE FUNCTION public.recalculate_contract_financial_state(uuid) RETURNS void LANGUAGE sql AS $$
  SELECT public.fixture_effect('contract',$1)
$$;
CREATE FUNCTION public.create_payment_bank_transaction(uuid) RETURNS void LANGUAGE sql AS $$
  SELECT public.fixture_effect('bank',$1)
$$;
