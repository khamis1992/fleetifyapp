-- =====================================================
-- Legal AI System Database Schema
-- Created: 2025-09-01
-- Description: Tables and functions for Legal AI system
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. LEGAL CONSULTATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS legal_consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  response TEXT,
  query_type VARCHAR(50),
  risk_score DECIMAL(5,2),
  country VARCHAR(50) DEFAULT 'kuwait',
  response_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_legal_consultations_company ON legal_consultations(company_id);
CREATE INDEX idx_legal_consultations_customer ON legal_consultations(customer_id);
CREATE INDEX idx_legal_consultations_created_at ON legal_consultations(created_at DESC);
CREATE INDEX idx_legal_consultations_query_type ON legal_consultations(query_type);

-- Row Level Security
ALTER TABLE legal_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consultations from their company"
  ON legal_consultations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert consultations for their company"
  ON legal_consultations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 2. LEGAL DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  document_type VARCHAR(100) NOT NULL,
  document_number VARCHAR(100),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  country VARCHAR(50) DEFAULT 'kuwait',
  status VARCHAR(50) DEFAULT 'draft',
  language VARCHAR(10) DEFAULT 'ar',
  generated_by_ai BOOLEAN DEFAULT FALSE,
  consultation_id UUID REFERENCES legal_consultations(id),
  file_url TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  issued_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_legal_documents_company ON legal_documents(company_id);
CREATE INDEX idx_legal_documents_customer ON legal_documents(customer_id);
CREATE INDEX idx_legal_documents_type ON legal_documents(document_type);
CREATE INDEX idx_legal_documents_status ON legal_documents(status);
CREATE INDEX idx_legal_documents_created_at ON legal_documents(created_at DESC);

-- Row Level Security
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents from their company"
  ON legal_documents FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents for their company"
  ON legal_documents FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents from their company"
  ON legal_documents FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. LEGAL CASES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS legal_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  case_number VARCHAR(200) NOT NULL,
  case_title VARCHAR(500) NOT NULL,
  case_type VARCHAR(100) NOT NULL,
  case_status VARCHAR(50) DEFAULT 'open',
  country VARCHAR(50) DEFAULT 'kuwait',
  court_name VARCHAR(300),
  priority VARCHAR(20) DEFAULT 'medium',
  claim_amount DECIMAL(15,3),
  currency VARCHAR(10) DEFAULT 'KWD',
  description TEXT,
  notes TEXT,
  lawyer_name VARCHAR(300),
  lawyer_contact VARCHAR(200),
  next_hearing_date TIMESTAMP,
  filed_date TIMESTAMP,
  closed_date TIMESTAMP,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_legal_cases_company ON legal_cases(company_id);
CREATE INDEX idx_legal_cases_customer ON legal_cases(customer_id);
CREATE INDEX idx_legal_cases_status ON legal_cases(case_status);
CREATE INDEX idx_legal_cases_type ON legal_cases(case_type);
CREATE INDEX idx_legal_cases_number ON legal_cases(case_number);
CREATE INDEX idx_legal_cases_next_hearing ON legal_cases(next_hearing_date);

-- Row Level Security
ALTER TABLE legal_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cases from their company"
  ON legal_cases FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cases for their company"
  ON legal_cases FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cases from their company"
  ON legal_cases FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. COURT SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS court_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  session_number INTEGER,
  session_date TIMESTAMP NOT NULL,
  session_type VARCHAR(100),
  court_name VARCHAR(300),
  judge_name VARCHAR(300),
  outcome VARCHAR(100),
  notes TEXT,
  next_session_date TIMESTAMP,
  documents JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_court_sessions_company ON court_sessions(company_id);
CREATE INDEX idx_court_sessions_case ON court_sessions(case_id);
CREATE INDEX idx_court_sessions_date ON court_sessions(session_date DESC);
CREATE INDEX idx_court_sessions_next_date ON court_sessions(next_session_date);

-- Row Level Security
ALTER TABLE court_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sessions from their company"
  ON court_sessions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sessions for their company"
  ON court_sessions FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sessions from their company"
  ON court_sessions FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. DATABASE FUNCTIONS FOR LEGAL AI SYSTEM
-- =====================================================

