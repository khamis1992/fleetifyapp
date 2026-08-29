-- COMPREHENSIVE PERFORMANCE INDEXES (Fixed column names)

-- 1. PENALTIES (Traffic Violations)
CREATE INDEX IF NOT EXISTS idx_penalties_company_created ON penalties(company_id, created_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_penalties_company_status ON penalties(company_id, status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_penalties_company_payment_status ON penalties(company_id, payment_status) WHERE payment_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_penalties_company_status_payment ON penalties(company_id, status, payment_status);
CREATE INDEX IF NOT EXISTS idx_penalties_vehicle_id ON penalties(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_penalties_customer_id ON penalties(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_penalties_contract_id ON penalties(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_penalties_company_date ON penalties(company_id, penalty_date DESC) WHERE penalty_date IS NOT NULL;

-- 2. CONTRACTS
CREATE INDEX IF NOT EXISTS idx_contracts_company_status ON contracts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_company_dates ON contracts(company_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_id ON contracts(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_company_number ON contracts(company_id, contract_number) WHERE contract_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_company_vehicle_dates ON contracts(company_id, vehicle_id, start_date, end_date) WHERE status IN ('active', 'pending');

-- 3. CUSTOMERS
CREATE INDEX IF NOT EXISTS idx_customers_company_active ON customers(company_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customers_company_names ON customers(company_id, first_name, last_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customers_company_company_name ON customers(company_id, company_name) WHERE is_active = true AND company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;

-- 4. VEHICLES (Fixed: vehicle_type -> category_id)
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status_active ON vehicles(company_id, status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vehicles_company_plate ON vehicles(company_id, plate_number) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vehicles_company_category ON vehicles(company_id, category_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status_category ON vehicles(company_id, status, category_id) WHERE is_active = true;;
