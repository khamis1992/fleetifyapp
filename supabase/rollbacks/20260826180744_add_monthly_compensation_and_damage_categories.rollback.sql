UPDATE public.legal_case_litigation_profile
SET contractual_compensation_enabled = false,
    contractual_compensation_method = NULL
WHERE contractual_compensation_method = 'monthly';

UPDATE public.legal_case_damage_costs
SET cost_type = 'other'
WHERE cost_type IN ('financing_burden_damage', 'operational_loss');

ALTER TABLE public.legal_case_litigation_profile
    DROP CONSTRAINT IF EXISTS chk_contractual_compensation_evidence,
    ADD CONSTRAINT chk_contractual_compensation_evidence CHECK (
        contractual_compensation_enabled = false
        OR (
            NULLIF(BTRIM(contractual_compensation_clause_number), '') IS NOT NULL
            AND NULLIF(BTRIM(contractual_compensation_clause_text), '') IS NOT NULL
            AND contractual_compensation_method IN ('fixed', 'daily', 'per_invoice')
            AND contractual_compensation_rate > 0
            AND contractual_compensation_document_id IS NOT NULL
        )
    );

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
    ));

COMMENT ON COLUMN public.legal_case_litigation_profile.contractual_compensation_method IS NULL;
COMMENT ON COLUMN public.legal_case_damage_costs.cost_type IS NULL;
