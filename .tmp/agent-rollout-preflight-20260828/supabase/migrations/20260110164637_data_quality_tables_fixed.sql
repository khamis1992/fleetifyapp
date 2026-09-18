-- Migration: Data Quality Tables (Fixed)
-- Created: 2026-01-10
-- Description: This migration creates tables to support data quality monitoring
--              and issue tracking for the payment system.

-- =========================================
-- Table: data_quality_issues
-- =========================================
-- Stores identified data quality issues.
CREATE TABLE IF NOT EXISTS public.data_quality_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    entity_type TEXT NOT NULL, -- e.g., 'payment', 'invoice', 'contract', 'customer'
    entity_id UUID NOT NULL,    -- ID of the entity with the issue
    issue_type TEXT NOT NULL,   -- e.g., 'duplicate_record', 'missing_data', 'inconsistent_status', 'overpayment'
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status TEXT NOT NULL DEFAULT 'open',     -- 'open', 'in_progress', 'resolved', 'ignored'
    reported_by UUID, -- Will add FK later after verifying users table structure
    assigned_to UUID, -- Will add FK later after verifying users table structure
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Ensure unique issue for a given entity and type (to prevent spamming issues)
    UNIQUE (company_id, entity_type, entity_id, issue_type)
);

COMMENT ON TABLE public.data_quality_issues IS
    'Tracks data quality issues identified within the system, e.g., duplicate payments, inconsistent statuses.';

COMMENT ON COLUMN public.data_quality_issues.entity_type IS
    'The type of entity (e.g., payment, invoice) that has the data quality issue.';

COMMENT ON COLUMN public.data_quality_issues.entity_id IS
    'The ID of the specific entity record that has the data quality issue.';

COMMENT ON COLUMN public.data_quality_issues.issue_type IS
    'A categorized type of the data quality issue (e.g., duplicate_record, missing_data).';

COMMENT ON COLUMN public.data_quality_issues.severity IS
    'The severity level of the data quality issue (low, medium, high, critical).';

COMMENT ON COLUMN public.data_quality_issues.status IS
    'The current status of the data quality issue (open, in_progress, resolved, ignored).';

-- =========================================
-- Table: data_quality_rules
-- =========================================
-- Stores definitions of data quality rules.
CREATE TABLE IF NOT EXISTS public.data_quality_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID, -- Can be global (NULL) or company-specific
    rule_name TEXT NOT NULL,
    description TEXT,
    entity_type TEXT NOT NULL,
    rule_definition JSONB NOT NULL, -- e.g., { "field": "amount", "operator": ">", "value": 0 }
    is_active BOOLEAN DEFAULT TRUE,
    severity TEXT NOT NULL DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.data_quality_rules IS
    'Defines rules for data quality checks, which can be global or company-specific.';

COMMENT ON COLUMN public.data_quality_rules.rule_definition IS
    'JSONB definition of the rule, e.g., {"field": "amount", "operator": ">", "value": 0}.';

-- =========================================
-- RLS Policies
-- =========================================
-- Enable RLS for data_quality_issues
ALTER TABLE public.data_quality_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable full access for users based on company_id" ON public.data_quality_issues;
CREATE POLICY "Enable full access for users based on company_id" ON public.data_quality_issues
    FOR ALL USING (auth.uid() IN ( SELECT profiles.id FROM profiles WHERE profiles.company_id = data_quality_issues.company_id ));

-- Enable RLS for data_quality_rules
ALTER TABLE public.data_quality_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable full access for users based on company_id or global" ON public.data_quality_rules;
CREATE POLICY "Enable full access for users based on company_id or global" ON public.data_quality_rules
    FOR ALL USING (
        (company_id IS NULL) OR
        (auth.uid() IN ( SELECT profiles.id FROM profiles WHERE profiles.company_id = data_quality_rules.company_id ))
    );

-- =========================================
-- Trigger for updated_at
-- =========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_data_quality_issues_updated_at ON public.data_quality_issues;
CREATE TRIGGER set_data_quality_issues_updated_at
    BEFORE UPDATE ON public.data_quality_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_data_quality_rules_updated_at ON public.data_quality_rules;
CREATE TRIGGER set_data_quality_rules_updated_at
    BEFORE UPDATE ON public.data_quality_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();;
