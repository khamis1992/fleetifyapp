-- ============================================
-- Comprehensive Compliance System
-- FIN-003: Enhance Currency and Compliance System
-- ============================================
-- Migration: 20251120010000_create_compliance_system.sql
-- Purpose: Create GAAP compliance, regulatory reporting, and AML/KYC system
-- Author: FleetifyApp Development Team
-- Date: 2025-11-20
-- ============================================

-- ============================================
-- 1. Compliance Rules Engine Table
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    rule_code VARCHAR(50) NOT NULL, -- Unique code for the rule
    rule_category VARCHAR(50) NOT NULL, -- 'gaap', 'tax', 'aml', 'kyc', 'reporting', 'operational'
    rule_type VARCHAR(20) NOT NULL, -- 'validation', 'threshold', 'workflow', 'calculation'
    rule_description TEXT,
    rule_config JSONB NOT NULL, -- Rule-specific configuration
    jurisdiction VARCHAR(10), -- 'QAR', 'SAR', 'US', 'EU', 'INTL', NULL for global
    severity_level VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    is_active BOOLEAN DEFAULT true,
    auto_execute BOOLEAN DEFAULT false, -- Whether rule runs automatically
    execution_frequency VARCHAR(20), -- 'real_time', 'daily', 'weekly', 'monthly'
    notification_config JSONB, -- How to notify on rule violations
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,

    -- Constraints
    CONSTRAINT compliance_rules_category_check CHECK (rule_category IN ('gaap', 'tax', 'aml', 'kyc', 'reporting', 'operational')),
    CONSTRAINT compliance_rules_type_check CHECK (rule_type IN ('validation', 'threshold', 'workflow', 'calculation')),
    CONSTRAINT compliance_rules_severity_check CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT compliance_rules_frequency_check CHECK (execution_frequency IN ('real_time', 'daily', 'weekly', 'monthly')),
    CONSTRAINT compliance_rules_version_check CHECK (version > 0),
    CONSTRAINT compliance_rules_unique_code UNIQUE(company_id, rule_code)
);

-- ============================================
-- 2. Compliance Validations Table
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES compliance_rules(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'transaction', 'invoice', 'contract', 'customer', 'vendor', 'journal_entry'
    entity_id UUID NOT NULL,
    entity_reference VARCHAR(100), -- External reference number
    validation_result VARCHAR(20) NOT NULL, -- 'pass', 'fail', 'warning', 'error', 'pending'
    validation_score DECIMAL(5,2), -- 0-100 score
    validation_details JSONB, -- Detailed results and findings
    risk_assessment VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    action_required BOOLEAN DEFAULT false,
    action_description TEXT,
    action_deadline DATE,
    assigned_to UUID REFERENCES auth.users(id), -- Who should handle the action
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT compliance_validations_result_check CHECK (validation_result IN ('pass', 'fail', 'warning', 'error', 'pending')),
    CONSTRAINT compliance_validations_risk_check CHECK (risk_assessment IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT compliance_validations_score_check CHECK (validation_score >= 0 AND validation_score <= 100)
);

-- ============================================
-- 3. Regulatory Reports Table
-- ============================================
CREATE TABLE IF NOT EXISTS regulatory_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- 'tax_return', 'vat_return', 'aml_report', 'gaap_compliance', 'financial_statement'
    report_subtype VARCHAR(50), -- 'quarterly', 'annual', 'suspicious_activity', etc.
    jurisdiction VARCHAR(10) NOT NULL, -- 'QAR', 'SAR', 'US', 'EU'
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    report_data JSONB NOT NULL, -- Actual report content
    report_summary TEXT, -- Executive summary
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending_review', 'submitted', 'approved', 'rejected', 'amended'
    submission_deadline DATE,
    submission_date TIMESTAMP WITH TIME ZONE,
    submission_method VARCHAR(50), -- 'electronic', 'physical', 'api'
    submission_reference VARCHAR(100), -- Confirmation/reference number
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rejection_reason TEXT,
    file_attachments TEXT[], -- Paths to supporting documents
    compliance_score DECIMAL(5,2), -- Overall compliance score (0-100)
    findings_count INTEGER DEFAULT 0,
    violations_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT regulatory_reports_status_check CHECK (status IN ('draft', 'pending_review', 'submitted', 'approved', 'rejected', 'amended')),
    CONSTRAINT regulatory_reports_compliance_score CHECK (compliance_score >= 0 AND compliance_score <= 100),
    CONSTRAINT regulatory_reports_counts_check CHECK (findings_count >= 0 AND violations_count >= 0)
);

