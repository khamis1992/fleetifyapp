-- Complete the legal-case memo workflow introduced by
-- 20260825120000_legal_case_litigation_data.sql.
--
-- This migration is additive because the first version of the litigation
-- tables may already exist. Apply it once after reconciling migration history.

ALTER TABLE public.legal_case_litigation_profile
    ADD COLUMN IF NOT EXISTS renewal_applies BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS renewed_end_date DATE,
    ADD COLUMN IF NOT EXISTS rent_due_day SMALLINT,
    ADD COLUMN IF NOT EXISTS payment_clause_number TEXT,
    ADD COLUMN IF NOT EXISTS return_clause_number TEXT,
    ADD COLUMN IF NOT EXISTS violations_clause_number TEXT,
    ADD COLUMN IF NOT EXISTS termination_clause_number TEXT,
    ADD COLUMN IF NOT EXISTS termination_clause_text TEXT,
    ADD COLUMN IF NOT EXISTS notice_exception_type TEXT,
    ADD COLUMN IF NOT EXISTS notice_exception_clause_or_reason TEXT,
    ADD COLUMN IF NOT EXISTS notice_exception_document_id UUID REFERENCES public.contract_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS vehicle_return_document_id UUID REFERENCES public.contract_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS retention_rate_source_document_id UUID REFERENCES public.contract_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS contractual_compensation_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS contractual_compensation_clause_number TEXT,
    ADD COLUMN IF NOT EXISTS contractual_compensation_clause_text TEXT,
    ADD COLUMN IF NOT EXISTS contractual_compensation_method TEXT,
    ADD COLUMN IF NOT EXISTS contractual_compensation_rate NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS contractual_compensation_cap NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS contractual_compensation_document_id UUID REFERENCES public.contract_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS legal_review_status TEXT NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS approved_by UUID,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.legal_case_litigation_profile
    DROP CONSTRAINT IF EXISTS legal_case_litigation_profile_rescission_strategy_check,
    ADD CONSTRAINT legal_case_litigation_profile_rescission_strategy_check
        CHECK (rescission_strategy IN ('natural_expiry', 'documented_termination', 'judicial_rescission')),
    DROP CONSTRAINT IF EXISTS legal_case_litigation_profile_vehicle_custody_check,
    ADD CONSTRAINT legal_case_litigation_profile_vehicle_custody_check
        CHECK (vehicle_custody IN (
            'with_defendant', 'returned', 'recovered_by_company',
            'authority_impounded', 'lost', 'unknown'
        )),
    DROP CONSTRAINT IF EXISTS chk_returned_vehicle_requires_date,
    ADD CONSTRAINT chk_returned_vehicle_requires_date CHECK (
        vehicle_custody NOT IN ('returned', 'recovered_by_company')
        OR (vehicle_returned_at IS NOT NULL AND vehicle_return_document_id IS NOT NULL)
    ) NOT VALID,
    DROP CONSTRAINT IF EXISTS chk_retention_rate_requires_source,
    ADD CONSTRAINT chk_retention_rate_requires_source CHECK (
        retention_daily_rate IS NULL
        OR (
            retention_rate_source IS NOT NULL
            AND NULLIF(BTRIM(retention_rate_source_ref), '') IS NOT NULL
            AND retention_rate_source_document_id IS NOT NULL
        )
    ) NOT VALID,
    DROP CONSTRAINT IF EXISTS chk_documented_termination_requires_evidence,
    ADD CONSTRAINT chk_documented_termination_requires_evidence CHECK (
        rescission_strategy = 'judicial_rescission'
        OR (
            termination_type IS NOT NULL
            AND termination_date IS NOT NULL
            AND termination_supporting_document_id IS NOT NULL
            AND termination_date_status = 'confirmed'
            AND (
                (rescission_strategy = 'natural_expiry' AND termination_type = 'contract_expired')
                OR
                (rescission_strategy = 'documented_termination' AND termination_type = 'documented_cancellation')
            )
        )
    ) NOT VALID,
    ADD CONSTRAINT chk_renewal_end_date CHECK (
        renewal_applies = false OR renewed_end_date IS NOT NULL
    ),
    ADD CONSTRAINT chk_rent_due_day CHECK (
        rent_due_day IS NULL OR rent_due_day BETWEEN 1 AND 31
    ),
    ADD CONSTRAINT chk_notice_exception_evidence CHECK (
        notice_exception_type IS NULL
        OR (
            notice_exception_type IN ('due_date_agreement', 'written_refusal', 'impossible_or_useless_performance')
            AND NULLIF(BTRIM(notice_exception_clause_or_reason), '') IS NOT NULL
            AND notice_exception_document_id IS NOT NULL
        )
    ),
    ADD CONSTRAINT chk_contractual_compensation_evidence CHECK (
        contractual_compensation_enabled = false
        OR (
            NULLIF(BTRIM(contractual_compensation_clause_number), '') IS NOT NULL
            AND NULLIF(BTRIM(contractual_compensation_clause_text), '') IS NOT NULL
            AND contractual_compensation_method IN ('fixed', 'daily', 'per_invoice')
            AND contractual_compensation_rate > 0
            AND contractual_compensation_document_id IS NOT NULL
        )
    ),
    ADD CONSTRAINT chk_legal_review_status CHECK (
        legal_review_status IN ('draft', 'ready_with_reservations', 'ready', 'approved')
    ),
    ADD CONSTRAINT chk_approval_metadata CHECK (
        legal_review_status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
    ) NOT VALID;
