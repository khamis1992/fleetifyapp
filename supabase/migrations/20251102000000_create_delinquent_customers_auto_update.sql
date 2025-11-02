-- ================================================================
-- AUTO-UPDATE DELINQUENT CUSTOMERS TABLE
-- ================================================================
-- Purpose: Create table and cron job to automatically update delinquent customers
-- Features:
--   1. Table to store delinquent customers data
--   2. Function to calculate and update delinquent customers
--   3. Daily cron job at 9 AM to refresh the table
-- Date: 2025-11-02
-- ================================================================

-- ================================================================
-- STEP 1: Create Delinquent Customers Table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.delinquent_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Customer Info
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_code TEXT,
    customer_type TEXT CHECK (customer_type IN ('individual', 'corporate')),
    phone TEXT,
    email TEXT,
    credit_limit NUMERIC(15, 3) DEFAULT 0,
    is_blacklisted BOOLEAN DEFAULT false,
    
    -- Contract Info
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    contract_number TEXT NOT NULL,
    contract_start_date DATE NOT NULL,
    monthly_rent NUMERIC(15, 3) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    vehicle_plate TEXT,
    
    -- Payment Status
    months_unpaid INTEGER DEFAULT 0,
    overdue_amount NUMERIC(15, 3) DEFAULT 0,
    last_payment_date DATE,
    last_payment_amount NUMERIC(15, 3) DEFAULT 0,
    actual_payments_count INTEGER DEFAULT 0,
    expected_payments_count INTEGER DEFAULT 0,
    
    -- Penalties
    days_overdue INTEGER DEFAULT 0,
    late_penalty NUMERIC(15, 3) DEFAULT 0,
    
    -- Traffic Violations
    violations_count INTEGER DEFAULT 0,
    violations_amount NUMERIC(15, 3) DEFAULT 0,
    
    -- Total Debt
    total_debt NUMERIC(15, 3) DEFAULT 0,
    
    -- Risk Assessment
    risk_score NUMERIC(5, 2) DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level TEXT CHECK (risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MONITOR')),
    risk_level_en TEXT,
    risk_color TEXT,
    recommended_action TEXT,
    
    -- Legal History
    has_previous_legal_cases BOOLEAN DEFAULT false,
    previous_legal_cases_count INTEGER DEFAULT 0,
    
    -- Metadata
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure unique customer-contract combination per company
    CONSTRAINT unique_customer_contract UNIQUE (company_id, customer_id, contract_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_company ON delinquent_customers(company_id);
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_customer ON delinquent_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_contract ON delinquent_customers(contract_id);
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_risk_score ON delinquent_customers(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_days_overdue ON delinquent_customers(days_overdue DESC);
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_is_active ON delinquent_customers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_risk_level ON delinquent_customers(risk_level);

-- Enable Row Level Security
ALTER TABLE delinquent_customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view delinquent customers from their company" ON delinquent_customers;
DROP POLICY IF EXISTS "Service role can manage delinquent customers" ON delinquent_customers;

-- RLS Policies
CREATE POLICY "Users can view delinquent customers from their company"
    ON delinquent_customers FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage delinquent customers"
    ON delinquent_customers FOR ALL
    USING (true)
    WITH CHECK (true);

-- ================================================================
-- STEP 2: Create Function to Calculate Delinquent Customers
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_delinquent_customers(p_company_id UUID DEFAULT NULL)
RETURNS TABLE (
    processed_count INTEGER,
    added_count INTEGER,
    updated_count INTEGER,
    removed_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
    v_processed_count INTEGER := 0;
    v_added_count INTEGER := 0;
    v_updated_count INTEGER := 0;
    v_removed_count INTEGER := 0;
    v_company_id UUID;
    v_contract RECORD;
    v_customer RECORD;
    v_payment RECORD;
    v_violation RECORD;
    v_legal_case RECORD;
    v_today DATE := CURRENT_DATE;
    v_contract_start_date DATE;
    v_months_since_start INTEGER;
    v_expected_payments INTEGER;
    v_actual_payments INTEGER;
    v_months_unpaid INTEGER;
    v_overdue_amount NUMERIC;
    v_days_overdue INTEGER;
    v_last_expected_payment_date DATE;
    v_late_penalty NUMERIC;
    v_violations_count INTEGER;
    v_violations_amount NUMERIC;
    v_total_debt NUMERIC;
    v_risk_score NUMERIC;
    v_risk_level TEXT;
    v_risk_level_en TEXT;
    v_risk_color TEXT;
    v_recommended_action TEXT;
    v_has_previous_legal_cases BOOLEAN;
    v_previous_legal_cases_count INTEGER;
    v_last_payment_date DATE;
    v_last_payment_amount NUMERIC;
    v_customer_name TEXT;
    v_existing_record UUID;
BEGIN
    -- If no company_id provided, process all companies
    IF p_company_id IS NOT NULL THEN
        -- Process single company
        FOR v_contract IN
            SELECT 
                c.id,
                c.contract_number,
                c.start_date,
                c.monthly_rent,
                c.vehicle_id,
                c.customer_id,
                c.company_id,
                cust.id as cust_id,
                cust.customer_code,
                cust.first_name,
                cust.last_name,
                cust.company_name,
                cust.customer_type,
                cust.phone,
                cust.email,
                cust.credit_limit,
                cust.is_blacklisted,
                v.plate_number as vehicle_plate
            FROM contracts c
            INNER JOIN customers cust ON c.customer_id = cust.id
            LEFT JOIN vehicles v ON c.vehicle_id = v.id
            WHERE c.company_id = p_company_id
            AND c.status = 'active'
            AND c.start_date IS NOT NULL
        LOOP
            v_processed_count := v_processed_count + 1;
            
            -- Calculate expected payments
            v_contract_start_date := v_contract.start_date;
            v_months_since_start := FLOOR(EXTRACT(EPOCH FROM (v_today - v_contract_start_date)) / (30 * 24 * 60 * 60));
            v_expected_payments := GREATEST(0, v_months_since_start);
            
            -- Get actual payments
            SELECT COUNT(*), MAX(payment_date), MAX(amount)
            INTO v_actual_payments, v_last_payment_date, v_last_payment_amount
            FROM payments
            WHERE customer_id = v_contract.customer_id
            AND company_id = v_contract.company_id
            AND payment_status IN ('completed', 'paid', 'approved');
            
            -- Calculate months unpaid
            v_months_unpaid := v_expected_payments - COALESCE(v_actual_payments, 0);
            
            -- Skip if customer is not delinquent
            IF v_months_unpaid <= 0 THEN
                -- Mark as inactive if exists
                UPDATE delinquent_customers
                SET is_active = false, last_updated_at = NOW()
                WHERE company_id = v_contract.company_id
                AND customer_id = v_contract.customer_id
                AND contract_id = v_contract.id
                AND is_active = true;
                
                IF FOUND THEN
                    v_removed_count := v_removed_count + 1;
                END IF;
                CONTINUE;
            END IF;
            
            -- Calculate overdue amount
            v_overdue_amount := v_months_unpaid * COALESCE(v_contract.monthly_rent, 0);
            
            -- Calculate days overdue (from last expected payment date, assume 5th of month)
            v_last_expected_payment_date := DATE_TRUNC('month', v_today) + INTERVAL '4 days';
            IF EXTRACT(DAY FROM v_today) < 5 THEN
                v_last_expected_payment_date := v_last_expected_payment_date - INTERVAL '1 month';
            END IF;
            v_days_overdue := GREATEST(0, v_today - v_last_expected_payment_date);
            
            -- Calculate penalty (simplified: 0.1% per day after 5 days grace period)
            IF v_days_overdue > 5 THEN
                v_late_penalty := v_overdue_amount * 0.001 * (v_days_overdue - 5);
                v_late_penalty := LEAST(v_late_penalty, v_overdue_amount * 0.20); -- Max 20%
            ELSE
                v_late_penalty := 0;
            END IF;
            
            -- Get violations
            SELECT COUNT(*), COALESCE(SUM(fine_amount), 0)
            INTO v_violations_count, v_violations_amount
            FROM traffic_violations
            WHERE customer_id = v_contract.customer_id
            AND company_id = v_contract.company_id
            AND status != 'paid';
            
            -- Get legal history
            SELECT COUNT(*) > 0, COUNT(*)
            INTO v_has_previous_legal_cases, v_previous_legal_cases_count
            FROM legal_cases
            WHERE client_id = v_contract.customer_id
            AND company_id = v_contract.company_id;
            
            -- Calculate risk score (simplified calculation)
            v_risk_score := 0;
            v_risk_score := v_risk_score + LEAST((v_days_overdue / 120.0) * 100 * 0.40, 40);
            IF v_contract.credit_limit > 0 THEN
                v_risk_score := v_risk_score + LEAST((v_overdue_amount / v_contract.credit_limit) * 100 * 0.30, 30);
            ELSE
                v_risk_score := v_risk_score + 30;
            END IF;
            v_risk_score := v_risk_score + LEAST((v_violations_count / 5.0) * 100 * 0.15, 15);
            IF v_expected_payments > 0 THEN
                v_risk_score := v_risk_score + ((v_months_unpaid / v_expected_payments::NUMERIC) * 100 * 0.10);
            END IF;
            IF v_has_previous_legal_cases THEN
                v_risk_score := v_risk_score + 5;
            END IF;
            v_risk_score := LEAST(v_risk_score, 100);
            
            -- Determine risk level
            IF v_risk_score >= 85 THEN
                v_risk_level := 'CRITICAL';
                v_risk_level_en := 'Critical';
                v_risk_color := 'red';
                v_recommended_action := 'BLACKLIST_AND_FILE_CASE';
            ELSIF v_risk_score >= 70 THEN
                v_risk_level := 'HIGH';
                v_risk_level_en := 'High';
                v_risk_color := 'red';
                v_recommended_action := 'FILE_LEGAL_CASE';
            ELSIF v_risk_score >= 60 THEN
                v_risk_level := 'MEDIUM';
                v_risk_level_en := 'Medium';
                v_risk_color := 'orange';
                v_recommended_action := 'SEND_FORMAL_NOTICE';
            ELSIF v_risk_score >= 40 THEN
                v_risk_level := 'LOW';
                v_risk_level_en := 'Low';
                v_risk_color := 'yellow';
                v_recommended_action := 'SEND_WARNING';
            ELSE
                v_risk_level := 'MONITOR';
                v_risk_level_en := 'Monitor';
                v_risk_color := 'green';
                v_recommended_action := 'MONITOR';
            END IF;
            
            -- Calculate total debt
            v_total_debt := v_overdue_amount + v_late_penalty + COALESCE(v_violations_amount, 0);
            
            -- Build customer name
            IF v_contract.customer_type = 'individual' THEN
                v_customer_name := TRIM(COALESCE(v_contract.first_name, '') || ' ' || COALESCE(v_contract.last_name, ''));
            ELSE
                v_customer_name := COALESCE(v_contract.company_name, '');
            END IF;
            
            -- Check if record exists
            SELECT id INTO v_existing_record
            FROM delinquent_customers
            WHERE company_id = v_contract.company_id
            AND customer_id = v_contract.customer_id
            AND contract_id = v_contract.id;
            
            -- Insert or update
            IF v_existing_record IS NOT NULL THEN
                UPDATE delinquent_customers
                SET
                    customer_name = v_customer_name,
                    customer_code = v_contract.customer_code,
                    customer_type = v_contract.customer_type,
                    phone = v_contract.phone,
                    email = v_contract.email,
                    credit_limit = COALESCE(v_contract.credit_limit, 0),
                    is_blacklisted = COALESCE(v_contract.is_blacklisted, false),
                    contract_number = v_contract.contract_number,
                    contract_start_date = v_contract_start_date,
                    monthly_rent = v_contract.monthly_rent,
                    vehicle_id = v_contract.vehicle_id,
                    vehicle_plate = v_contract.vehicle_plate,
                    months_unpaid = v_months_unpaid,
                    overdue_amount = v_overdue_amount,
                    last_payment_date = v_last_payment_date,
                    last_payment_amount = COALESCE(v_last_payment_amount, 0),
                    actual_payments_count = v_actual_payments,
                    expected_payments_count = v_expected_payments,
                    days_overdue = v_days_overdue,
                    late_penalty = v_late_penalty,
                    violations_count = v_violations_count,
                    violations_amount = v_violations_amount,
                    total_debt = v_total_debt,
                    risk_score = v_risk_score,
                    risk_level = v_risk_level,
                    risk_level_en = v_risk_level_en,
                    risk_color = v_risk_color,
                    recommended_action = v_recommended_action,
                    has_previous_legal_cases = v_has_previous_legal_cases,
                    previous_legal_cases_count = v_previous_legal_cases_count,
                    last_updated_at = NOW(),
                    is_active = true
                WHERE id = v_existing_record;
                
                v_updated_count := v_updated_count + 1;
            ELSE
                INSERT INTO delinquent_customers (
                    company_id,
                    customer_id,
                    customer_name,
                    customer_code,
                    customer_type,
                    phone,
                    email,
                    credit_limit,
                    is_blacklisted,
                    contract_id,
                    contract_number,
                    contract_start_date,
                    monthly_rent,
                    vehicle_id,
                    vehicle_plate,
                    months_unpaid,
                    overdue_amount,
                    last_payment_date,
                    last_payment_amount,
                    actual_payments_count,
                    expected_payments_count,
                    days_overdue,
                    late_penalty,
                    violations_count,
                    violations_amount,
                    total_debt,
                    risk_score,
                    risk_level,
                    risk_level_en,
                    risk_color,
                    recommended_action,
                    has_previous_legal_cases,
                    previous_legal_cases_count,
                    first_detected_at,
                    is_active
                )
                VALUES (
                    v_contract.company_id,
                    v_contract.customer_id,
                    v_customer_name,
                    v_contract.customer_code,
                    v_contract.customer_type,
                    v_contract.phone,
                    v_contract.email,
                    COALESCE(v_contract.credit_limit, 0),
                    COALESCE(v_contract.is_blacklisted, false),
                    v_contract.id,
                    v_contract.contract_number,
                    v_contract_start_date,
                    v_contract.monthly_rent,
                    v_contract.vehicle_id,
                    v_contract.vehicle_plate,
                    v_months_unpaid,
                    v_overdue_amount,
                    v_last_payment_date,
                    COALESCE(v_last_payment_amount, 0),
                    v_actual_payments,
                    v_expected_payments,
                    v_days_overdue,
                    v_late_penalty,
                    v_violations_count,
                    v_violations_amount,
                    v_total_debt,
                    v_risk_score,
                    v_risk_level,
                    v_risk_level_en,
                    v_risk_color,
                    v_recommended_action,
                    v_has_previous_legal_cases,
                    v_previous_legal_cases_count,
                    NOW(),
                    true
                );
                
                v_added_count := v_added_count + 1;
            END IF;
        END LOOP;
    ELSE
        -- Process all companies
        FOR v_company_id IN SELECT DISTINCT id FROM companies
        LOOP
            -- Recursive call for each company
            PERFORM * FROM update_delinquent_customers(v_company_id);
        END LOOP;
    END IF;
    
    -- Return results
    RETURN QUERY SELECT v_processed_count, v_added_count, v_updated_count, v_removed_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_delinquent_customers TO authenticated;
GRANT EXECUTE ON FUNCTION update_delinquent_customers TO service_role;

-- ================================================================
-- STEP 3: Remove Existing Cron Job (if any)
-- ================================================================

SELECT cron.unschedule('update-delinquent-customers') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-delinquent-customers'
);

-- ================================================================
-- STEP 4: Schedule Daily Cron Job
-- ================================================================
-- Schedule: Every day at 9:00 AM
-- Purpose: Update delinquent customers table automatically

SELECT cron.schedule(
  'update-delinquent-customers',           -- Job name
  '0 9 * * *',                            -- Schedule: 9 AM daily (cron format)
  $$SELECT update_delinquent_customers()$$ -- Function to execute
);

-- ================================================================
-- STEP 5: Add Comments
-- ================================================================

COMMENT ON TABLE delinquent_customers IS 'Stores automatically updated delinquent customers data. Refreshed daily via cron job.';
COMMENT ON FUNCTION update_delinquent_customers IS 'Calculates and updates delinquent customers table. Can be called with specific company_id or without parameter to process all companies.';

-- ================================================================
-- COMPLETION MESSAGE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Delinquent Customers Auto-Update System Created Successfully!';
    RAISE NOTICE '   📊 Table: delinquent_customers';
    RAISE NOTICE '   ⚙️ Function: update_delinquent_customers()';
    RAISE NOTICE '   ⏰ Cron Job: update-delinquent-customers (Daily at 9 AM)';
    RAISE NOTICE '';
    RAISE NOTICE 'To test manually, run:';
    RAISE NOTICE '   SELECT * FROM update_delinquent_customers();';
    RAISE NOTICE '   -- Or for specific company:';
    RAISE NOTICE '   SELECT * FROM update_delinquent_customers(''company-uuid-here'');';
END $$;