-- Function: Calculate customer risk score
CREATE OR REPLACE FUNCTION calculate_customer_risk_score(
  p_customer_id UUID
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_payment_delay INTEGER := 0;
  v_unpaid_amount DECIMAL(15,3) := 0;
  v_violation_count INTEGER := 0;
  v_contract_history INTEGER := 0;
  v_litigation_history INTEGER := 0;
  v_risk_score DECIMAL(5,2);
  v_normalized_payment DECIMAL(5,2);
  v_normalized_amount DECIMAL(5,2);
  v_normalized_violations DECIMAL(5,2);
  v_normalized_contracts DECIMAL(5,2);
  v_normalized_litigation DECIMAL(5,2);
BEGIN
  -- Calculate payment delay (average days overdue)
  SELECT COALESCE(AVG(GREATEST(0, CURRENT_DATE - payment_due_date)), 0)
  INTO v_payment_delay
  FROM payments
  WHERE customer_id = p_customer_id
    AND payment_status = 'pending'
    AND payment_due_date < CURRENT_DATE;
  
  -- Calculate unpaid amount
  SELECT COALESCE(SUM(amount_due - amount_paid), 0)
  INTO v_unpaid_amount
  FROM invoices
  WHERE customer_id = p_customer_id
    AND status IN ('pending', 'overdue');
  
  -- Count traffic violations
  SELECT COUNT(*)
  INTO v_violation_count
  FROM traffic_violations
  WHERE customer_id = p_customer_id
    AND status = 'pending';
  
  -- Count contract history
  SELECT COUNT(*)
  INTO v_contract_history
  FROM contracts
  WHERE customer_id = p_customer_id;
  
  -- Count litigation history
  SELECT COUNT(*)
  INTO v_litigation_history
  FROM legal_cases
  WHERE customer_id = p_customer_id;
  
  -- Normalize factors (0-100 scale)
  v_normalized_payment := LEAST(v_payment_delay::DECIMAL / 90.0 * 100, 100);
  v_normalized_amount := LEAST(v_unpaid_amount / 10000.0 * 100, 100);
  v_normalized_violations := LEAST(v_violation_count::DECIMAL / 10.0 * 100, 100);
  v_normalized_contracts := GREATEST(0, 100 - (v_contract_history::DECIMAL / 20.0 * 100));
  v_normalized_litigation := LEAST(v_litigation_history::DECIMAL / 5.0 * 100, 100);
  
  -- Calculate weighted risk score
  v_risk_score := (
    (v_normalized_payment * 0.35) +
    (v_normalized_amount * 0.30) +
    (v_normalized_violations * 0.20) +
    (v_normalized_contracts * 0.10) +
    (v_normalized_litigation * 0.05)
  );
  
  RETURN LEAST(GREATEST(v_risk_score, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- Function: Get legal consultation statistics
CREATE OR REPLACE FUNCTION get_legal_consultation_stats(
  p_company_id UUID,
  p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP DEFAULT NOW()
) RETURNS TABLE (
  total_consultations BIGINT,
  total_documents_generated BIGINT,
  avg_risk_score DECIMAL(5,2),
  total_cost_usd DECIMAL(10,2),
  avg_response_time_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(lc.id)::BIGINT,
    COUNT(ld.id)::BIGINT,
    COALESCE(AVG(lc.risk_score), 0)::DECIMAL(5,2),
    COALESCE(SUM(lc.cost_usd), 0)::DECIMAL(10,2),
    COALESCE(AVG(lc.response_time_ms), 0)::INTEGER
  FROM legal_consultations lc
  LEFT JOIN legal_documents ld ON ld.consultation_id = lc.id
  WHERE lc.company_id = p_company_id
    AND lc.created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function: Get customer legal history
CREATE OR REPLACE FUNCTION get_customer_legal_history(
  p_customer_id UUID
) RETURNS TABLE (
  consultations_count BIGINT,
  documents_count BIGINT,
  active_cases_count BIGINT,
  total_claim_amount DECIMAL(15,3),
  last_consultation_date TIMESTAMP,
  risk_score DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM legal_consultations WHERE customer_id = p_customer_id)::BIGINT,
    (SELECT COUNT(*) FROM legal_documents WHERE customer_id = p_customer_id)::BIGINT,
    (SELECT COUNT(*) FROM legal_cases WHERE customer_id = p_customer_id AND case_status = 'open')::BIGINT,
    COALESCE((SELECT SUM(claim_amount) FROM legal_cases WHERE customer_id = p_customer_id), 0)::DECIMAL(15,3),
    (SELECT MAX(created_at) FROM legal_consultations WHERE customer_id = p_customer_id),
    calculate_customer_risk_score(p_customer_id);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_legal_consultations_updated_at
  BEFORE UPDATE ON legal_consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_cases_updated_at
  BEFORE UPDATE ON legal_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_court_sessions_updated_at
  BEFORE UPDATE ON court_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE legal_consultations IS 'Stores AI-powered legal consultation queries and responses';
COMMENT ON TABLE legal_documents IS 'Stores legal documents generated by the system or uploaded manually';
COMMENT ON TABLE legal_cases IS 'Stores legal cases and litigation records';
COMMENT ON TABLE court_sessions IS 'Stores court session details for legal cases';

COMMENT ON FUNCTION calculate_customer_risk_score IS 'Calculates a weighted risk score (0-100) for a customer based on payment history, violations, and litigation';
COMMENT ON FUNCTION get_legal_consultation_stats IS 'Returns aggregated statistics for legal consultations within a date range';
COMMENT ON FUNCTION get_customer_legal_history IS 'Returns comprehensive legal history for a specific customer';
