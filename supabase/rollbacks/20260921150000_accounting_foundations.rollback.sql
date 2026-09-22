-- Rollback of 20260921150000_accounting_foundations.sql
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Repoint PAYABLES back to the dummy maintenance payable and drop the new roles.
UPDATE public.account_mappings m
SET chart_of_accounts_id = a.id, updated_at = now()
FROM public.default_account_types t, public.chart_of_accounts a
WHERE m.default_account_type_id = t.id AND t.type_code = 'PAYABLES'
  AND m.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND a.company_id = m.company_id AND a.account_code = '21141';

DELETE FROM public.account_mappings m
USING public.default_account_types t
WHERE m.default_account_type_id = t.id
  AND m.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND t.type_code IN ('VEHICLE_INSTALLMENT_PAYABLE', 'CUSTOMER_ADVANCES');

UPDATE public.chart_of_accounts
SET account_subtype = NULL, updated_at = now()
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_code = '20201' AND account_subtype = 'customer_deposits';

DELETE FROM public.chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_code IN ('21111', '21131')
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entry_lines l
    WHERE l.account_id = public.chart_of_accounts.id
  );

ALTER TABLE public.banks DROP COLUMN IF EXISTS chart_of_accounts_id;

DELETE FROM public.default_account_types WHERE type_code = 'CUSTOMER_ADVANCES';

NOTIFY pgrst,'reload schema';
COMMIT;
