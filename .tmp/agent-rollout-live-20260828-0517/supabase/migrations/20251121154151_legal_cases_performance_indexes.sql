-- Legal Cases Performance Indexes
-- Add indexes for legal cases to improve query performance

-- Index for company and case_status filtering (common dashboard query)
CREATE INDEX IF NOT EXISTS idx_legal_cases_company_status ON legal_cases(company_id, case_status);

-- Index for case_number lookups (frequent search pattern)
CREATE INDEX IF NOT EXISTS idx_legal_cases_case_number ON legal_cases(case_number);

-- Index for hearing_date ordering (calendar view and due-date queries)
CREATE INDEX IF NOT EXISTS idx_legal_cases_hearing_date ON legal_cases(hearing_date);

-- Index for client_name searches (frequent lookup)
CREATE INDEX IF NOT EXISTS idx_legal_cases_client_name ON legal_cases(client_name);

-- Index for case_type filtering (categorization)
CREATE INDEX IF NOT EXISTS idx_legal_cases_case_type ON legal_cases(case_type);

-- Index for priority filtering (task management)
CREATE INDEX IF NOT EXISTS idx_legal_cases_priority ON legal_cases(priority);

-- Composite index for company+case_type+status (dashboard analytics)
CREATE INDEX IF NOT EXISTS idx_legal_cases_company_type_status ON legal_cases(company_id, case_type, case_status);

-- Composite index for client+case_status (client portal view)
CREATE INDEX IF NOT EXISTS idx_legal_cases_client_status ON legal_cases(client_id, case_status);

-- Partial index for active cases only (optimizes common filtering)
CREATE INDEX IF NOT EXISTS idx_legal_cases_active_cases ON legal_cases(company_id, hearing_date) 
WHERE case_status IN ('active', 'pending', 'investigation');

-- Partial index for high priority cases (priority filtering)
CREATE INDEX IF NOT EXISTS idx_legal_cases_high_priority ON legal_cases(company_id, created_at) 
WHERE priority IN ('high', 'critical');

-- Add comments for documentation
COMMENT ON INDEX idx_legal_cases_company_status IS 'Optimizes company dashboard queries by case status';
COMMENT ON INDEX idx_legal_cases_case_number IS 'Optimizes case number search lookups';
COMMENT ON INDEX idx_legal_cases_hearing_date IS 'Optimizes hearing date calendar view and sorting';
COMMENT ON INDEX idx_legal_cases_client_name IS 'Optimizes client name searches';
COMMENT ON INDEX idx_legal_cases_case_type IS 'Optimizes case type filtering';
COMMENT ON INDEX idx_legal_cases_priority IS 'Optimizes priority-based filtering';
COMMENT ON INDEX idx_legal_cases_company_type_status IS 'Optimizes dashboard analytics by company, type, and status';
COMMENT ON INDEX idx_legal_cases_client_status IS 'Optimizes client portal views';
COMMENT ON INDEX idx_legal_cases_active_cases IS 'Partial index for active cases only';
COMMENT ON INDEX idx_legal_cases_high_priority IS 'Partial index for high priority cases';;