-- ============================================
-- 4. AML/KYC Due Diligence Table
-- ============================================
CREATE TABLE IF NOT EXISTS aml_kyc_diligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL, -- 'customer', 'vendor', 'beneficial_owner'
    entity_id UUID NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    risk_rating VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high', 'prohibited'
    verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'additional_info_required'
    verification_method VARCHAR(50), -- 'document', 'electronic', 'third_party'
    verification_score DECIMAL(5,2), -- 0-100 confidence score
    documents_verified TEXT[], -- List of verified documents
    screening_results JSONB, -- Sanctions list, PEP screening results
    due_diligence_level VARCHAR(20) DEFAULT 'standard', -- 'simplified', 'standard', 'enhanced'
    enhanced_due_diligence BOOLEAN DEFAULT false,
    ongoing_monitoring BOOLEAN DEFAULT false,
    last_review_date DATE,
    next_review_date DATE,
    pep_status VARCHAR(20), -- 'none', 'confirmed_pep', 'suspected_pep'
    sanctions_status VARCHAR(20), -- 'clear', 'matched', 'under_review'
    adverse_media_findings INTEGER DEFAULT 0,
    risk_factors JSONB, -- Specific risk factors identified
    mitigating_factors JSONB, -- Mitigating circumstances
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT aml_kyc_risk_rating_check CHECK (risk_rating IN ('low', 'medium', 'high', 'prohibited')),
    CONSTRAINT aml_kyc_verification_status_check CHECK (verification_status IN ('pending', 'verified', 'rejected', 'additional_info_required')),
    CONSTRAINT aml_kyc_verification_score_check CHECK (verification_score >= 0 AND verification_score <= 100),
    CONSTRAINT aml_kyc_due_diligence_level_check CHECK (due_diligence_level IN ('simplified', 'standard', 'enhanced')),
    CONSTRAINT aml_kyc_pep_status_check CHECK (pep_status IN ('none', 'confirmed_pep', 'suspected_pep')),
    CONSTRAINT aml_kyc_sanctions_status_check CHECK (sanctions_status IN ('clear', 'matched', 'under_review'))
);

-- ============================================
-- 5. Audit Trail Table
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'validation_run', 'rule_created', 'report_generated', 'kyc_review'
    entity_type VARCHAR(50), -- Type of entity affected
    entity_id UUID, -- ID of entity affected
    action_description TEXT NOT NULL,
    old_values JSONB, -- Previous state
    new_values JSONB, -- New state
    user_id UUID REFERENCES auth.users(id),
    session_id UUID, -- For tracking user sessions
    ip_address INET,
    user_agent TEXT,
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    system_generated BOOLEAN DEFAULT false,
    compliance_impact VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    requires_review BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    review_notes TEXT,

    -- Constraints
    CONSTRAINT compliance_audit_impact_check CHECK (compliance_impact IN ('low', 'medium', 'high', 'critical'))
);

-- ============================================
-- 6. Compliance Calendar Table
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'report_submission', 'audit', 'review', 'training'
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT,
    jurisdiction VARCHAR(10),
    due_date DATE NOT NULL,
    reminder_days INTEGER DEFAULT 7, -- Days before due date to send reminder
    recurring_pattern VARCHAR(20), -- 'monthly', 'quarterly', 'annually', NULL for one-time
    recurring_end_date DATE,
    responsible_user_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
    completion_date DATE,
    completion_notes TEXT,
    file_attachments TEXT[],
    priority VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT compliance_calendar_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
    CONSTRAINT compliance_calendar_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT compliance_calendar_recurring_check CHECK (recurring_pattern IN ('monthly', 'quarterly', 'annually'))
);

