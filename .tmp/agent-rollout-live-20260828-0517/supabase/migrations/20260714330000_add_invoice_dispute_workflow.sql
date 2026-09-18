-- Add the missing tenant-scoped invoice dispute workflow used by /legal/disputes.

CREATE TABLE IF NOT EXISTS public.invoice_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  dispute_number text NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  dispute_reason text NOT NULL,
  dispute_category text NOT NULL,
  disputed_amount numeric(15,3) NOT NULL DEFAULT 0 CHECK (disputed_amount >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','under_review','investigating','resolved','partially_resolved','rejected')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  submission_date date NOT NULL DEFAULT CURRENT_DATE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,
  resolved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, dispute_number)
);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_company_status
  ON public.invoice_disputes(company_id, status, submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_invoice
  ON public.invoice_disputes(invoice_id);
CREATE TABLE IF NOT EXISTS public.invoice_dispute_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.invoice_disputes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  note text NOT NULL,
  is_customer_visible boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_dispute_notes_dispute
  ON public.invoice_dispute_notes(dispute_id, created_at);
ALTER TABLE public.invoice_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_dispute_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_disputes_company_access ON public.invoice_disputes;
CREATE POLICY invoice_disputes_company_access ON public.invoice_disputes
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());
DROP POLICY IF EXISTS invoice_dispute_notes_company_access ON public.invoice_dispute_notes;
CREATE POLICY invoice_dispute_notes_company_access ON public.invoice_dispute_notes
  FOR ALL TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.invoice_disputes dispute
      WHERE dispute.id = dispute_id AND dispute.company_id = company_id
    )
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.invoice_disputes dispute
      WHERE dispute.id = dispute_id AND dispute.company_id = company_id
    )
  );
CREATE OR REPLACE VIEW public.pending_disputes
WITH (security_invoker = true)
AS
SELECT dispute.id,
  dispute.company_id,
  dispute.dispute_number,
  dispute.invoice_id,
  invoice.invoice_number,
  concat_ws(' ', customer.first_name, customer.last_name) AS customer_name_ar,
  dispute.dispute_reason,
  dispute.dispute_category,
  dispute.disputed_amount,
  dispute.status,
  dispute.priority,
  dispute.submission_date,
  NULL::text AS assigned_to_name,
  GREATEST(CURRENT_DATE - dispute.submission_date, 0) AS days_open,
  (SELECT count(*)::integer FROM public.invoice_dispute_notes note WHERE note.dispute_id = dispute.id) AS notes_count
FROM public.invoice_disputes dispute
JOIN public.invoices invoice ON invoice.id = dispute.invoice_id AND invoice.company_id = dispute.company_id
LEFT JOIN public.customers customer ON customer.id = dispute.customer_id AND customer.company_id = dispute.company_id;
CREATE OR REPLACE VIEW public.dispute_dashboard_stats
WITH (security_invoker = true)
AS
SELECT company.id AS company_id,
  count(dispute.id)::integer AS total_disputes,
  count(*) FILTER (WHERE dispute.status = 'pending')::integer AS pending_count,
  count(*) FILTER (WHERE dispute.status = 'under_review')::integer AS under_review_count,
  count(*) FILTER (WHERE dispute.status = 'investigating')::integer AS investigating_count,
  count(*) FILTER (WHERE dispute.status = 'resolved')::integer AS resolved_count,
  count(*) FILTER (WHERE dispute.status = 'rejected')::integer AS rejected_count,
  count(*) FILTER (WHERE dispute.priority = 'urgent' AND dispute.status NOT IN ('resolved','rejected'))::integer AS urgent_count,
  count(*) FILTER (
    WHERE dispute.status NOT IN ('resolved','rejected') AND CURRENT_DATE - dispute.submission_date > 7
  )::integer AS overdue_count,
  COALESCE(sum(dispute.disputed_amount), 0)::numeric AS total_disputed_amount,
  COALESCE(avg(extract(epoch FROM (dispute.resolved_at - dispute.created_at)) / 86400)
    FILTER (WHERE dispute.resolved_at IS NOT NULL), 0)::numeric AS avg_resolution_days
FROM public.companies company
LEFT JOIN public.invoice_disputes dispute ON dispute.company_id = company.id
GROUP BY company.id;
CREATE OR REPLACE FUNCTION public.create_invoice_dispute_v1(
  p_company_id uuid,
  p_invoice_id uuid,
  p_reason text,
  p_category text,
  p_disputed_amount numeric,
  p_priority text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice record;
  v_dispute_id uuid;
  v_number text;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(p_company_id);
  IF NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Dispute reason is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_category NOT IN ('amount_incorrect','service_not_received','duplicate_invoice','quality_issue','contract_violation','other') THEN
    RAISE EXCEPTION 'Invalid dispute category' USING ERRCODE = 'P0001';
  END IF;
  IF p_priority NOT IN ('low','medium','high','urgent') THEN
    RAISE EXCEPTION 'Invalid dispute priority' USING ERRCODE = 'P0001';
  END IF;
  SELECT invoice.id, invoice.customer_id, invoice.total_amount INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id AND invoice.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice was not found in the selected company'; END IF;
  IF COALESCE(p_disputed_amount, 0) <= 0 OR p_disputed_amount > v_invoice.total_amount THEN
    RAISE EXCEPTION 'Disputed amount must be between zero and the invoice total' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':invoice-dispute-number', 0));
  SELECT 'DSP-' || to_char(CURRENT_DATE, 'YYYY') || '-'
    || lpad((count(*) + 1)::text, 6, '0') INTO v_number
  FROM public.invoice_disputes dispute
  WHERE dispute.company_id = p_company_id;

  INSERT INTO public.invoice_disputes (
    company_id, dispute_number, invoice_id, customer_id, dispute_reason,
    dispute_category, disputed_amount, priority, created_by
  ) VALUES (
    p_company_id, v_number, p_invoice_id, v_invoice.customer_id, btrim(p_reason),
    p_category, round(p_disputed_amount, 3), p_priority, auth.uid()
  ) RETURNING id INTO v_dispute_id;
  RETURN v_dispute_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.resolve_invoice_dispute_v1(
  p_company_id uuid,
  p_dispute_id uuid,
  p_status text,
  p_resolution_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(p_company_id);
  IF p_status NOT IN ('resolved','partially_resolved','rejected') THEN
    RAISE EXCEPTION 'Invalid dispute resolution status' USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(btrim(COALESCE(p_resolution_notes, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Resolution notes are required' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.invoice_disputes dispute
  SET status = p_status, resolution_notes = btrim(p_resolution_notes),
    resolved_at = now(), updated_at = now()
  WHERE dispute.id = p_dispute_id AND dispute.company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice dispute was not found'; END IF;
END;
$$;
REVOKE ALL ON TABLE public.invoice_disputes, public.invoice_dispute_notes FROM anon;
GRANT SELECT,INSERT,UPDATE ON TABLE public.invoice_disputes, public.invoice_dispute_notes TO authenticated;
GRANT ALL ON TABLE public.invoice_disputes, public.invoice_dispute_notes TO service_role;
REVOKE ALL ON TABLE public.pending_disputes, public.dispute_dashboard_stats FROM anon;
GRANT SELECT ON TABLE public.pending_disputes, public.dispute_dashboard_stats TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.create_invoice_dispute_v1(uuid,uuid,text,text,numeric,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.resolve_invoice_dispute_v1(uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_dispute_v1(uuid,uuid,text,text,numeric,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.resolve_invoice_dispute_v1(uuid,uuid,text,text) TO authenticated,service_role;
