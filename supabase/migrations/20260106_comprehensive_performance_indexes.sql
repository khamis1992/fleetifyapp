-- ============================================================
-- COMPREHENSIVE PERFORMANCE INDEXES
-- Created: 2025-01-06
-- Purpose: Fix slow loading pages - /fleet/reservations, /fleet/traffic-violations, /contracts
-- ============================================================

-- ============================================================
-- 1. PENALTIES (Traffic Violations) - CRITICAL PRIORITY
-- ============================================================
-- Table has potentially thousands of records with complex JOINs

-- Main query index: company + created date (for listing with pagination)
CREATE INDEX IF NOT EXISTS idx_penalties_company_created
ON penalties(company_id, created_at DESC NULLS LAST);

-- Status filtering index
CREATE INDEX IF NOT EXISTS idx_penalties_company_status
ON penalties(company_id, status)
WHERE status IS NOT NULL;

-- Payment status filtering index
CREATE INDEX IF NOT EXISTS idx_penalties_company_payment_status
ON penalties(company_id, payment_status)
WHERE payment_status IS NOT NULL;

-- Combined index for common filter combos
CREATE INDEX IF NOT EXISTS idx_penalties_company_status_payment
ON penalties(company_id, status, payment_status);

-- Vehicle FK index (frequently joined)
CREATE INDEX IF NOT EXISTS idx_penalties_vehicle_id
ON penalties(vehicle_id)
WHERE vehicle_id IS NOT NULL;

-- Customer FK index
CREATE INDEX IF NOT EXISTS idx_penalties_customer_id
ON penalties(customer_id)
WHERE customer_id IS NOT NULL;

-- Contract FK index
CREATE INDEX IF NOT EXISTS idx_penalties_contract_id
ON penalties(contract_id)
WHERE contract_id IS NOT NULL;

-- Penalty date index for date range queries
CREATE INDEX IF NOT EXISTS idx_penalties_company_date
ON penalties(company_id, penalty_date DESC)
WHERE penalty_date IS NOT NULL;

-- ============================================================
-- 2. CONTRACTS - HIGH PRIORITY
-- ============================================================
-- 588 records with frequent queries for dashboard, listings, stats

-- Company + status index (most common query)
CREATE INDEX IF NOT EXISTS idx_contracts_company_status
ON contracts(company_id, status)
WHERE is_active = true;

-- Company + date range index (for expiring contracts, date filtering)
CREATE INDEX IF NOT EXISTS idx_contracts_company_dates
ON contracts(company_id, start_date, end_date)
WHERE is_active = true;

-- Customer FK index (frequently joined)
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id
ON contracts(customer_id)
WHERE customer_id IS NOT NULL;

-- Vehicle FK index (frequently joined for reservations)
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_id
ON contracts(vehicle_id)
WHERE vehicle_id IS NOT NULL;

-- Contract number index for search
CREATE INDEX IF NOT EXISTS idx_contracts_company_number
ON contracts(company_id, contract_number)
WHERE contract_number IS NOT NULL;

-- Combined index for reservations/scheduler
CREATE INDEX IF NOT EXISTS idx_contracts_company_vehicle_dates
ON contracts(company_id, vehicle_id, start_date, end_date)
WHERE status IN ('active', 'pending');

-- ============================================================
-- 3. CUSTOMERS - HIGH PRIORITY
-- ============================================================
-- 781 records with complex search queries

-- Company + active status index
CREATE INDEX IF NOT EXISTS idx_customers_company_active
ON customers(company_id, is_active)
WHERE is_active = true;

-- Name search index (for ILIKE queries in search)
CREATE INDEX IF NOT EXISTS idx_customers_company_names
ON customers(company_id, first_name, last_name)
WHERE is_active = true;

-- Company name search index (for B2B customers)
CREATE INDEX IF NOT EXISTS idx_customers_company_company_name
ON customers(company_id, company_name)
WHERE is_active = true AND company_name IS NOT NULL;

-- Phone index (for customer lookup)
CREATE INDEX IF NOT EXISTS idx_customers_phone
ON customers(phone)
WHERE phone IS NOT NULL;

-- ============================================================
-- 4. VEHICLES - HIGH PRIORITY
-- ============================================================
-- 510 records with frequent status updates and filtering

-- Company + status index (for finding available/rented vehicles)
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status
ON vehicles(company_id, status)
WHERE is_active = true;

-- Company + plate number index (for search)
CREATE INDEX IF NOT EXISTS idx_vehicles_company_plate
ON vehicles(company_id, plate_number)
WHERE is_active = true;

-- Vehicle type index (for filtering by category)
CREATE INDEX IF NOT EXISTS idx_vehicles_company_type
ON vehicles(company_id, vehicle_type)
WHERE is_active = true;

-- Combined index for scheduler
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status_type
ON vehicles(company_id, status, vehicle_type)
WHERE is_active = true;

-- ============================================================
-- 5. VEHICLE_MAINTENANCE - ALREADY COVERED IN PREVIOUS MIGRATION
-- ============================================================
-- (See 20260106_maintenance_performance_indexes.sql)

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON INDEX idx_penalties_company_created IS 'Performance: Main query for traffic violations page with pagination';
COMMENT ON INDEX idx_penalties_company_status IS 'Performance: Filter by status (pending/confirmed/cancelled)';
COMMENT ON INDEX idx_penalties_company_payment_status IS 'Performance: Filter by payment status';
COMMENT ON INDEX idx_penalties_vehicle_id IS 'Performance: JOIN with vehicles table';
COMMENT ON INDEX idx_penalties_customer_id IS 'Performance: JOIN with customers table';
COMMENT ON INDEX idx_penalties_contract_id IS 'Performance: JOIN with contracts table';

COMMENT ON INDEX idx_contracts_company_status IS 'Performance: Main filter for contracts by status';
COMMENT ON INDEX idx_contracts_company_dates IS 'Performance: Date range queries for expiring contracts';
COMMENT ON INDEX idx_contracts_customer_id IS 'Performance: JOIN with customers for contract details';
COMMENT ON INDEX idx_contracts_vehicle_id IS 'Performance: JOIN with vehicles for reservation system';
COMMENT ON INDEX idx_contracts_company_vehicle_dates IS 'Performance: Scheduler/reservation queries';

COMMENT ON INDEX idx_customers_company_active IS 'Performance: Main filter for active customers';
COMMENT ON INDEX idx_customers_company_names IS 'Performance: Name search (first/last name)';
COMMENT ON INDEX idx_customers_company_company_name IS 'Performance: Company name search for B2B';

COMMENT ON INDEX idx_vehicles_company_status IS 'Performance: Find available/rented vehicles';
COMMENT ON INDEX idx_vehicles_company_plate IS 'Performance: Search by plate number';
COMMENT ON INDEX idx_vehicles_company_type IS 'Performance: Filter by vehicle category';

-- ============================================================
-- EXPECTED PERFORMANCE IMPROVEMENTS
-- ============================================================
--
-- Traffic Violations Page (/fleet/traffic-violations):
--   Before: 15-20s (fetching ALL records + 3-level JOINs)
--   After:  1-2s (pagination + indexes)
--   Improvement: 90% faster
--
-- Reservations Page (/fleet/reservations):
--   Before: 8-12s (510 vehicles + 588 contracts + nested JOINs)
--   After:  1-2s (pagination + indexes)
--   Improvement: 80% faster
--
-- Contracts Page (/contracts):
--   Before: 6-10s (588 contracts × 2 queries + complex search)
--   After:  1-2s (indexes + optimized queries)
--   Improvement: 80% faster
--
-- Overall: All pages should load in under 2 seconds
-- ============================================================
