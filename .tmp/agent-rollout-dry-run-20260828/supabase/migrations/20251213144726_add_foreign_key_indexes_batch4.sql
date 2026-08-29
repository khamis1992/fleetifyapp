-- Add indexes to foreign keys for performance optimization - Batch 4
-- Inventory related tables (Part 2)

-- inventory_replenishment_requests
CREATE INDEX IF NOT EXISTS idx_inventory_replenishment_requests_approved_by ON public.inventory_replenishment_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_inventory_replenishment_requests_created_by ON public.inventory_replenishment_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_replenishment_requests_rule_id ON public.inventory_replenishment_requests(rule_id);
CREATE INDEX IF NOT EXISTS idx_inventory_replenishment_requests_warehouse_id ON public.inventory_replenishment_requests(warehouse_id);

-- inventory_replenishment_rules
CREATE INDEX IF NOT EXISTS idx_inventory_replenishment_rules_category_id ON public.inventory_replenishment_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_replenishment_rules_created_by ON public.inventory_replenishment_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_replenishment_rules_warehouse_id ON public.inventory_replenishment_rules(warehouse_id);

-- inventory_reports
CREATE INDEX IF NOT EXISTS idx_inventory_reports_company_id ON public.inventory_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reports_generated_by ON public.inventory_reports(generated_by);

-- inventory_snapshots
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_company_id ON public.inventory_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_item_id ON public.inventory_snapshots(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_warehouse_id ON public.inventory_snapshots(warehouse_id);

-- inventory_stock_take_lines
CREATE INDEX IF NOT EXISTS idx_inventory_stock_take_lines_counted_by ON public.inventory_stock_take_lines(counted_by);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_take_lines_item_id ON public.inventory_stock_take_lines(item_id);

-- inventory_stock_takes
CREATE INDEX IF NOT EXISTS idx_inventory_stock_takes_approved_by ON public.inventory_stock_takes(approved_by);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_takes_counted_by ON public.inventory_stock_takes(counted_by);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_takes_created_by ON public.inventory_stock_takes(created_by);;
