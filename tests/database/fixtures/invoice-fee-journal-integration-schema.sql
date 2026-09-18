-- Minimal schema adapter for actual receipt-journal and legacy bank triggers.
-- Full production posting constraints, RLS, and activity/audit triggers are not included.
ALTER TABLE public.bank_transactions ADD COLUMN counterpart_bank_id uuid;
CREATE TABLE public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL,
  account_name text, account_type text, balance_type text, is_active boolean,
  is_header boolean, account_level integer
);
CREATE TABLE public.default_account_types (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),type_code text);
CREATE TABLE public.account_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,
  chart_of_accounts_id uuid REFERENCES public.chart_of_accounts(id),
  default_account_type_id uuid REFERENCES public.default_account_types(id),is_active boolean
);
CREATE TABLE public.cost_centers (id uuid PRIMARY KEY,company_id uuid,is_active boolean);
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL,
  entry_number text NOT NULL,entry_date date NOT NULL,description text NOT NULL,
  total_debit numeric NOT NULL,total_credit numeric NOT NULL,status text NOT NULL,
  reference_type text,reference_id uuid,created_by uuid,posted_by uuid,posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id),
  account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id),
  line_number integer NOT NULL,line_description text,debit_amount numeric,credit_amount numeric,
  cost_center_id uuid,created_at timestamptz NOT NULL DEFAULT now()
);
