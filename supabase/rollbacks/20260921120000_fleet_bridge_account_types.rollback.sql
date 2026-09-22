-- Rollback of 20260921120000_fleet_bridge_account_types.sql
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Reverts only the values this migration could have written; user classifications
-- made later through the chart-of-accounts editor are untouched.
UPDATE public.chart_of_accounts
SET account_subtype = NULL, updated_at = now()
WHERE account_code IN ('11211', '11212')
  AND account_subtype = 'current_asset'
  AND lower(COALESCE(account_type, '')) IN ('asset', 'assets');

UPDATE public.chart_of_accounts
SET account_subtype = NULL, updated_at = now()
WHERE account_code IN ('21111', '21112')
  AND account_subtype = 'current_liability'
  AND lower(COALESCE(account_type, '')) IN ('liability', 'liabilities');

DELETE FROM public.account_mappings mapping
USING public.default_account_types account_type
WHERE mapping.default_account_type_id = account_type.id
  AND account_type.type_code IN ('VEHICLES_ASSET', 'VEHICLE_FINANCE_LONG_TERM', 'OPENING_EQUITY');

DELETE FROM public.default_account_types
WHERE type_code IN ('VEHICLES_ASSET', 'VEHICLE_FINANCE_LONG_TERM', 'OPENING_EQUITY');

COMMIT;
