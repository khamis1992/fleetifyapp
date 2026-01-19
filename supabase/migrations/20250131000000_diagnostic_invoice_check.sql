-- ================================================================
-- DIAGNOSTIC: Check current invoice state
-- ================================================================
-- This diagnostic query helps understand the current state of invoices
-- ================================================================

-- 1. Check how many contracts we have and their date ranges
SELECT 
  'Active Contracts' as check_type,
  COUNT(*) as total_count,
  MIN(start_date) as earliest_start,
  MAX(COALESCE(end_date, CURRENT_DATE)) as latest_end
FROM contracts
WHERE status = 'active';

-- 2. Check invoice distribution by contract
SELECT 
  'Invoices per Contract' as check_type,
  contract_id,
  COUNT(*) as invoice_count,
  MIN(due_date) as first_due_date,
  MAX(due_date) as last_due_date,
  COUNT(CASE WHEN EXTRACT(DAY FROM due_date) = 1 THEN 1 END) as invoices_on_1st,
  COUNT(CASE WHEN EXTRACT(DAY FROM due_date) != 1 THEN 1 END) as invoices_not_on_1st
FROM invoices
WHERE contract_id IS NOT NULL
  AND (status IS NULL OR status != 'cancelled')
GROUP BY contract_id
LIMIT 10;

-- 3. Check sample invoices to see their actual due_date patterns
SELECT 
  'Sample Invoices' as check_type,
  i.id,
  i.contract_id,
  c.contract_number,
  i.invoice_number,
  i.due_date,
  EXTRACT(DAY FROM i.due_date) as due_day,
  i.payment_status,
  i.status
FROM invoices i
JOIN contracts c ON i.contract_id = c.id
WHERE i.contract_id IS NOT NULL
  AND (i.status IS NULL OR i.status != 'cancelled')
ORDER BY i.contract_id, i.due_date
LIMIT 20;

-- 4. Check expected vs actual invoice counts
WITH contract_months AS (
  SELECT 
    c.id as contract_id,
    c.contract_number,
    c.start_date,
    COALESCE(c.end_date, CURRENT_DATE) as effective_end_date,
    -- Calculate expected number of months (starting from month AFTER start_date)
    DATE_PART('year', AGE(COALESCE(c.end_date, CURRENT_DATE), c.start_date)) * 12 + 
    DATE_PART('month', AGE(COALESCE(c.end_date, CURRENT_DATE), c.start_date)) as expected_months
  FROM contracts c
  WHERE c.status = 'active'
),
actual_invoices AS (
  SELECT 
    contract_id,
    COUNT(*) as actual_count
  FROM invoices
  WHERE contract_id IS NOT NULL
    AND (status IS NULL OR status != 'cancelled')
  GROUP BY contract_id
)
SELECT 
  'Expected vs Actual' as check_type,
  cm.contract_number,
  cm.start_date,
  cm.effective_end_date,
  cm.expected_months,
  COALESCE(ai.actual_count, 0) as actual_invoices,
  (cm.expected_months - COALESCE(ai.actual_count, 0)) as missing_invoices
FROM contract_months cm
LEFT JOIN actual_invoices ai ON cm.contract_id = ai.contract_id
ORDER BY missing_invoices DESC
LIMIT 10;

