-- Critical Foreign Key Indexes
-- Add indexes for the most commonly used foreign keys identified by performance advisors

-- Core business tables - high frequency queries
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_current_plan ON companies(current_plan_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_id ON contracts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_contract_id ON traffic_violations(contract_id);

-- Financial tables - critical for performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_journal_entry_id ON invoices(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period_id ON journal_entries(accounting_period_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Legal cases - newly indexed foreign keys
CREATE INDEX IF NOT EXISTS idx_legal_cases_client_id ON legal_cases(client_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_primary_lawyer_id ON legal_cases(primary_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_created_by ON legal_cases(created_by);

-- Inventory system - foreign key indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_by ON inventory_items(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by ON inventory_movements(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_orders_supplier_id ON inventory_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_orders_created_by ON inventory_purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_suppliers_created_by ON inventory_suppliers(created_by);

-- Document and attachment tables
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_uploaded_by ON customer_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_uploaded_by ON contract_documents(uploaded_by);

-- Driver assignments
CREATE INDEX IF NOT EXISTS idx_driver_assignments_vehicle_id ON driver_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id ON drivers(vehicle_id);

-- Payment processing
CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice_id ON payment_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_by ON payment_reminders(sent_by);
CREATE INDEX IF NOT EXISTS idx_payment_promises_invoice_id ON payment_promises(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_promises_created_by ON payment_promises(created_by);

-- Late fees and penalties
CREATE INDEX IF NOT EXISTS idx_late_fees_company_id ON late_fees(company_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_contract_id ON late_fees(contract_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_applied_by ON late_fees(applied_by);
CREATE INDEX IF NOT EXISTS idx_penalties_contract_id ON penalties(contract_id);
CREATE INDEX IF NOT EXISTS idx_penalties_created_by ON penalties(created_by);

-- Background jobs and notifications
CREATE INDEX IF NOT EXISTS idx_background_jobs_created_by ON background_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_company_id ON dashboard_widgets(company_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_created_by ON dashboard_widgets(created_by);

-- Partial indexes for common filtering patterns
CREATE INDEX IF NOT EXISTS idx_active_vehicles_company ON vehicles(company_id, status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_active_customers_company ON customers(company_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pending_invoices_company ON invoices(company_id, created_at) WHERE status IN ('draft', 'sent', 'overdue');
CREATE INDEX IF NOT EXISTS idx_contracts_active_company ON contracts(company_id, status) WHERE status IN ('active', 'pending');

-- Add comments for documentation
COMMENT ON INDEX idx_profiles_company_id IS 'Optimizes company user lookups';
COMMENT ON INDEX idx_companies_current_plan IS 'Optimizes company plan queries';
COMMENT ON INDEX idx_vehicles_company_id IS 'Optimizes fleet queries by company';
COMMENT ON INDEX idx_customers_company_id IS 'Optimizes customer queries by company';
COMMENT ON INDEX idx_contracts_customer_id IS 'Optimizes contract lookups by customer';
COMMENT ON INDEX idx_contracts_vehicle_id IS 'Optimizes contract lookups by vehicle';
COMMENT ON INDEX idx_traffic_violations_contract_id IS 'Optimizes violation lookups by contract';

COMMENT ON INDEX idx_invoices_customer_id IS 'Optimizes invoice queries by customer';
COMMENT ON INDEX idx_invoices_journal_entry_id IS 'Optimizes invoice-accounting lookups';
COMMENT ON INDEX idx_payments_invoice_id IS 'Optimizes payment lookups by invoice';
COMMENT ON INDEX idx_payments_customer_id IS 'Optimizes payment lookups by customer';
COMMENT ON INDEX idx_journal_entries_period_id IS 'Optimizes accounting period queries';
COMMENT ON INDEX idx_invoice_items_invoice_id IS 'Optimizes invoice item lookups';

COMMENT ON INDEX idx_legal_cases_client_id IS 'Optimizes legal case lookups by client';
COMMENT ON INDEX idx_legal_cases_primary_lawyer_id IS 'Optimizes lawyer workload tracking';
COMMENT ON INDEX idx_legal_cases_created_by IS 'Optimizes case creation tracking';

COMMENT ON INDEX idx_active_vehicles_company IS 'Partial index for active vehicles by company';
COMMENT ON INDEX idx_active_customers_company IS 'Partial index for active customers by company';
COMMENT ON INDEX idx_pending_invoices_company IS 'Partial index for pending invoices by company';
COMMENT ON INDEX idx_contracts_active_company IS 'Partial index for active contracts by company';;