ALTER TABLE public.legal_case_formal_notices
    DROP CONSTRAINT IF EXISTS chk_confirmed_delivery_requires_date,
    ADD CONSTRAINT chk_confirmed_delivery_requires_date CHECK (
        delivery_confirmed = false
        OR (delivered_on IS NOT NULL AND proof_document_id IS NOT NULL)
    ) NOT VALID,
    ADD CONSTRAINT chk_notice_delivery_chronology CHECK (
        delivered_on IS NULL OR delivered_on >= sent_on
    ) NOT VALID;
ALTER TABLE public.legal_case_damage_costs
    DROP CONSTRAINT IF EXISTS legal_case_damage_costs_cost_type_check,
    ADD CONSTRAINT legal_case_damage_costs_cost_type_check CHECK (cost_type IN (
        'recovery_towing',
        'non_standard_repairs',
        'parts_insurance_burden',
        'inspection_transport_storage',
        'monetary_delay_damage',
        'early_termination_damage',
        'other'
    )),
    ADD COLUMN IF NOT EXISTS causation_notes TEXT,
    ADD COLUMN IF NOT EXISTS depreciation_deduction NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS insurance_recovery NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD CONSTRAINT chk_damage_deductions_non_negative CHECK (
        depreciation_deduction >= 0 AND insurance_recovery >= 0
    ),
    ADD CONSTRAINT chk_verified_damage_requires_document CHECK (
        verified = false OR evidence_document_id IS NOT NULL
    ) NOT VALID;
