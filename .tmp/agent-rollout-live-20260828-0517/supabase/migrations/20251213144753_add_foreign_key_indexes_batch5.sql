-- Add indexes to foreign keys for performance optimization - Batch 5
-- Inventory and Invoice related tables

-- inventory_supplier_categories
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_categories_created_by ON public.inventory_supplier_categories(created_by);

-- inventory_supplier_category_mapping
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_category_mapping_category_id ON public.inventory_supplier_category_mapping(category_id);

-- inventory_supplier_products
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_products_created_by ON public.inventory_supplier_products(created_by);

-- inventory_warehouse_transfers
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_transfers_created_by ON public.inventory_warehouse_transfers(created_by);

-- invoice_items
CREATE INDEX IF NOT EXISTS idx_invoice_items_account_id ON public.invoice_items(account_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_cost_center_id ON public.invoice_items(cost_center_id);

-- invoice_ocr_logs
CREATE INDEX IF NOT EXISTS idx_invoice_ocr_logs_invoice_id ON public.invoice_ocr_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_ocr_logs_matched_contract_id ON public.invoice_ocr_logs(matched_contract_id);
CREATE INDEX IF NOT EXISTS idx_invoice_ocr_logs_matched_customer_id ON public.invoice_ocr_logs(matched_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_ocr_logs_processed_by ON public.invoice_ocr_logs(processed_by);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_cost_center_id ON public.invoices(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_invoices_fixed_asset_id ON public.invoices(fixed_asset_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_id ON public.invoices(vendor_id);;