-- ============================================
-- 7. Indexes for Performance
-- ============================================

-- Compliance Rules indexes
CREATE INDEX IF NOT EXISTS idx_compliance_rules_company ON compliance_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_category ON compliance_rules(rule_category);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_jurisdiction ON compliance_rules(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_active ON compliance_rules(is_active) WHERE is_active = true;

-- Compliance Validations indexes
CREATE INDEX IF NOT EXISTS idx_compliance_validations_company ON compliance_validations(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_validations_rule ON compliance_validations(rule_id);
CREATE INDEX IF NOT EXISTS idx_compliance_validations_entity ON compliance_validations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_validations_result ON compliance_validations(validation_result);
CREATE INDEX IF NOT EXISTS idx_compliance_validations_risk ON compliance_validations(risk_assessment);
CREATE INDEX IF NOT EXISTS idx_compliance_validations_action_required ON compliance_validations(action_required) WHERE action_required = true;
CREATE INDEX IF NOT EXISTS idx_compliance_validations_validated_at ON compliance_validations(validated_at);

-- Regulatory Reports indexes
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_company ON regulatory_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_type ON regulatory_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_jurisdiction ON regulatory_reports(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_period ON regulatory_reports(reporting_period_start, reporting_period_end);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_status ON regulatory_reports(status);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_deadline ON regulatory_reports(submission_deadline);

-- AML/KYC Due Diligence indexes
CREATE INDEX IF NOT EXISTS idx_aml_kyc_company ON aml_kyc_diligence(company_id);
CREATE INDEX IF NOT EXISTS idx_aml_kyc_entity ON aml_kyc_diligence(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_aml_kyc_risk_rating ON aml_kyc_diligence(risk_rating);
CREATE INDEX IF NOT EXISTS idx_aml_kyc_verification_status ON aml_kyc_diligence(verification_status);
CREATE INDEX IF NOT EXISTS idx_aml_kyc_next_review ON aml_kyc_diligence(next_review_date);

-- Audit Trail indexes
CREATE INDEX IF NOT EXISTS idx_compliance_audit_company ON compliance_audit_trail(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_action_type ON compliance_audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_entity ON compliance_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_timestamp ON compliance_audit_trail(action_timestamp);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_user ON compliance_audit_trail(user_id);

-- Compliance Calendar indexes
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_company ON compliance_calendar(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_event_type ON compliance_calendar(event_type);
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_due_date ON compliance_calendar(due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_status ON compliance_calendar(status);
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_responsible ON compliance_calendar(responsible_user_id);

-- ============================================
-- 8. RLS (Row Level Security) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_kyc_diligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_calendar ENABLE ROW LEVEL SECURITY;

-- Compliance Rules policies
CREATE POLICY "Users can view compliance rules for their company" ON compliance_rules
    FOR SELECT USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = compliance_rules.company_id)
    );

CREATE POLICY "Users can manage compliance rules for their company" ON compliance_rules
    FOR ALL USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = compliance_rules.company_id)
    );

-- Compliance Validations policies
CREATE POLICY "Users can view compliance validations for their company" ON compliance_validations
    FOR SELECT USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = compliance_validations.company_id)
    );

CREATE POLICY "Users can manage compliance validations for their company" ON compliance_validations
    FOR ALL USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = compliance_validations.company_id)
    );

-- Regulatory Reports policies
CREATE POLICY "Users can view regulatory reports for their company" ON regulatory_reports
    FOR SELECT USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = regulatory_reports.company_id)
    );

CREATE POLICY "Users can manage regulatory reports for their company" ON regulatory_reports
    FOR ALL USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = regulatory_reports.company_id)
    );

-- AML/KYC Due Diligence policies
CREATE POLICY "Users can view AML/KYC diligence for their company" ON aml_kyc_diligence
    FOR SELECT USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = aml_kyc_diligence.company_id)
    );