-- Immutable, versioned memo snapshots. The editable litigation profile remains
-- a contract-level draft; every approved/generated court version is frozen here.
CREATE TABLE IF NOT EXISTS public.legal_case_memo_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    facts_as_of_date DATE NOT NULL,
    filing_date DATE,
    legal_path TEXT NOT NULL CHECK (
        legal_path IN ('natural_expiry', 'documented_termination', 'judicial_rescission')
    ),
    readiness_status TEXT NOT NULL CHECK (
        readiness_status IN ('ready_with_reservations', 'ready', 'approved')
    ),
    readiness_issues TEXT[] NOT NULL DEFAULT '{}',
    payload JSONB NOT NULL,
    template_version TEXT NOT NULL DEFAULT 'INVESTMENT_COURT_MEMO_V2',
    document_reference TEXT NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_legal_case_memo_snapshot_version UNIQUE (company_id, contract_id, version),
    CONSTRAINT uq_legal_case_memo_snapshot_reference UNIQUE (company_id, document_reference),
    CONSTRAINT chk_snapshot_approved_metadata CHECK (
        readiness_status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_legal_case_memo_snapshots_case
    ON public.legal_case_memo_snapshots(case_id, version DESC)
    WHERE case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_legal_case_memo_snapshots_contract
    ON public.legal_case_memo_snapshots(company_id, contract_id, version DESC);
-- Enforce that every linked contract, case and evidence document belongs to the
-- same company and contract. RLS alone only validates the row being written.
CREATE OR REPLACE FUNCTION public.validate_legal_case_litigation_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    linked_document_id UUID;
    document_field TEXT;
    document_fields TEXT[];
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.contracts c
        WHERE c.id = NEW.contract_id AND c.company_id = NEW.company_id
    ) THEN
        RAISE EXCEPTION 'contract does not belong to the selected company';
    END IF;

    IF NEW.case_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.legal_cases lc
        WHERE lc.id = NEW.case_id
          AND lc.company_id = NEW.company_id
          AND lc.contract_id = NEW.contract_id
    ) THEN
        RAISE EXCEPTION 'legal case does not belong to the selected company and contract';
    END IF;

    document_fields := CASE TG_TABLE_NAME
        WHEN 'legal_case_litigation_profile' THEN ARRAY[
            'termination_supporting_document_id',
            'delivery_handover_document_id',
            'vehicle_return_document_id',
            'notice_exception_document_id',
            'retention_rate_source_document_id',
            'contractual_compensation_document_id'
        ]
        WHEN 'legal_case_formal_notices' THEN ARRAY['proof_document_id']
        WHEN 'legal_case_damage_costs' THEN ARRAY['evidence_document_id']
        ELSE ARRAY[]::TEXT[]
    END;

    FOREACH document_field IN ARRAY document_fields LOOP
        linked_document_id := NULLIF(to_jsonb(NEW) ->> document_field, '')::UUID;
        IF linked_document_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.contract_documents cd
            WHERE cd.id = linked_document_id
              AND cd.company_id = NEW.company_id
              AND cd.contract_id = NEW.contract_id
        ) THEN
            RAISE EXCEPTION 'evidence document does not belong to the selected company and contract';
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_litigation_profile_links ON public.legal_case_litigation_profile;
CREATE TRIGGER trg_validate_litigation_profile_links
    BEFORE INSERT OR UPDATE ON public.legal_case_litigation_profile
    FOR EACH ROW EXECUTE FUNCTION public.validate_legal_case_litigation_links();
DROP TRIGGER IF EXISTS trg_validate_formal_notice_links ON public.legal_case_formal_notices;
CREATE TRIGGER trg_validate_formal_notice_links
    BEFORE INSERT OR UPDATE ON public.legal_case_formal_notices
    FOR EACH ROW EXECUTE FUNCTION public.validate_legal_case_litigation_links();
DROP TRIGGER IF EXISTS trg_validate_damage_cost_links ON public.legal_case_damage_costs;
CREATE TRIGGER trg_validate_damage_cost_links
    BEFORE INSERT OR UPDATE ON public.legal_case_damage_costs
    FOR EACH ROW EXECUTE FUNCTION public.validate_legal_case_litigation_links();
DROP TRIGGER IF EXISTS trg_validate_memo_snapshot_links ON public.legal_case_memo_snapshots;
CREATE TRIGGER trg_validate_memo_snapshot_links
    BEFORE INSERT ON public.legal_case_memo_snapshots
    FOR EACH ROW EXECUTE FUNCTION public.validate_legal_case_litigation_links();
CREATE OR REPLACE FUNCTION public.prevent_legal_memo_snapshot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'legal memo snapshots are immutable; create a new version instead';
END;
$$;
DROP TRIGGER IF EXISTS trg_prevent_legal_memo_snapshot_mutation ON public.legal_case_memo_snapshots;
CREATE TRIGGER trg_prevent_legal_memo_snapshot_mutation
    BEFORE UPDATE OR DELETE ON public.legal_case_memo_snapshots
    FOR EACH ROW EXECUTE FUNCTION public.prevent_legal_memo_snapshot_mutation();
