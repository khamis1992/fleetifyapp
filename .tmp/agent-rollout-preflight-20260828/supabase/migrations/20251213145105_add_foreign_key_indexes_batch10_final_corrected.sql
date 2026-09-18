-- Add indexes to foreign keys for performance optimization - Batch 10 (Final)
-- Vehicle and Vendor related tables

-- vehicle_activity_log
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_log_company_id ON public.vehicle_activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_log_cost_center_id ON public.vehicle_activity_log(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_log_performed_by ON public.vehicle_activity_log(performed_by);

-- vehicle_categories
CREATE INDEX IF NOT EXISTS idx_vehicle_categories_company_id ON public.vehicle_categories(company_id);

-- vehicle_condition_reports
CREATE INDEX IF NOT EXISTS idx_vehicle_condition_reports_contract_id ON public.vehicle_condition_reports(contract_id);

-- vehicle_inspections
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_company_id ON public.vehicle_inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_created_by ON public.vehicle_inspections(created_by);

-- vehicle_maintenance
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_expense_account_id ON public.vehicle_maintenance(expense_account_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vendor_id ON public.vehicle_maintenance(vendor_id);

-- vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_driver_id ON public.vehicles(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_branch_id ON public.vehicles(branch_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_category_id ON public.vehicles(category_id);

-- vendor_payments
CREATE INDEX IF NOT EXISTS idx_vendor_payments_bank_id ON public.vendor_payments(bank_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_purchase_order_id ON public.vendor_payments(purchase_order_id);

-- workflow_configurations
CREATE INDEX IF NOT EXISTS idx_workflow_configurations_default_workflow_id ON public.workflow_configurations(default_workflow_id);

-- workflow_templates
CREATE INDEX IF NOT EXISTS idx_workflow_templates_created_by ON public.workflow_templates(created_by);;
