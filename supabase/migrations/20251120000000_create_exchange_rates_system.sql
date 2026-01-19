-- ============================================
-- Multi-Currency Exchange Rate Management System
-- FIN-003: Enhance Currency and Compliance System
-- ============================================
-- Migration: 20251120000000_create_exchange_rates_system.sql
-- Purpose: Create comprehensive exchange rate management
-- Author: FleetifyApp Development Team
-- Date: 2025-11-20
-- ============================================

-- ============================================
-- 1. Exchange Rates Table
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(20,10) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'fixer_io', 'exchangerate_api', 'manual', 'calculation'
    effective_date DATE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    -- Constraints
    CONSTRAINT exchange_rates_from_to_check CHECK (from_currency != to_currency),
    CONSTRAINT exchange_rates_rate_positive CHECK (rate > 0),
    CONSTRAINT exchange_rates_unique_from_to_date UNIQUE(from_currency, to_currency, effective_date, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

-- ============================================
-- 2. Currency Exposure Tracking Table
-- ============================================
CREATE TABLE IF NOT EXISTS currency_exposure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    exposure_amount DECIMAL(20,2) NOT NULL,
    exposure_type VARCHAR(20) NOT NULL, -- 'receivable', 'payable', 'investment', 'loan'
    base_currency_amount DECIMAL(20,2),
    exchange_rate_at_creation DECIMAL(20,10),
    risk_level VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    hedged_amount DECIMAL(20,2) DEFAULT 0,
    hedging_instrument VARCHAR(50), -- 'forward', 'option', 'swap', 'natural'
    entity_type VARCHAR(50), -- 'invoice', 'contract', 'payment', 'investment'
    entity_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT currency_exposure_amount_check CHECK (exposure_amount != 0),
    CONSTRAINT currency_exposure_type_check CHECK (exposure_type IN ('receivable', 'payable', 'investment', 'loan')),
    CONSTRAINT currency_exposure_risk_check CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT currency_exposure_hedged_check CHECK (hedged_amount >= 0 AND hedged_amount <= ABS(exposure_amount))
);

-- ============================================
-- 3. Exchange Rate History Table (for audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_rate_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_rate_id UUID REFERENCES exchange_rates(id) ON DELETE CASCADE,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    old_rate DECIMAL(20,10),
    new_rate DECIMAL(20,10) NOT NULL,
    change_type VARCHAR(20) NOT NULL, -- 'create', 'update', 'expire'
    reason TEXT,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE
);

-- ============================================
-- 4. Currency Configuration Table
-- ============================================
CREATE TABLE IF NOT EXISTS currency_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'QAR',
    supported_currencies TEXT[] NOT NULL DEFAULT '{QAR,KWD,SAR,AED,USD,EUR}',
    auto_update_rates BOOLEAN DEFAULT true,
    rate_update_frequency VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
    preferred_rate_provider VARCHAR(50) DEFAULT 'fixer_io',
    rate_tolerance_percentage DECIMAL(5,2) DEFAULT 2.00, -- Acceptable rate variance
    last_rate_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT currency_config_base_check CHECK (base_currency != ''),
    CONSTRAINT currency_config_frequency_check CHECK (rate_update_frequency IN ('hourly', 'daily', 'weekly')),
    CONSTRAINT currency_config_tolerance_check CHECK (rate_tolerance_percentage >= 0 AND rate_tolerance_percentage <= 100)
);

-- ============================================
-- 5. Indexes for Performance
-- ============================================

-- Exchange Rates indexes
CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_to ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_effective_date ON exchange_rates(effective_date);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_active ON exchange_rates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_exchange_rates_company ON exchange_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_source ON exchange_rates(source);

-- Currency Exposure indexes
CREATE INDEX IF NOT EXISTS idx_currency_exposure_company ON currency_exposure(company_id);
CREATE INDEX IF NOT EXISTS idx_currency_exposure_currency ON currency_exposure(currency);
CREATE INDEX IF NOT EXISTS idx_currency_exposure_type ON currency_exposure(exposure_type);
CREATE INDEX IF NOT EXISTS idx_currency_exposure_risk_level ON currency_exposure(risk_level);
CREATE INDEX IF NOT EXISTS idx_currency_exposure_entity ON currency_exposure(entity_type, entity_id);

