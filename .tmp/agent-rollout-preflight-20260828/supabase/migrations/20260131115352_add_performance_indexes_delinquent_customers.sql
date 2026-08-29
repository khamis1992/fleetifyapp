-- ================================================================
-- 7. DELINQUENT CUSTOMERS TABLE INDEXES (Cached Table)
-- ================================================================

-- Index for filtering by company and risk score
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_company_risk 
ON delinquent_customers(company_id, risk_score DESC)
WHERE is_active = true;

-- Index for filtering by risk level
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_risk_level 
ON delinquent_customers(company_id, risk_level, days_overdue DESC)
WHERE is_active = true;

-- Index for filtering by overdue period
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_overdue 
ON delinquent_customers(company_id, days_overdue DESC)
WHERE is_active = true;

-- Index for search by customer name/code
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_search 
ON delinquent_customers USING gin(
  to_tsvector('arabic', customer_name || ' ' || COALESCE(customer_code, ''))
)
WHERE is_active = true;;
