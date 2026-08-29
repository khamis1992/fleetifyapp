-- Unified store for every Kimi K3 agent review across the system.
-- Agents write through service-role edge functions; users read their company's
-- rows only.

CREATE TABLE public.ai_agent_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_type text NOT NULL CHECK (agent_type IN (
    'journal_entry', 'legal_case', 'daily_closeout',
    'collection_message', 'customer_autofill', 'payment_match',
    'correction_verify'
  )),
  entity_type text NOT NULL,
  entity_id uuid,
  verdict text NOT NULL,
  confidence numeric,
  summary text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_agent_reviews_lookup_idx
  ON public.ai_agent_reviews (company_id, agent_type, entity_type, entity_id, created_at DESC);
ALTER TABLE public.ai_agent_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members read their agent reviews"
ON public.ai_agent_reviews
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());
REVOKE ALL ON TABLE public.ai_agent_reviews FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.ai_agent_reviews TO authenticated;
GRANT ALL ON TABLE public.ai_agent_reviews TO service_role;
COMMENT ON TABLE public.ai_agent_reviews IS
  'Central store of Kimi K3 agent verdicts (journal entries, legal cases, closeouts, collections, autofill, payment matching, correction verification).';
