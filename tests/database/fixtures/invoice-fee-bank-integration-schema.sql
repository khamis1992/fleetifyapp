-- Isolated adapter: real bank functions are loaded from migrations by the runner.
-- Not a production schema dump: bank journal triggers are loaded separately;
-- full RLS and production accounting constraints remain absent.
ALTER TABLE public.payments ADD COLUMN journal_entry_id uuid;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object('role',current_setting('fixture.role',true))
$$;
CREATE TABLE public.banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL,
  bank_name text NOT NULL, account_number text NOT NULL,
  currency text NOT NULL DEFAULT 'KWD', current_balance numeric DEFAULT 0,
  opening_balance numeric DEFAULT 0, is_active boolean DEFAULT true,
  is_primary boolean DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL,
  bank_id uuid NOT NULL REFERENCES public.banks(id),
  transaction_number text NOT NULL, transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_type text NOT NULL, amount numeric NOT NULL, balance_after numeric NOT NULL,
  description text NOT NULL, reference_number text, check_number text,
  status text NOT NULL DEFAULT 'completed', created_by uuid, journal_entry_id uuid,
  payment_id uuid REFERENCES public.payments(id) ON DELETE RESTRICT,
  reversal_of_transaction_id uuid REFERENCES public.bank_transactions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_bank_transactions_payment_original
  ON public.bank_transactions(company_id,payment_id)
  WHERE payment_id IS NOT NULL AND reversal_of_transaction_id IS NULL;
CREATE UNIQUE INDEX uq_bank_transactions_reversal_of
  ON public.bank_transactions(reversal_of_transaction_id)
  WHERE reversal_of_transaction_id IS NOT NULL;
