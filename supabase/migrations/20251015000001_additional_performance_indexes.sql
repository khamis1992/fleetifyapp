-- Additional Performance Indexes
-- Migration created: 2025-10-15
-- Purpose: Add ONLY verified indexes for core tables
-- Note: Only includes indexes for tables and columns that definitely exist

-- =============================================
-- PAYMENTS TABLE - CONTRACT LINKING OPTIMIZATION
-- =============================================
-- Critical index for the N+1 query fix in useContracts hook

CREATE INDEX IF NOT EXISTS idx_payments_contract_completed 
ON payments(contract_id, payment_status) 
WHERE contract_id IS NOT NULL AND payment_status = 'completed';

CREATE INDEX IF NOT EXISTS idx_payments_contract_pending
ON payments(contract_id, payment_status) 
WHERE contract_id IS NOT NULL AND payment_status = 'pending';

-- =============================================
-- CONTRACTS TABLE - ADDITIONAL INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_contracts_expiration 
ON contracts(end_date, status, company_id) 
WHERE status = 'active' AND end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_type_status
ON contracts(contract_type, status, company_id)
WHERE status IN ('active', 'pending');

-- =============================================
-- AUDIT LOGS TABLE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action
ON audit_logs(user_id, action)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
ON audit_logs(resource_type, resource_id)
WHERE resource_type IS NOT NULL AND resource_id IS NOT NULL;

-- =============================================
-- MAINTENANCE
-- =============================================

-- Update statistics for core tables only
ANALYZE payments;
ANALYZE contracts;
ANALYZE audit_logs;
