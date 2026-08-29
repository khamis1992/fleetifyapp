-- Duplicate-customer merge proposals produced by the duplicate detector agent.
-- Accepting a merge re-links every dependent record to the primary customer
-- and marks the duplicate as merged (never deleted).

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS merged_into_customer_id uuid REFERENCES public.customers(id);
CREATE TABLE public.customer_merge_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  primary_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  duplicate_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reason text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.7,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_merge_distinct_pair CHECK (primary_customer_id <> duplicate_customer_id)
);
CREATE UNIQUE INDEX customer_merge_proposals_open_pair_idx
  ON public.customer_merge_proposals (company_id, primary_customer_id, duplicate_customer_id)
  WHERE status = 'pending';
CREATE INDEX customer_merge_proposals_company_idx
  ON public.customer_merge_proposals (company_id, status, created_at DESC);
ALTER TABLE public.customer_merge_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members read merge proposals"
ON public.customer_merge_proposals
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());
REVOKE ALL ON TABLE public.customer_merge_proposals FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.customer_merge_proposals TO authenticated;
GRANT ALL ON TABLE public.customer_merge_proposals TO service_role;
COMMENT ON TABLE public.customer_merge_proposals IS
  'Duplicate customer merge proposals from the Kimi duplicate-detector agent; acceptance re-links dependent records.';
