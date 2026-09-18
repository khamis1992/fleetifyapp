-- Add indexes to foreign keys for performance optimization - Batch 3
-- Inventory related tables (Part 1)

-- inventory_alert_history
CREATE INDEX IF NOT EXISTS idx_inventory_alert_history_company_id ON public.inventory_alert_history(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_history_resolved_by ON public.inventory_alert_history(resolved_by);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_history_rule_id ON public.inventory_alert_history(rule_id);

-- inventory_alert_rules
CREATE INDEX IF NOT EXISTS idx_inventory_alert_rules_company_id ON public.inventory_alert_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alert_rules_created_by ON public.inventory_alert_rules(created_by);

-- inventory_categories
CREATE INDEX IF NOT EXISTS idx_inventory_categories_created_by ON public.inventory_categories(created_by);

-- inventory_demand_forecasts
CREATE INDEX IF NOT EXISTS idx_inventory_demand_forecasts_company_id ON public.inventory_demand_forecasts(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_demand_forecasts_warehouse_id ON public.inventory_demand_forecasts(warehouse_id);

-- inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_from_warehouse_id ON public.inventory_movements(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_to_warehouse_id ON public.inventory_movements(to_warehouse_id);

-- inventory_optimization_metrics
CREATE INDEX IF NOT EXISTS idx_inventory_optimization_metrics_company_id ON public.inventory_optimization_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_optimization_metrics_warehouse_id ON public.inventory_optimization_metrics(warehouse_id);

-- inventory_purchase_orders
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_orders_approved_by ON public.inventory_purchase_orders(approved_by);

-- inventory_purchasing_rules
CREATE INDEX IF NOT EXISTS idx_inventory_purchasing_rules_company_id ON public.inventory_purchasing_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_purchasing_rules_created_by ON public.inventory_purchasing_rules(created_by);;
