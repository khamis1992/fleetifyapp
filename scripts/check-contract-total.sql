-- فحص حساب إجمالي قيمة العقد C-ALF-0066
-- Check contract total calculation for C-ALF-0066

SELECT 
  contract_number,
  monthly_amount,
  start_date,
  end_date,
  status,
  
  -- حساب عدد الأشهر (مع إضافة 1 للشهر الأخير)
  EXTRACT(YEAR FROM AGE(end_date, start_date)) * 12 + 
  EXTRACT(MONTH FROM AGE(end_date, start_date)) + 1 as calculated_months,
  
  -- حساب إجمالي قيمة العقد
  monthly_amount * (
    EXTRACT(YEAR FROM AGE(end_date, start_date)) * 12 + 
    EXTRACT(MONTH FROM AGE(end_date, start_date)) + 1
  ) as calculated_total,
  
  -- عرض البيانات الإضافية إن وجدت
  deposit_amount,
  insurance_amount,
  
  -- حساب الفرق بالأيام
  end_date - start_date as days_difference,
  
  -- معلومات إضافية
  created_at,
  updated_at

FROM contracts
WHERE contract_number = 'C-ALF-0066';

-- عرض الفواتير المرتبطة بالعقد
SELECT 
  'Invoices for contract' as info,
  COUNT(*) as invoice_count,
  SUM(total_amount) as total_invoiced,
  SUM(paid_amount) as total_paid,
  SUM(total_amount - COALESCE(paid_amount, 0)) as balance_due
FROM invoices
WHERE contract_id = (
  SELECT id FROM contracts WHERE contract_number = 'C-ALF-0066'
);

-- عرض تفاصيل كل فاتورة
SELECT 
  invoice_number,
  invoice_date,
  due_date,
  total_amount,
  paid_amount,
  total_amount - COALESCE(paid_amount, 0) as balance,
  payment_status,
  status
FROM invoices
WHERE contract_id = (
  SELECT id FROM contracts WHERE contract_number = 'C-ALF-0066'
)
ORDER BY invoice_date;