-- Exchange Rate History indexes
CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_exchange_id ON exchange_rate_history(exchange_rate_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_changed_at ON exchange_rate_history(changed_at);

-- Currency Configuration indexes
CREATE INDEX IF NOT EXISTS idx_currency_config_company ON currency_configurations(company_id);

-- ============================================
-- 6. RLS (Row Level Security) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_exposure ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_configurations ENABLE ROW LEVEL SECURITY;

-- Exchange Rates policies
CREATE POLICY "Users can view exchange rates for their company" ON exchange_rates
    FOR SELECT USING (
        company_id IS NULL OR
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = exchange_rates.company_id)
    );

CREATE POLICY "Users can insert exchange rates for their company" ON exchange_rates
    FOR INSERT WITH CHECK (
        company_id IS NULL OR
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = exchange_rates.company_id)
    );

CREATE POLICY "Users can update exchange rates for their company" ON exchange_rates
    FOR UPDATE USING (
        company_id IS NULL OR
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = exchange_rates.company_id)
    );

-- Currency Exposure policies
CREATE POLICY "Users can view currency exposure for their company" ON currency_exposure
    FOR SELECT USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = currency_exposure.company_id)
    );

CREATE POLICY "Users can manage currency exposure for their company" ON currency_exposure
    FOR ALL USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = currency_exposure.company_id)
    );

-- Exchange Rate History policies
CREATE POLICY "Users can view exchange rate history" ON exchange_rate_history
    FOR SELECT USING (
        company_id IS NULL OR
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = exchange_rate_history.company_id)
    );

-- Currency Configuration policies
CREATE POLICY "Users can view currency config for their company" ON currency_configurations
    FOR SELECT USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = currency_configurations.company_id)
    );

CREATE POLICY "Users can manage currency config for their company" ON currency_configurations
    FOR ALL USING (
        company_id = auth.uid() OR
        auth.uid() IN (SELECT user_id FROM user_permissions WHERE company_id = currency_configurations.company_id)
    );

-- ============================================
-- 7. Triggers for Audit Trail
-- ============================================

-- Function to log exchange rate changes
CREATE OR REPLACE FUNCTION log_exchange_rate_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert into history table
    INSERT INTO exchange_rate_history (
        exchange_rate_id,
        from_currency,
        to_currency,
        old_rate,
        new_rate,
        change_type,
        changed_by,
        company_id
    )
    VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.from_currency, OLD.from_currency),
        COALESCE(NEW.to_currency, OLD.to_currency),
        OLD.rate,
        NEW.rate,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'create'
            WHEN TG_OP = 'UPDATE' THEN 'update'
            WHEN TG_OP = 'DELETE' THEN 'delete'
        END,
        auth.uid(),
        COALESCE(NEW.company_id, OLD.company_id)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
CREATE TRIGGER exchange_rate_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON exchange_rates
    FOR EACH ROW EXECUTE FUNCTION log_exchange_rate_change();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create updated_at triggers
CREATE TRIGGER exchange_rates_updated_at
    BEFORE UPDATE ON exchange_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER currency_exposure_updated_at
    BEFORE UPDATE ON currency_exposure
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER currency_configurations_updated_at
    BEFORE UPDATE ON currency_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. Useful Functions
-- ============================================

-- Function to get current exchange rate
CREATE OR REPLACE FUNCTION get_current_exchange_rate(
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3),
    p_company_id UUID DEFAULT NULL
)
RETURNS DECIMAL(20,10)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rate DECIMAL(20,10);
    v_inverted_rate DECIMAL(20,10);
