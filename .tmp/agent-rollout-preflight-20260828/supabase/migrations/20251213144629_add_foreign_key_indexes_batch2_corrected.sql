-- Add indexes to foreign keys for performance optimization - Batch 2
-- Contract related tables

-- contract_amendments
CREATE INDEX IF NOT EXISTS idx_contract_amendments_approved_by ON public.contract_amendments(approved_by);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_created_by ON public.contract_amendments(created_by);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_rejected_by ON public.contract_amendments(rejected_by);

-- contract_documents
CREATE INDEX IF NOT EXISTS idx_contract_documents_condition_report_id ON public.contract_documents(condition_report_id);

-- contract_notifications
CREATE INDEX IF NOT EXISTS idx_contract_notifications_contract_id ON public.contract_notifications(contract_id);

-- contract_templates
CREATE INDEX IF NOT EXISTS idx_contract_templates_account_id ON public.contract_templates(account_id);

-- delinquent_customers
CREATE INDEX IF NOT EXISTS idx_delinquent_customers_vehicle_id ON public.delinquent_customers(vehicle_id);

-- depreciation_records
CREATE INDEX IF NOT EXISTS idx_depreciation_records_fixed_asset_id ON public.depreciation_records(fixed_asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_records_journal_entry_id ON public.depreciation_records(journal_entry_id);

-- dispatch_permit_attachments
CREATE INDEX IF NOT EXISTS idx_dispatch_permit_attachments_permit_id ON public.dispatch_permit_attachments(permit_id);

-- essential_account_mappings
CREATE INDEX IF NOT EXISTS idx_essential_account_mappings_account_id ON public.essential_account_mappings(account_id);

-- event_subscriptions
CREATE INDEX IF NOT EXISTS idx_event_subscriptions_company_id ON public.event_subscriptions(company_id);

-- fixed_assets
CREATE INDEX IF NOT EXISTS idx_fixed_assets_asset_account_id ON public.fixed_assets(asset_account_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_depreciation_account_id ON public.fixed_assets(depreciation_account_id);;
