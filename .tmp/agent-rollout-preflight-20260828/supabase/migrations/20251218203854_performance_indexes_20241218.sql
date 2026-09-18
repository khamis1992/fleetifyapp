-- Performance Indexes for FleetifyApp
-- Created: December 18, 2024
-- Purpose: Improve query performance for common operations
--
-- ================================================================
-- CONTRACTS TABLE INDEXES
-- ================================================================
--
-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_contracts_company_id
ON contracts(company_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_contracts_status
ON contracts(status) WHERE company_id IS NOT NULL;

-- Composite index for company + status filtering
CREATE INDEX IF NOT EXISTS idx_contracts_company_status
ON contracts(company_id, status);

-- Index for contract number lookups
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number
ON contracts(contract_number);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_contracts_start_date
ON contracts(start_date) WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_end_date
ON contracts(end_date) WHERE company_id IS NOT NULL;

-- Index for customer lookups
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id
ON contracts(customer_id) WHERE company_id IS NOT NULL;

-- Index for vehicle lookups
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_id
ON contracts(vehicle_id) WHERE company_id IS NOT NULL;

-- ================================================================
-- CUSTOMERS TABLE INDEXES
-- ================================================================
--
-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_customers_company_id
ON customers(company_id);

-- Index for active status filtering
CREATE INDEX IF NOT EXISTS idx_customers_active
ON customers(is_active) WHERE company_id IS NOT NULL;

-- Composite index for company + active status
CREATE INDEX IF NOT EXISTS idx_customers_company_active
ON customers(company_id, is_active);

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone
ON customers(phone) WHERE company_id IS NOT NULL;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_customers_email
ON customers(email) WHERE company_id IS NOT NULL;

-- Index for name search (will support ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_customers_name_ar
ON customers(first_name_ar, last_name_ar) WHERE company_id IS NOT NULL;

-- Full-text search index for Arabic names
CREATE INDEX IF NOT EXISTS idx_customers_name_ar_fts
ON customers USING gin(to_tsvector('arabic', first_name_ar || ' ' || last_name_ar))
WHERE company_id IS NOT NULL;

-- ================================================================
-- VEHICLES TABLE INDEXES
-- ================================================================
--
-- Primary index for company queries
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id
ON vehicles(company_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_status
ON vehicles(status) WHERE company_id IS NOT NULL;

-- Composite index for company + status
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status
ON vehicles(company_id, status);

-- Index for plate number lookups (very common)
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number
ON vehicles(plate_number) WHERE company_id IS NOT NULL;

-- Index for make/model filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model
ON vehicles(make, model) WHERE company_id IS NOT NULL;;
