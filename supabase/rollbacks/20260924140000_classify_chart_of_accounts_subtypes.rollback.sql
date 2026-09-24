-- Rollback: revert the subtype classification to NULL for the accounts that
-- the migration classified. Safe to run repeatedly (idempotent).
BEGIN;

UPDATE public.chart_of_accounts SET account_subtype=NULL
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IN (
    'cash','bank','accounts_receivable','allowance_for_doubtful_accounts',
    'inventory','prepaid_expenses','property_plant_equipment','accumulated_depreciation',
    'accounts_payable','accrued_expenses','tax_payable','current_liability',
    'short_term_loans','non_current_liability','current_asset'
  )
  AND is_header=false
  AND (
    -- Families touched by the forward migration
    account_code LIKE '1113%' OR account_code LIKE '1114%' OR account_code LIKE '1115%'
    OR account_code LIKE '112%' OR account_code LIKE '113%' OR account_code='1300'
    OR account_code LIKE '114%' OR account_code LIKE '116%' OR account_code LIKE '117%'
    OR account_code LIKE '121%' OR account_code LIKE '141%' OR account_code LIKE '142%'
    OR account_code LIKE '143%' OR account_code LIKE '144%'
    OR account_code LIKE '2010%' OR account_code LIKE '2100%' OR account_code LIKE '2110%'
    OR account_code LIKE '21141' OR account_code LIKE '2120%' OR account_code LIKE '2130%'
    OR account_code LIKE '2200%' OR account_code LIKE '2201%' OR account_code LIKE '2210%'
    OR account_code LIKE '2300%' OR account_code='2400' OR account_code='2500'
    OR account_code='1204' OR account_code='1203' OR account_code='111112'
  );

COMMIT;