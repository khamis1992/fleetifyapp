-- Fleet-to-ledger bridge: role account types and classification backfill.
-- Seeds the default account type roles the bridge resolves at runtime (no hardcoded
-- chart codes such as 2221/2300 anywhere) and classifies the wizard-created detail
-- accounts that currently block balance-sheet approval with missing account_subtype.
BEGIN;
SET LOCAL lock_timeout = '5s';

INSERT INTO public.default_account_types (
  type_code, type_name, type_name_ar, account_category, description, is_system
)
SELECT *
FROM (VALUES
  ('VEHICLES_ASSET', 'Vehicles Fixed Asset', 'أصول المركبات', 'assets',
   'Debit side of the vehicle capitalization entry bridged from the fleet.', true),
  ('VEHICLE_FINANCE_LONG_TERM', 'Vehicle Financing Long-Term Payable', 'التزامات تمويل المركبات طويلة الأجل', 'liabilities',
   'Non-current portion of vehicle financing obligations due beyond twelve months of the reporting date.', true),
  ('OPENING_EQUITY', 'Opening Ledger Equity', 'حقوق بدء الدفتر', 'equity',
   'Balancing equity account for one-time bridge entries that open the ledger from operational data.', true)
) AS seed(type_code, type_name, type_name_ar, account_category, description, is_system)
WHERE NOT EXISTS (
  SELECT 1 FROM public.default_account_types existing WHERE existing.type_code = seed.type_code
);

-- Wizard-created receivable/payable detail accounts carry balances with no subtype and
-- therefore block approval. Only the known codes are classified, and only when the raw
-- account type agrees; everything else remains an explicit review action.
UPDATE public.chart_of_accounts
SET account_subtype = 'current_asset', updated_at = now()
WHERE account_code IN ('11211', '11212')
  AND lower(COALESCE(account_type, '')) IN ('asset', 'assets')
  AND NULLIF(btrim(COALESCE(account_subtype, '')), '') IS NULL;

UPDATE public.chart_of_accounts
SET account_subtype = 'current_liability', updated_at = now()
WHERE account_code IN ('21111', '21112')
  AND lower(COALESCE(account_type, '')) IN ('liability', 'liabilities')
  AND NULLIF(btrim(COALESCE(account_subtype, '')), '') IS NULL;

COMMIT;