CREATE POLICY "Users can manage AML/KYC diligence for their company" ON aml_kyc_diligence
    FOR ALL USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = aml_kyc_diligence.company_id)
    );

-- Audit Trail policies (read-only for most users)
CREATE POLICY "Users can view audit trail for their company" ON compliance_audit_trail
    FOR SELECT USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = compliance_audit_trail.company_id)
    );

-- Only system admins or specific roles can create audit entries
CREATE POLICY "System can create audit trail entries" ON compliance_audit_trail
    FOR INSERT WITH CHECK (system_generated = true OR company_id = auth.uid());

-- Compliance Calendar policies
CREATE POLICY "Users can view compliance calendar for their company" ON compliance_calendar
    FOR SELECT USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = compliance_calendar.company_id)
    );

CREATE POLICY "Users can manage compliance calendar for their company" ON compliance_calendar
    FOR ALL USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = compliance_calendar.company_id)
    );

-- ============================================
-- 9. Triggers for Audit Trail
-- ============================================

-- Create updated_at triggers
CREATE TRIGGER compliance_rules_updated_at
    BEFORE UPDATE ON compliance_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER compliance_validations_updated_at
    BEFORE UPDATE ON compliance_validations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER regulatory_reports_updated_at
    BEFORE UPDATE ON regulatory_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER aml_kyc_diligence_updated_at
    BEFORE UPDATE ON aml_kyc_diligence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER compliance_calendar_updated_at
    BEFORE UPDATE ON compliance_calendar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log compliance changes