-- Freeze version allocation, snapshot insertion and profile approval in one
-- transaction. The advisory lock prevents duplicate versions under concurrency.
CREATE OR REPLACE FUNCTION public.freeze_legal_case_memo_snapshot(
    p_company_id UUID,
    p_contract_id UUID,
    p_case_id UUID,
    p_facts_as_of_date DATE,
    p_filing_date DATE,
    p_legal_path TEXT,
    p_readiness_status TEXT,
    p_readiness_issues TEXT[],
    p_payload JSONB,
    p_template_version TEXT DEFAULT 'INVESTMENT_COURT_MEMO_V2',
    p_approve BOOLEAN DEFAULT false
)
RETURNS public.legal_case_memo_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    next_version INTEGER;
    contract_number_value TEXT;
    document_reference_value TEXT;
    snapshot public.legal_case_memo_snapshots;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentication is required' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid() AND p.company_id = p_company_id
    ) THEN
        RAISE EXCEPTION 'user does not belong to the selected company' USING ERRCODE = '42501';
    END IF;
    IF p_approve AND NOT public.is_company_manager(p_company_id) THEN
        RAISE EXCEPTION 'manager permission is required to approve a legal memo' USING ERRCODE = '42501';
    END IF;

    PERFORM pg_advisory_xact_lock(
        hashtextextended(p_company_id::TEXT || ':' || p_contract_id::TEXT, 0)
    );

    SELECT c.contract_number
      INTO contract_number_value
      FROM public.contracts c
     WHERE c.id = p_contract_id AND c.company_id = p_company_id;
    IF contract_number_value IS NULL THEN
        RAISE EXCEPTION 'contract does not belong to the selected company';
    END IF;

    SELECT COALESCE(MAX(s.version), 0) + 1
      INTO next_version
      FROM public.legal_case_memo_snapshots s
     WHERE s.company_id = p_company_id AND s.contract_id = p_contract_id;

    document_reference_value := format(
        'MEMO-%s-%s-V%s',
        regexp_replace(contract_number_value, '[^[:alnum:]-]+', '-', 'g'),
        to_char(p_facts_as_of_date, 'YYYYMMDD'),
        lpad(next_version::TEXT, 3, '0')
    );

    INSERT INTO public.legal_case_memo_snapshots (
        company_id, contract_id, case_id, version, facts_as_of_date,
        filing_date, legal_path, readiness_status, readiness_issues, payload,
        template_version, document_reference, approved_by, approved_at, created_by
    ) VALUES (
        p_company_id, p_contract_id, p_case_id, next_version, p_facts_as_of_date,
        p_filing_date, p_legal_path,
        CASE WHEN p_approve THEN 'approved' ELSE p_readiness_status END,
        COALESCE(p_readiness_issues, '{}'),
        jsonb_set(COALESCE(p_payload, '{}'::JSONB), '{documentReference}', to_jsonb(document_reference_value)),
        COALESCE(NULLIF(p_template_version, ''), 'INVESTMENT_COURT_MEMO_V2'),
        document_reference_value,
        CASE WHEN p_approve THEN auth.uid() ELSE NULL END,
        CASE WHEN p_approve THEN NOW() ELSE NULL END,
        auth.uid()
    ) RETURNING * INTO snapshot;

    IF p_approve THEN
        UPDATE public.legal_case_litigation_profile
           SET legal_review_status = 'approved',
               approved_by = auth.uid(),
               approved_at = NOW()
         WHERE company_id = p_company_id AND contract_id = p_contract_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'litigation profile must exist before approving a memo';
        END IF;
    END IF;

    RETURN snapshot;
END;
$$;
-- A profile cannot remain approved after any material edit, and direct client
-- updates cannot manufacture approval without a newer approved frozen snapshot.
CREATE OR REPLACE FUNCTION public.guard_legal_memo_profile_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    old_material JSONB;
    new_material JSONB;
    approved_snapshot public.legal_case_memo_snapshots;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.legal_review_status = 'approved' THEN
            RAISE EXCEPTION 'create the litigation profile as a draft, then freeze an approved snapshot';
        END IF;
        RETURN NEW;
    END IF;

    old_material := to_jsonb(OLD) - ARRAY[
        'legal_review_status', 'approved_by', 'approved_at', 'updated_at'
    ];
    new_material := to_jsonb(NEW) - ARRAY[
        'legal_review_status', 'approved_by', 'approved_at', 'updated_at'
    ];

    IF OLD.legal_review_status = 'approved' AND old_material IS DISTINCT FROM new_material THEN
        NEW.legal_review_status := 'draft';
        NEW.approved_by := NULL;
        NEW.approved_at := NULL;
        RETURN NEW;
    END IF;

    IF OLD.legal_review_status = 'approved'
       AND NEW.legal_review_status = 'approved'
       AND (NEW.approved_by IS DISTINCT FROM OLD.approved_by
            OR NEW.approved_at IS DISTINCT FROM OLD.approved_at) THEN
        RAISE EXCEPTION 'approved memo metadata is immutable; freeze a new version instead';
    END IF;

    IF NEW.legal_review_status = 'approved' AND OLD.legal_review_status <> 'approved' THEN
        SELECT s.*
          INTO approved_snapshot
          FROM public.legal_case_memo_snapshots s
         WHERE s.company_id = NEW.company_id
           AND s.contract_id = NEW.contract_id
           AND s.readiness_status = 'approved'
           AND s.approved_by = auth.uid()
           AND s.created_at >= OLD.updated_at
         ORDER BY s.version DESC
         LIMIT 1;
        IF approved_snapshot.id IS NULL THEN
            RAISE EXCEPTION 'freeze and approve a current memo snapshot before approving the profile';
        END IF;
        NEW.approved_by := approved_snapshot.approved_by;
        NEW.approved_at := approved_snapshot.approved_at;
    END IF;

    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_legal_memo_profile_approval ON public.legal_case_litigation_profile;
