DROP TRIGGER IF EXISTS trg_validate_memo_snapshot_links ON public.legal_case_memo_snapshots;
DROP TRIGGER IF EXISTS trg_prevent_legal_memo_snapshot_mutation ON public.legal_case_memo_snapshots;
DROP TRIGGER IF EXISTS trg_validate_damage_cost_links ON public.legal_case_damage_costs;
DROP TRIGGER IF EXISTS trg_validate_formal_notice_links ON public.legal_case_formal_notices;
DROP TRIGGER IF EXISTS trg_validate_litigation_profile_links ON public.legal_case_litigation_profile;
DROP TRIGGER IF EXISTS trg_notice_invalidates_legal_memo_approval ON public.legal_case_formal_notices;
DROP TRIGGER IF EXISTS trg_damage_invalidates_legal_memo_approval ON public.legal_case_damage_costs;
DROP TRIGGER IF EXISTS trg_guard_legal_memo_profile_approval ON public.legal_case_litigation_profile;

DROP FUNCTION IF EXISTS public.freeze_legal_case_memo_snapshot(UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT[], JSONB, TEXT, BOOLEAN);
DROP TABLE IF EXISTS public.legal_case_memo_snapshots;
DROP FUNCTION IF EXISTS public.prevent_legal_memo_snapshot_mutation();
DROP FUNCTION IF EXISTS public.invalidate_legal_memo_approval();
DROP FUNCTION IF EXISTS public.guard_legal_memo_profile_approval();
DROP FUNCTION IF EXISTS public.validate_legal_case_litigation_links();

ALTER TABLE public.legal_case_damage_costs
    DROP CONSTRAINT IF EXISTS chk_verified_damage_requires_document,
    DROP CONSTRAINT IF EXISTS chk_damage_deductions_non_negative,
    DROP CONSTRAINT IF EXISTS legal_case_damage_costs_cost_type_check;

UPDATE public.legal_case_damage_costs
SET cost_type = 'other'
WHERE cost_type IN ('monetary_delay_damage', 'early_termination_damage');

ALTER TABLE public.legal_case_damage_costs
    DROP COLUMN IF EXISTS insurance_recovery,
    DROP COLUMN IF EXISTS depreciation_deduction,
    DROP COLUMN IF EXISTS causation_notes,
    ADD CONSTRAINT legal_case_damage_costs_cost_type_check CHECK (cost_type IN (
        'recovery_towing',
        'non_standard_repairs',
        'parts_insurance_burden',
        'inspection_transport_storage',
        'other'
    ));

ALTER TABLE public.legal_case_formal_notices
    DROP CONSTRAINT IF EXISTS chk_notice_delivery_chronology,
    DROP CONSTRAINT IF EXISTS chk_confirmed_delivery_requires_date,
    ADD CONSTRAINT chk_confirmed_delivery_requires_date CHECK (
        delivery_confirmed = false OR delivered_on IS NOT NULL
    );

ALTER TABLE public.legal_case_litigation_profile
    DROP CONSTRAINT IF EXISTS chk_approval_metadata,
    DROP CONSTRAINT IF EXISTS chk_legal_review_status,
    DROP CONSTRAINT IF EXISTS chk_contractual_compensation_evidence,
    DROP CONSTRAINT IF EXISTS chk_notice_exception_evidence,
    DROP CONSTRAINT IF EXISTS chk_rent_due_day,
    DROP CONSTRAINT IF EXISTS chk_renewal_end_date,
    DROP CONSTRAINT IF EXISTS legal_case_litigation_profile_rescission_strategy_check,
    DROP CONSTRAINT IF EXISTS legal_case_litigation_profile_vehicle_custody_check,
    DROP CONSTRAINT IF EXISTS chk_returned_vehicle_requires_date,
    DROP CONSTRAINT IF EXISTS chk_retention_rate_requires_source,
    DROP CONSTRAINT IF EXISTS chk_documented_termination_requires_evidence;

UPDATE public.legal_case_litigation_profile
SET rescission_strategy = 'documented_termination'
WHERE rescission_strategy = 'natural_expiry';

UPDATE public.legal_case_litigation_profile
SET vehicle_custody = CASE
    WHEN vehicle_custody = 'recovered_by_company' THEN 'returned'
    WHEN vehicle_custody IN ('authority_impounded', 'lost') THEN 'unknown'
    ELSE vehicle_custody
END
WHERE vehicle_custody IN ('recovered_by_company', 'authority_impounded', 'lost');

ALTER TABLE public.legal_case_litigation_profile
    DROP COLUMN IF EXISTS approved_at,
    DROP COLUMN IF EXISTS approved_by,
    DROP COLUMN IF EXISTS legal_review_status,
    DROP COLUMN IF EXISTS contractual_compensation_document_id,
    DROP COLUMN IF EXISTS contractual_compensation_cap,
    DROP COLUMN IF EXISTS contractual_compensation_rate,
    DROP COLUMN IF EXISTS contractual_compensation_method,
    DROP COLUMN IF EXISTS contractual_compensation_clause_text,
    DROP COLUMN IF EXISTS contractual_compensation_clause_number,
    DROP COLUMN IF EXISTS contractual_compensation_enabled,
    DROP COLUMN IF EXISTS retention_rate_source_document_id,
    DROP COLUMN IF EXISTS vehicle_return_document_id,
    DROP COLUMN IF EXISTS termination_clause_text,
    DROP COLUMN IF EXISTS termination_clause_number,
    DROP COLUMN IF EXISTS notice_exception_document_id,
    DROP COLUMN IF EXISTS notice_exception_clause_or_reason,
    DROP COLUMN IF EXISTS notice_exception_type,
    DROP COLUMN IF EXISTS violations_clause_number,
    DROP COLUMN IF EXISTS return_clause_number,
    DROP COLUMN IF EXISTS payment_clause_number,
    DROP COLUMN IF EXISTS rent_due_day,
    DROP COLUMN IF EXISTS renewed_end_date,
    DROP COLUMN IF EXISTS renewal_applies,
    ADD CONSTRAINT legal_case_litigation_profile_rescission_strategy_check
        CHECK (rescission_strategy IN ('judicial_rescission', 'documented_termination')),
    ADD CONSTRAINT legal_case_litigation_profile_vehicle_custody_check
        CHECK (vehicle_custody IN ('with_defendant', 'returned', 'unknown')),
    ADD CONSTRAINT chk_documented_termination_requires_evidence CHECK (
        rescission_strategy = 'judicial_rescission'
        OR (
            termination_type IS NOT NULL
            AND termination_date IS NOT NULL
            AND termination_supporting_document_id IS NOT NULL
            AND termination_date_status = 'confirmed'
        )
    ),
    ADD CONSTRAINT chk_returned_vehicle_requires_date CHECK (
        vehicle_custody <> 'returned' OR vehicle_returned_at IS NOT NULL
    ),
    ADD CONSTRAINT chk_retention_rate_requires_source CHECK (
        retention_daily_rate IS NULL OR retention_rate_source IS NOT NULL
    );