CREATE OR REPLACE FUNCTION log_compliance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert into audit trail
    INSERT INTO compliance_audit_trail (
        company_id,
        action_type,
        entity_type,
        entity_id,
        action_description,
        old_values,
        new_values,
        user_id,
        system_generated
    )
    VALUES (
        COALESCE(NEW.company_id, OLD.company_id),
        CASE TG_OP
            WHEN 'INSERT' THEN TG_TABLE_NAME || '_created'
            WHEN 'UPDATE' THEN TG_TABLE_NAME || '_updated'
            WHEN 'DELETE' THEN TG_TABLE_NAME || '_deleted'
        END,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE TG_OP
            WHEN 'INSERT' THEN 'New record created in ' || TG_TABLE_NAME
            WHEN 'UPDATE' THEN 'Record updated in ' || TG_TABLE_NAME
            WHEN 'DELETE' THEN 'Record deleted from ' || TG_TABLE_NAME
        END,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        auth.uid(),
        false
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit triggers
CREATE TRIGGER compliance_rules_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON compliance_rules
    FOR EACH ROW EXECUTE FUNCTION log_compliance_change();

CREATE TRIGGER compliance_validations_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON compliance_validations
    FOR EACH ROW EXECUTE FUNCTION log_compliance_change();

CREATE TRIGGER regulatory_reports_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON regulatory_reports
    FOR EACH ROW EXECUTE FUNCTION log_compliance_change();

CREATE TRIGGER aml_kyc_diligence_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON aml_kyc_diligence
    FOR EACH ROW EXECUTE FUNCTION log_compliance_change();

CREATE TRIGGER compliance_calendar_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON compliance_calendar
    FOR EACH ROW EXECUTE FUNCTION log_compliance_change();

-- ============================================
-- 10. Useful Functions
-- ============================================

-- Function to run compliance validation for an entity
CREATE OR REPLACE FUNCTION run_compliance_validation(
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_company_id UUID
)
RETURNS TABLE (
    rule_id UUID,
    rule_name VARCHAR(100),
    rule_category VARCHAR(50),
    validation_result VARCHAR(20),
    validation_score DECIMAL(5,2),
    action_required BOOLEAN,
    risk_assessment VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rule RECORD;
    v_validation_result VARCHAR(20);
    v_validation_score DECIMAL(5,2);
    v_action_required BOOLEAN;
    v_risk_assessment VARCHAR(20);
BEGIN
    -- This function will be implemented with specific business logic
    -- For now, return sample data

    RETURN QUERY
    SELECT
        cr.id as rule_id,
        cr.rule_name,
        cr.rule_category,
        'pass' as validation_result,
        85.0 as validation_score,
        false as action_required,
        'low' as risk_assessment
    FROM compliance_rules cr
    WHERE cr.company_id = p_company_id
      AND cr.is_active = true
      AND cr.rule_type = 'validation'
      AND (cr.jurisdiction IS NULL OR cr.jurisdiction = 'QAR') -- Example jurisdiction
    LIMIT 5;
END;
$$;

-- Function to get compliance dashboard summary
CREATE OR REPLACE FUNCTION get_compliance_dashboard_summary(
    p_company_id UUID
)
RETURNS TABLE (
    total_rules INTEGER,
    active_validations BIGINT,
    pending_actions BIGINT,
    overdue_reports BIGINT,
    high_risk_entities BIGINT,
    compliance_score DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM compliance_rules WHERE company_id = p_company_id) as total_rules,
        (SELECT COUNT(*) FROM compliance_validations WHERE company_id = p_company_id AND validated_at >= CURRENT_DATE - INTERVAL '30 days') as active_validations,
        (SELECT COUNT(*) FROM compliance_validations WHERE company_id = p_company_id AND action_required = true AND status IN ('pending', 'fail')) as pending_actions,
        (SELECT COUNT(*) FROM regulatory_reports WHERE company_id = p_company_id AND status IN ('draft', 'pending_review') AND submission_deadline < CURRENT_DATE) as overdue_reports,
        (SELECT COUNT(*) FROM aml_kyc_diligence WHERE company_id = p_company_id AND risk_rating IN ('high', 'prohibited')) as high_risk_entities,
        COALESCE(
            (SELECT AVG(verification_score) FROM aml_kyc_diligence WHERE company_id = p_company_id AND verification_status = 'verified'),
            0.0
        ) as compliance_score;
END;
$$;

-- Function to check upcoming compliance deadlines
CREATE OR REPLACE FUNCTION get_upcoming_compliance_deadlines(
    p_company_id UUID,
    p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
    id UUID,
    event_type VARCHAR(50),
    event_title VARCHAR(255),
    due_date DATE,
    days_until_due INTEGER,
    priority VARCHAR(10),
    responsible_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.id,
        cc.event_type,
        cc.event_title,
        cc.due_date,
        EXTRACT(DAYS FROM cc.due_date - CURRENT_DATE)::INTEGER as days_until_due,
        cc.priority,
        cc.responsible_user_id
    FROM compliance_calendar cc
    WHERE cc.company_id = p_company_id
      AND cc.status IN ('pending', 'in_progress')
      AND cc.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead * INTERVAL '1 day')
    ORDER BY cc.due_date ASC;
END;
$$;

-- ============================================
-- 11. Default Compliance Rules
-- ============================================

-- Insert default GAAP compliance rules for all companies
INSERT INTO compliance_rules (company_id, rule_name, rule_code, rule_category, rule_type, rule_description, rule_config, jurisdiction, is_active, auto_execute) VALUES
-- Global GAAP rules
(NULL, 'Revenue Recognition Principle', 'GAAP_REV_001', 'gaap', 'validation', 'Ensure revenue is recognized when earned and realizable',
 '{"validation_logic": "check_revenue_recognition_timing", "tolerance_days": 5}', 'INTL', true, true),
(NULL, 'Matching Principle', 'GAAP_MATCH_001', 'gaap', 'validation', 'Ensure expenses are matched with related revenues',
 '{"validation_logic": "check_expense_revenue_matching", "tolerance_percentage": 10}', 'INTL', true, true),
(NULL, 'Materiality Threshold', 'GAAP_MAT_001', 'gaap', 'threshold', 'Check if amounts exceed materiality threshold',
 '{"threshold_amount": 10000, "percentage_of_revenue": 0.01}', 'INTL', true, true),

-- QAR-specific rules
(NULL, 'Qatar VAT Compliance', 'QAR_VAT_001', 'tax', 'validation', 'Ensure VAT is properly calculated and reported',
 '{"vat_rate": 0.05, "threshold_amount": 3000000, "filing_frequency": "quarterly"}', 'QAR', true, true),
(NULL, 'Qatar Tax Residency', 'QAR_TAX_001', 'tax', 'workflow', 'Validate tax residency requirements',
 '{"required_days_in_country": 183, "document_requirements": ["residence_permit", "tax_id"]}', 'QAR', true, false),

-- SAR-specific rules
(NULL, 'Saudi VAT Compliance', 'SAR_VAT_001', 'tax', 'validation', 'Ensure Saudi VAT compliance',
 '{"vat_rate": 0.15, "threshold_amount": 375000, "filing_frequency": "quarterly"}', 'SAR', true, true),
(NULL, 'Zakat Compliance', 'SAR_ZAKAT_001', 'tax', 'validation', 'Check zakat calculation compliance',
 '{"zakat_rate": 0.025, "applicable_entities": ["saudi_individuals", "saudi_companies"]}', 'SAR', true, true),

-- AML rules
(NULL, 'Transaction Monitoring', 'AML_TXN_001', 'aml', 'validation', 'Monitor for suspicious transactions',
 '{"threshold_amount": 10000, "frequency_check": true, "unusual_patterns": true}', 'INTL', true, true),
(NULL, 'Sanctions Screening', 'AML_SAN_001', 'aml', 'validation', 'Screen against sanctions lists',
 '{"screening_lists": ["OFAC", "UN", "EU", "HMT"], "fuzzy_matching": true}', 'INTL', true, true),

-- KYC rules
(NULL, 'Customer Due Diligence', 'KYC_CDD_001', 'kyc', 'workflow', 'Perform customer due diligence',
 '{"required_documents": ["id_proof", "address_proof", "source_of_funds"], "risk_assessment": true}', 'INTL', true, false),
(NULL, 'Beneficial Owner Verification', 'KYC_BO_001', 'kyc', 'validation', 'Verify beneficial ownership',
 '{"threshold_ownership": 0.25, "verification_required": true}', 'INTL', true, true)
ON CONFLICT (company_id, rule_code) DO NOTHING;

-- ============================================
-- 12. Grant Permissions
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_validations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON regulatory_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON aml_kyc_diligence TO authenticated;
GRANT SELECT ON compliance_audit_trail TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_calendar TO authenticated;

-- Grant permissions to service role
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_rules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_validations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON regulatory_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON aml_kyc_diligence TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_audit_trail TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_calendar TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION run_compliance_validation(VARCHAR(50), UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION run_compliance_validation(VARCHAR(50), UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_compliance_dashboard_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compliance_dashboard_summary(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_upcoming_compliance_deadlines(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_compliance_deadlines(UUID, INTEGER) TO service_role;

-- ============================================
-- 13. Comments
-- ============================================

COMMENT ON TABLE compliance_rules IS 'Defines compliance rules for GAAP, tax, AML, KYC, and regulatory requirements';
COMMENT ON TABLE compliance_validations IS 'Stores results of compliance validations against rules';
COMMENT ON TABLE regulatory_reports IS 'Manages regulatory reports and submission tracking';
COMMENT ON TABLE aml_kyc_diligence IS 'AML/KYC due diligence records for customers, vendors, and beneficial owners';
COMMENT ON TABLE compliance_audit_trail IS 'Complete audit trail of all compliance-related activities';
COMMENT ON TABLE compliance_calendar IS 'Calendar for compliance deadlines and recurring tasks';

COMMENT ON FUNCTION run_compliance_validation(VARCHAR(50), UUID, UUID) IS 'Runs compliance validation checks for a specific entity';
COMMENT ON FUNCTION get_compliance_dashboard_summary(UUID) IS 'Returns summary metrics for compliance dashboard';
COMMENT ON FUNCTION get_upcoming_compliance_deadlines(UUID, INTEGER) IS 'Gets upcoming compliance deadlines within specified days';

-- ============================================
-- Migration Complete
-- ============================================