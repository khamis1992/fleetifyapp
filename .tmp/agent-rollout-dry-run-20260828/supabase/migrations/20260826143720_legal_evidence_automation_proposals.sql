-- Persistent review queue for legal-evidence automation. Deterministic facts
-- are written directly to the litigation profile; only review-required
-- proposals are stored here.

CREATE TABLE public.legal_case_evidence_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL CHECK (length(btrim(field_key)) > 0),
    field_label TEXT NOT NULL CHECK (length(btrim(field_label)) > 0),
    value_label TEXT NOT NULL CHECK (length(btrim(value_label)) > 0),
    proposed_patch JSONB NOT NULL CHECK (jsonb_typeof(proposed_patch) = 'object'),
    current_value JSONB,
    automation_level TEXT NOT NULL DEFAULT 'review'
        CHECK (automation_level IN ('automatic', 'review')),
    source_kind TEXT NOT NULL CHECK (length(btrim(source_kind)) > 0),
    source_ref TEXT NOT NULL DEFAULT 'system',
    source_label TEXT NOT NULL CHECK (length(btrim(source_label)) > 0),
    source_document_id UUID REFERENCES public.contract_documents(id) ON DELETE SET NULL,
    confidence NUMERIC(5, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'superseded')),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_legal_evidence_proposal_source
        UNIQUE (company_id, contract_id, field_key, source_kind, source_ref),
    CONSTRAINT chk_legal_evidence_proposal_review_state CHECK (
        (status = 'pending' AND reviewed_at IS NULL)
        OR (status <> 'pending' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    )
);

CREATE INDEX idx_legal_evidence_proposals_contract_status
    ON public.legal_case_evidence_proposals (company_id, contract_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_legal_evidence_proposal_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_legal_evidence_proposal_updated_at
    BEFORE UPDATE ON public.legal_case_evidence_proposals
    FOR EACH ROW EXECUTE FUNCTION public.update_legal_evidence_proposal_updated_at();

ALTER TABLE public.legal_case_evidence_proposals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.legal_case_evidence_proposals FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.legal_case_evidence_proposals TO authenticated;

CREATE POLICY "Company users can view legal evidence proposals"
    ON public.legal_case_evidence_proposals
    FOR SELECT TO authenticated
    USING (
        company_id IN (
            SELECT profiles.company_id
            FROM public.profiles
            WHERE profiles.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Company users can create legal evidence proposals"
    ON public.legal_case_evidence_proposals
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id IN (
            SELECT profiles.company_id
            FROM public.profiles
            WHERE profiles.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Company users can review legal evidence proposals"
    ON public.legal_case_evidence_proposals
    FOR UPDATE TO authenticated
    USING (
        company_id IN (
            SELECT profiles.company_id
            FROM public.profiles
            WHERE profiles.user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT profiles.company_id
            FROM public.profiles
            WHERE profiles.user_id = (SELECT auth.uid())
        )
    );

COMMENT ON TABLE public.legal_case_evidence_proposals IS
    'اقتراحات أتمتة الأدلة القانونية التي تتطلب اعتماداً بشرياً مع المصدر والثقة وسجل المراجعة';

;