BEGIN
    -- Try to get direct rate
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = p_from_currency
      AND to_currency = p_to_currency
      AND effective_date <= CURRENT_DATE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
      AND (company_id = p_company_id OR company_id IS NULL)
    ORDER BY effective_date DESC, company_id NULL LAST
    LIMIT 1;

    -- If direct rate found, return it
    IF v_rate IS NOT NULL THEN
        RETURN v_rate;
    END IF;

    -- Try to get inverted rate (calculate 1/rate)
    SELECT rate INTO v_inverted_rate
    FROM exchange_rates
    WHERE from_currency = p_to_currency
      AND to_currency = p_from_currency
      AND effective_date <= CURRENT_DATE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
      AND (company_id = p_company_id OR company_id IS NULL)
    ORDER BY effective_date DESC, company_id NULL LAST
    LIMIT 1;

    -- If inverted rate found, return its reciprocal
    IF v_inverted_rate IS NOT NULL THEN
        RETURN 1.0 / v_inverted_rate;
    END IF;

    -- Try to get rate via base currency (USD as intermediary)
    -- For example: KWD -> EUR via KWD -> USD -> EUR

    -- Get KWD -> USD rate
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = p_from_currency
      AND to_currency = 'USD'
      AND effective_date <= CURRENT_DATE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
      AND (company_id = p_company_id OR company_id IS NULL)
    ORDER BY effective_date DESC, company_id NULL LAST
    LIMIT 1;

    -- Get USD -> p_to_currency rate
    SELECT rate INTO v_inverted_rate
    FROM exchange_rates
    WHERE from_currency = 'USD'
      AND to_currency = p_to_currency
      AND effective_date <= CURRENT_DATE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
      AND (company_id = p_company_id OR company_id IS NULL)
    ORDER BY effective_date DESC, company_id NULL LAST
    LIMIT 1;

    -- If both rates found, return the product
    IF v_rate IS NOT NULL AND v_inverted_rate IS NOT NULL THEN
        RETURN v_rate * v_inverted_rate;
    END IF;

    -- If no rate found, raise exception
    RAISE EXCEPTION 'No exchange rate found for % to %', p_from_currency, p_to_currency;
END;
$$;

