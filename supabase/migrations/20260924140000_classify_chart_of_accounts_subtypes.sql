-- Classify the 176 active accounts that had no account_subtype, by their
-- well-known account families. The balance sheet RPC groups accounts into
-- current/non-current captions via subtype; unclassified accounts land in the
-- "awaiting classification" caption and trip the account_classification check.
-- Reversible: see the matching rollback (classification only, no accounts created).

BEGIN;

-- 1) Cash boxes and bank accounts (codes 111x family)
UPDATE public.chart_of_accounts SET account_subtype='cash'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND (account_name_ar ILIKE '%صندوق%' OR account_name ILIKE '%cash box%');

UPDATE public.chart_of_accounts SET account_subtype='bank'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND (account_code LIKE '1113%' OR account_code LIKE '1114%' OR account_code LIKE '1115%'
       OR account_name_ar ILIKE '%بنك%' OR account_name ILIKE '%bank%');

-- 2) Customer receivables (per-customer accounts and corporate customers)
UPDATE public.chart_of_accounts SET account_subtype='accounts_receivable'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND (account_code LIKE '11211%' OR account_code LIKE '11212%' OR account_code LIKE '11213%'
       OR account_code LIKE '1121%' OR account_code LIKE '1122%'
       OR account_name_ar ILIKE '%عميل%' OR account_name_ar ILIKE '%عملاء%'
       OR account_name ILIKE '%customer%' OR account_name ILIKE '%company%');

-- 3) Allowance for doubtful debts
UPDATE public.chart_of_accounts SET account_subtype='allowance_for_doubtful_accounts'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND (account_code LIKE '1123%' OR account_code='1204'
       OR account_name_ar ILIKE '%مخصص ديون%' OR account_name_ar ILIKE '%مخصص الديون%'
       OR account_name ILIKE '%allowance%');

-- 4) Notes receivable (bills of exchange and cheques)
UPDATE public.chart_of_accounts SET account_subtype='current_asset'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND (account_code LIKE '1124%' OR account_code LIKE '1151%' OR account_code LIKE '1152%'
       OR account_name_ar ILIKE '%كمبيال%' OR account_name_ar ILIKE '%سندات قبض%'
       OR account_name_ar ILIKE '%شيكات%');

-- 5) Inventory: spare parts, consumables, oils, tires, cleaning materials (113x family + 1300)
UPDATE public.chart_of_accounts SET account_subtype='inventory'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND (account_code LIKE '113%' OR account_code='1300'
       OR account_name_ar ILIKE '%قطع غيار%' OR account_name_ar ILIKE '%زيت%'
       OR account_name_ar ILIKE '%إطارات%' OR account_name_ar ILIKE '%مواد%'
       OR account_name_ar ILIKE '%شامبو%' OR account_name_ar ILIKE '%ملمع%'
       OR account_name_ar ILIKE '%مناديل%' OR account_name_ar ILIKE '%سائل%'
       OR account_name_ar ILIKE '%شحوم%' OR account_name_ar ILIKE '%أوراق%' OR account_name_ar ILIKE '%أقلام%');

-- 6) Prepaid expenses: insurance, rent, fees, annual subscriptions, supplier advances (114x family)
UPDATE public.chart_of_accounts SET account_subtype='prepaid_expenses'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND (account_code LIKE '114%'
       OR account_name_ar ILIKE '%تأمين%' OR account_name_ar ILIKE '%إيجار%'
       OR account_name_ar ILIKE '%رسوم%' OR account_name_ar ILIKE '%اشتراكات%'
       OR account_name_ar ILIKE '%دفعات مقدمة للموردين%');

-- 7) Refundable deposits held and staff advances
UPDATE public.chart_of_accounts SET account_subtype='current_asset'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND (account_code LIKE '116%' OR account_code LIKE '117%'
       OR account_name_ar ILIKE '%ضمانات%' OR account_name_ar ILIKE '%سلف موظفين%'
       OR account_name_ar ILIKE '%ودائع%' OR account_name_ar ILIKE '%أمانات%');

-- 8) Vehicles and fixed assets (121x individual vehicles, 14x fixed asset family)
UPDATE public.chart_of_accounts SET account_subtype='property_plant_equipment'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND (account_code LIKE '121%' OR account_code LIKE '141%' OR account_code LIKE '143%' OR account_code LIKE '144%'
       OR account_name_ar ILIKE '%المركبات%' OR account_name_ar ILIKE '%المباني%'
       OR account_name_ar ILIKE '%الأثاث%');

UPDATE public.chart_of_accounts SET account_subtype='accumulated_depreciation'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND (account_code LIKE '142%' OR account_name_ar ILIKE '%مجمع%');

-- 9) Legal-collection receivables
UPDATE public.chart_of_accounts SET account_subtype='accounts_receivable'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND account_name_ar ILIKE '%تحصيل القانوني%';

-- 10) Liabilities: payables, accrued salaries, taxes, short/long-term loans
UPDATE public.chart_of_accounts SET account_subtype='accounts_payable'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND lower(account_type) IN ('liability','liabilities')
  AND (account_code LIKE '2010%' OR account_code LIKE '2100%'
       OR account_name_ar ILIKE '%ذمم الدائنة%' OR account_name_ar ILIKE '%ذمم الموردين%'
       OR account_code LIKE '21141' OR account_name_ar ILIKE '%ذمم صيانة%');

UPDATE public.chart_of_accounts SET account_subtype='accrued_expenses'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND lower(account_type) IN ('liability','liabilities')
  AND (account_code LIKE '2110%' OR account_code='2500'
       OR account_name_ar ILIKE '%رواتب مستحقة%');

UPDATE public.chart_of_accounts SET account_subtype='tax_payable'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND lower(account_type) IN ('liability','liabilities')
  AND (account_code LIKE '2130%' OR account_code LIKE '2201%' OR account_code LIKE '2210%'
       OR account_name_ar ILIKE '%ضريبة%' OR account_name_ar ILIKE '%ضرائب%');

UPDATE public.chart_of_accounts SET account_subtype='current_liability'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND lower(account_type) IN ('liability','liabilities')
  AND (account_code LIKE '2120%' OR account_name_ar ILIKE '%خصومات الموظفين%');

UPDATE public.chart_of_accounts SET account_subtype='short_term_loans'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND lower(account_type) IN ('liability','liabilities')
  AND (account_code LIKE '2200%' OR account_name_ar ILIKE '%القروض قصيرة%');

UPDATE public.chart_of_accounts SET account_subtype='non_current_liability'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_subtype IS NULL AND is_header=false
  AND lower(account_type) IN ('liability','liabilities')
  AND (account_code LIKE '2300%' OR account_code LIKE '2400%'
       OR account_name_ar ILIKE '%أقساط المركبات%' OR account_name_ar ILIKE '%القروض طويلة%');

-- 11) The two accounts the name patterns missed
UPDATE public.chart_of_accounts SET account_subtype='cash'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_code='111112' AND account_subtype IS NULL AND is_header=false;

UPDATE public.chart_of_accounts SET account_subtype='accounts_receivable'
WHERE company_id='24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND account_code='1203' AND account_subtype IS NULL AND is_header=false;

COMMIT;