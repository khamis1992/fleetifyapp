-- First, let's check what constraints exist on default_chart_of_accounts and fix the insert
-- Add the missing Level 6 accounts without the ON CONFLICT clause

INSERT INTO default_chart_of_accounts (
    account_code, account_name, account_name_ar, account_type, account_subtype,
    balance_type, parent_account_code, account_level, is_header, is_system, description, sort_order
) 
-- Only insert if the account doesn't already exist
SELECT '112101001', 'Ahmed Mohammed Ali - Account 1', 'أحمد محمد علي - حساب 1', 'asset', 'accounts_receivable', 'debit', '112101', 6, false, false, 'Individual customer account', 1
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '112101001')
UNION ALL
SELECT '112101002', 'Ahmed Mohammed Ali - Account 2', 'أحمد محمد علي - حساب 2', 'asset', 'accounts_receivable', 'debit', '112101', 6, false, false, 'Individual customer account', 2
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '112101002')
UNION ALL
SELECT '112101003', 'Ahmed Mohammed Ali - Account 3', 'أحمد محمد علي - حساب 3', 'asset', 'accounts_receivable', 'debit', '112101', 6, false, false, 'Individual customer account', 3
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '112101003')
UNION ALL
SELECT '112101004', 'Ahmed Mohammed Ali - Account 4', 'أحمد محمد علي - حساب 4', 'asset', 'accounts_receivable', 'debit', '112101', 6, false, false, 'Individual customer account', 4
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '112101004')
UNION ALL
SELECT '112101005', 'Ahmed Mohammed Ali - Account 5', 'أحمد محمد علي - حساب 5', 'asset', 'accounts_receivable', 'debit', '112101', 6, false, false, 'Individual customer account', 5
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '112101005')
UNION ALL
-- Individual customers under فاطمة سالم حسن (112102)
SELECT '112102001', 'Fatma Salem Hassan - Account 1', 'فاطمة سالم حسن - حساب 1', 'asset', 'accounts_receivable', 'debit', '112102', 6, false, false, 'Individual customer account', 1
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '112102001')
UNION ALL
SELECT '112102002', 'Fatma Salem Hassan - Account 2', 'فاطمة سالم حسن - حساب 2', 'asset', 'accounts_receivable', 'debit', '112102', 6, false, false, 'Individual customer account', 2
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '112102002')
UNION ALL
SELECT '112102003', 'Fatma Salem Hassan - Account 3', 'فاطمة سالم حسن - حساب 3', 'asset', 'accounts_receivable', 'debit', '112102', 6, false, false, 'Individual customer account', 3
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '112102003')
UNION ALL
SELECT '112102004', 'Fatma Salem Hassan - Account 4', 'فاطمة سالم حسن - حساب 4', 'asset', 'accounts_receivable', 'debit', '112102', 6, false, false, 'Individual customer account', 4
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '112102004')
UNION ALL
SELECT '112102005', 'Fatma Salem Hassan - Account 5', 'فاطمة سالم حسن - حساب 5', 'asset', 'accounts_receivable', 'debit', '112102', 6, false, false, 'Individual customer account', 5
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '112102005')
UNION ALL
-- Individual vehicle accounts - Toyota vehicles under تويوتا (115101)
SELECT '115101001', 'Toyota Camry 2023 - ABC123', 'تويوتا كامري 2023 - ABC123', 'asset', 'fixed_asset', 'debit', '115101', 6, false, false, 'Individual vehicle asset account', 1
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '115101001')
UNION ALL
SELECT '115101002', 'Toyota Corolla 2023 - ABC124', 'تويوتا كورولا 2023 - ABC124', 'asset', 'fixed_asset', 'debit', '115101', 6, false, false, 'Individual vehicle asset account', 2
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '115101002')
UNION ALL
SELECT '115101003', 'Toyota Prius 2023 - ABC125', 'تويوتا بريوس 2023 - ABC125', 'asset', 'fixed_asset', 'debit', '115101', 6, false, false, 'Individual vehicle asset account', 3
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '115101003')
UNION ALL
-- Individual supplier accounts - Auto dealerships under وكلاء السيارات (217101)
SELECT '217101001', 'Toyota Kuwait Co. - Account 1', 'شركة تويوتا الكويت - حساب 1', 'liability', 'accounts_payable', 'credit', '217101', 6, false, false, 'Individual supplier account', 1
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '217101001')
UNION ALL
SELECT '217101002', 'Nissan Al-Babtain Co. - Account 1', 'شركة نيسان البابطين - حساب 1', 'liability', 'accounts_payable', 'credit', '217101', 6, false, false, 'Individual supplier account', 2
WHERE NOT EXISTS (SELECT 1 FROM default_chart_of_accounts WHERE account_code = '217101002');

-- Now check the total count with Level 6 accounts
SELECT 'Level 6 accounts added successfully. New totals:' as message;
SELECT COUNT(*) as total_accounts, account_level, COUNT(*) as count_per_level 
FROM default_chart_of_accounts 
GROUP BY account_level 
ORDER BY account_level;