CREATE TRIGGER trg_guard_legal_memo_profile_approval
    BEFORE INSERT OR UPDATE ON public.legal_case_litigation_profile
    FOR EACH ROW EXECUTE FUNCTION public.guard_legal_memo_profile_approval();
REVOKE ALL ON FUNCTION public.freeze_legal_case_memo_snapshot(
    UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT[], JSONB, TEXT, BOOLEAN
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.freeze_legal_case_memo_snapshot(
    UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT[], JSONB, TEXT, BOOLEAN
) TO authenticated;
CREATE OR REPLACE FUNCTION public.invalidate_legal_memo_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    changed_row JSONB := COALESCE(to_jsonb(NEW), to_jsonb(OLD));
BEGIN
    UPDATE public.legal_case_litigation_profile
       SET legal_review_status = 'draft', approved_by = NULL, approved_at = NULL
     WHERE company_id = (changed_row ->> 'company_id')::UUID
       AND contract_id = (changed_row ->> 'contract_id')::UUID
       AND legal_review_status = 'approved';
    RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_notice_invalidates_legal_memo_approval ON public.legal_case_formal_notices;
CREATE TRIGGER trg_notice_invalidates_legal_memo_approval
    AFTER INSERT OR UPDATE OR DELETE ON public.legal_case_formal_notices
    FOR EACH ROW EXECUTE FUNCTION public.invalidate_legal_memo_approval();
DROP TRIGGER IF EXISTS trg_damage_invalidates_legal_memo_approval ON public.legal_case_damage_costs;
CREATE TRIGGER trg_damage_invalidates_legal_memo_approval
    AFTER INSERT OR UPDATE OR DELETE ON public.legal_case_damage_costs
    FOR EACH ROW EXECUTE FUNCTION public.invalidate_legal_memo_approval();
ALTER TABLE public.legal_case_memo_snapshots ENABLE ROW LEVEL SECURITY;
-- Recreate the litigation policies with an explicit role and the cached uid
-- form recommended for Supabase RLS policies.
DO $$
DECLARE
    table_name TEXT;
    policy_record RECORD;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'legal_case_litigation_profile',
        'legal_case_formal_notices',
        'legal_case_damage_costs',
        'legal_case_memo_snapshots'
    ] LOOP
        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = table_name
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_name);
        END LOOP;

        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = (SELECT auth.uid())))',
            table_name || '_select_company', table_name
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = (SELECT auth.uid())))',
            table_name || '_insert_company', table_name
        );
        IF table_name <> 'legal_case_memo_snapshots' THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = (SELECT auth.uid()))) WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = (SELECT auth.uid())))',
                table_name || '_update_company', table_name
            );
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = (SELECT auth.uid())))',
                table_name || '_delete_company', table_name
            );
        END IF;
    END LOOP;
END;
$$;
REVOKE ALL ON TABLE public.legal_case_litigation_profile FROM anon;
REVOKE ALL ON TABLE public.legal_case_formal_notices FROM anon;
REVOKE ALL ON TABLE public.legal_case_damage_costs FROM anon;
REVOKE ALL ON TABLE public.legal_case_memo_snapshots FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.legal_case_litigation_profile TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.legal_case_formal_notices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.legal_case_damage_costs TO authenticated;
GRANT SELECT ON TABLE public.legal_case_memo_snapshots TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.legal_case_memo_snapshots FROM authenticated;
COMMENT ON TABLE public.legal_case_memo_snapshots IS
    'Immutable, versioned legal memo payloads frozen per contract/case for audit and regeneration.';
