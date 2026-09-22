-- Accounting foundations before installment/bank sync:
--  * real postable trade-payables account + PAYABLES remap (was a zero-balance
--    dummy maintenance payable), postable vehicle-installment payable mapping,
--    CUSTOMER_ADVANCES role mapped to the existing advance-payments account;
--  * banks linked to their ledger account for the bank<->ledger bridge.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1. Postable payable accounts under the supplier headers (levels follow the
--    existing 211/2111/2113 tree; the wizard-style detail codes were free).
-- ---------------------------------------------------------------------------
INSERT INTO public.chart_of_accounts (
  company_id, account_code, account_name, account_name_ar, account_type, account_subtype,
  balance_type, account_level, is_header, is_active, parent_account_code, sort_order
)
SELECT v.company_id, v.code, v.name_en, v.name_ar, 'liabilities', v.subtype,
       'credit', 5, false, true, v.parent, NULL
FROM (VALUES
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, '21111', 'Local Supplier Payables', 'ذمم الموردين المحليين', 'accounts_payable', '2111'),
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, '21131', 'Vehicle Dealer Financing Payables', 'ذمم تمويل وكلاء السيارات', 'short_term_loans', '2113')
) AS v(company_id, code, name_en, name_ar, subtype, parent)
WHERE NOT EXISTS (
  SELECT 1 FROM public.chart_of_accounts a
  WHERE a.company_id = v.company_id AND a.account_code = v.code
);

-- Classify the existing advance-payments account (one of the blocking seven).
UPDATE public.chart_of_accounts
SET account_subtype = 'customer_deposits', updated_at = now()
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_code = '20201'
  AND NULLIF(btrim(COALESCE(account_subtype, '')), '') IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Role mappings: PAYABLES -> real trade payables; VEHICLE_INSTALLMENT_PAYABLE
--    -> dealer financing payables; CUSTOMER_ADVANCES -> existing 20201.
--    account_mappings is UNIQUE (company_id, default_account_type_id), so
--    existing rows are repointed; missing rows are inserted.
-- ---------------------------------------------------------------------------
INSERT INTO public.default_account_types (type_code, type_name, type_name_ar, account_category, description, is_system)
SELECT 'CUSTOMER_ADVANCES', 'Customer Advance Payments', 'دفعات العملاء المقدمة', 'liabilities',
       'Unapplied customer receipts held as advances until allocated to invoices.', true
WHERE NOT EXISTS (SELECT 1 FROM public.default_account_types t WHERE t.type_code = 'CUSTOMER_ADVANCES');

-- Repoint the existing PAYABLES mapping row away from the dummy 21141.
UPDATE public.account_mappings m
SET chart_of_accounts_id = a.id, is_active = true, updated_at = now()
FROM public.default_account_types t, public.chart_of_accounts a
WHERE m.default_account_type_id = t.id
  AND t.type_code = 'PAYABLES'
  AND m.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND a.company_id = m.company_id AND a.account_code = '21111';

-- Insert role mappings only where no row exists for the type yet.
INSERT INTO public.account_mappings (company_id, default_account_type_id, chart_of_accounts_id, is_active, mapped_by)
SELECT v.company_id, t.id, a.id, true, NULL
FROM (VALUES
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 'VEHICLE_INSTALLMENT_PAYABLE', '21131'),
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 'CUSTOMER_ADVANCES', '20201')
) AS v(company_id, type_code, account_code)
JOIN public.default_account_types t ON t.type_code = v.type_code
JOIN public.chart_of_accounts a ON a.company_id = v.company_id AND a.account_code = v.account_code
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_mappings m
  WHERE m.company_id = v.company_id AND m.default_account_type_id = t.id
);

-- ---------------------------------------------------------------------------
-- 3. Bank module <-> ledger account linkage.
-- ---------------------------------------------------------------------------
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS chart_of_accounts_id uuid
  REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;

-- Link every bank to the mapped BANK-role account when unambiguous.
UPDATE public.banks b
SET chart_of_accounts_id = m.chart_of_accounts_id
FROM public.account_mappings m
JOIN public.default_account_types t ON t.id = m.default_account_type_id
WHERE t.type_code = 'BANK'
  AND m.company_id = b.company_id AND COALESCE(m.is_active, true)
  AND b.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND b.chart_of_accounts_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.banks other WHERE other.company_id = b.company_id AND other.id <> b.id AND other.chart_of_accounts_id = m.chart_of_accounts_id);

INSERT INTO public.audit_logs (action, company_id, entity_name, resource_type, severity, notes, metadata)
VALUES (
  'accounting_foundations_remapped',
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  'chart_of_accounts/account_mappings',
  'account_mapping',
  'info',
  'PAYABLES remapped from dummy 21141 to real trade payables; installment payable and customer-advances roles mapped; banks linked to ledger accounts (migration 20260921150000).',
  jsonb_build_object('payablesFrom', '21141', 'payablesTo', '21111', 'installmentPayable', '21131', 'customerAdvances', '20201', 'at', now())
);

NOTIFY pgrst,'reload schema';
COMMIT;
