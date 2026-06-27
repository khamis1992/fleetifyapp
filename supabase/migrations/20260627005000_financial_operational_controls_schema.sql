-- Financial operational controls schema.
-- Adds durable columns for payment reconciliation and invoice approval tracking.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reconciliation_reference text,
  ADD COLUMN IF NOT EXISTS reconciliation_notes text;

CREATE INDEX IF NOT EXISTS idx_payments_reconciliation_status
  ON public.payments(company_id, reconciliation_status, payment_date)
  WHERE payment_status = 'completed';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS submitted_for_approval_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_for_approval_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_notes text;

CREATE INDEX IF NOT EXISTS idx_invoices_approval_status
  ON public.invoices(company_id, status, submitted_for_approval_at, approved_at);

CREATE TABLE IF NOT EXISTS public.invoice_approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'cancelled')),
  action_by uuid REFERENCES auth.users(id),
  action_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_approval_history_invoice
  ON public.invoice_approval_history(invoice_id, action_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_approval_history_company
  ON public.invoice_approval_history(company_id, action_at DESC);

ALTER TABLE public.invoice_approval_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoice_approval_history_company_select
  ON public.invoice_approval_history;

CREATE POLICY invoice_approval_history_company_select
  ON public.invoice_approval_history
  FOR SELECT
  USING (
    company_id IN (
      SELECT profiles.company_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS invoice_approval_history_company_insert
  ON public.invoice_approval_history;

CREATE POLICY invoice_approval_history_company_insert
  ON public.invoice_approval_history
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT profiles.company_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.invoice_approval_history TO authenticated;
GRANT ALL ON public.invoice_approval_history TO service_role;