-- Function to convert amount between currencies
CREATE OR REPLACE FUNCTION convert_currency(
    p_amount DECIMAL(20,2),
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3),
    p_company_id UUID DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(20,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rate DECIMAL(20,10);
    v_historical_rate DECIMAL(20,10);
BEGIN
    -- If same currency, return amount as is
    IF p_from_currency = p_to_currency THEN
        RETURN p_amount;
    END IF;

    -- Get historical rate for specific date
    SELECT rate INTO v_historical_rate
    FROM exchange_rates
    WHERE from_currency = p_from_currency
      AND to_currency = p_to_currency
      AND effective_date <= p_date
      AND (expires_at IS NULL OR expires_at > NOW())
      AND is_active = true
      AND (company_id = p_company_id OR company_id IS NULL)
    ORDER BY effective_date DESC, company_id NULL LAST
    LIMIT 1;

    -- If historical rate found, use it
    IF v_historical_rate IS NOT NULL THEN
        RETURN ROUND(p_amount * v_historical_rate, 2);
    END IF;

    -- Otherwise, use current rate
    v_rate := get_current_exchange_rate(p_from_currency, p_to_currency, p_company_id);
    RETURN ROUND(p_amount * v_rate, 2);
END;
$$;

-- Function to calculate currency exposure for a company
CREATE OR REPLACE FUNCTION calculate_currency_exposure(
    p_company_id UUID
)
RETURNS TABLE (
    currency VARCHAR(3),
    total_exposure DECIMAL(20,2),
    receivables DECIMAL(20,2),
    payables DECIMAL(20,2),
    investments DECIMAL(20,2),
    loans DECIMAL(20,2),
    hedged_amount DECIMAL(20,2),
    net_exposure DECIMAL(20,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.currency,
        SUM(ABS(ce.exposure_amount)) as total_exposure,
        SUM(CASE WHEN ce.exposure_type = 'receivable' THEN ce.exposure_amount ELSE 0 END) as receivables,
        SUM(CASE WHEN ce.exposure_type = 'payable' THEN ce.exposure_amount ELSE 0 END) as payables,
        SUM(CASE WHEN ce.exposure_type = 'investment' THEN ce.exposure_amount ELSE 0 END) as investments,
        SUM(CASE WHEN ce.exposure_type = 'loan' THEN ce.exposure_amount ELSE 0 END) as loans,
        SUM(ce.hedged_amount) as hedged_amount,
        SUM(
            CASE WHEN ce.exposure_type IN ('receivable', 'investment') THEN ce.exposure_amount ELSE -ce.exposure_amount END
        ) - SUM(ce.hedged_amount) as net_exposure
    FROM currency_exposure ce
    WHERE ce.company_id = p_company_id
    GROUP BY ce.currency
    ORDER BY total_exposure DESC;
END;
$$;

-- ============================================
-- 9. Initial Data Setup
-- ============================================

-- Insert default currency configurations for existing companies
INSERT INTO currency_configurations (company_id, base_currency, supported_currencies)
SELECT
    id as company_id,
    'QAR' as base_currency,
    '{QAR,KWD,SAR,AED,USD,EUR}' as supported_currencies
FROM companies
WHERE id NOT IN (SELECT company_id FROM currency_configurations);

-- Insert some common exchange rates (these will be updated by API)
INSERT INTO exchange_rates (from_currency, to_currency, rate, source, effective_date, company_id) VALUES
-- Base rates (company_id = NULL for global rates)
('USD', 'EUR', 0.85, 'manual', CURRENT_DATE, NULL),
('USD', 'GBP', 0.73, 'manual', CURRENT_DATE, NULL),
('USD', 'QAR', 3.64, 'manual', CURRENT_DATE, NULL),
('USD', 'SAR', 3.75, 'manual', CURRENT_DATE, NULL),
('USD', 'KWD', 0.31, 'manual', CURRENT_DATE, NULL),
('USD', 'AED', 3.67, 'manual', CURRENT_DATE, NULL),
('EUR', 'USD', 1.18, 'manual', CURRENT_DATE, NULL),
('GBP', 'USD', 1.37, 'manual', CURRENT_DATE, NULL),
('QAR', 'USD', 0.27, 'manual', CURRENT_DATE, NULL),
('SAR', 'USD', 0.27, 'manual', CURRENT_DATE, NULL),
('KWD', 'USD', 3.23, 'manual', CURRENT_DATE, NULL),
('AED', 'USD', 0.27, 'manual', CURRENT_DATE, NULL)
ON CONFLICT (from_currency, to_currency, effective_date, company_id) DO NOTHING;

-- ============================================
-- 10. Grant Permissions
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON exchange_rates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON currency_exposure TO authenticated;
GRANT SELECT ON exchange_rate_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON currency_configurations TO authenticated;

-- Grant permissions to service role
GRANT SELECT, INSERT, UPDATE, DELETE ON exchange_rates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON currency_exposure TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON exchange_rate_history TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON currency_configurations TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_current_exchange_rate(VARCHAR(3), VARCHAR(3), UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_exchange_rate(VARCHAR(3), VARCHAR(3), UUID) TO service_role;
GRANT EXECUTE ON FUNCTION convert_currency(DECIMAL(20,2), VARCHAR(3), VARCHAR(3), UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION convert_currency(DECIMAL(20,2), VARCHAR(3), VARCHAR(3), UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_currency_exposure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_currency_exposure(UUID) TO service_role;

-- ============================================
-- 11. Comments
-- ============================================

COMMENT ON TABLE exchange_rates IS 'Stores exchange rates between currencies with historical tracking';
COMMENT ON TABLE currency_exposure IS 'Tracks company currency exposure by type (receivables, payables, etc.)';
COMMENT ON TABLE exchange_rate_history IS 'Audit trail for all exchange rate changes';
COMMENT ON TABLE currency_configurations IS 'Company-specific currency settings and preferences';

COMMENT ON FUNCTION get_current_exchange_rate(VARCHAR(3), VARCHAR(3), UUID) IS 'Returns current exchange rate between two currencies';
COMMENT ON FUNCTION convert_currency(DECIMAL(20,2), VARCHAR(3), VARCHAR(3), UUID, DATE) IS 'Converts amount from one currency to another';
COMMENT ON FUNCTION calculate_currency_exposure(UUID) IS 'Calculates detailed currency exposure for a company';

-- ============================================
-- Migration Complete
-- ============================================