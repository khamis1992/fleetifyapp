-- ============================================
-- فحص بيانات التذكيرات وأسماء العملاء
-- Check Reminders Data and Customer Names
-- ============================================

-- 1. فحص الرسائل المرسلة مع أسماء العملاء
SELECT 
  rs.id,
  rs.customer_name,
  c.first_name_ar,
  c.last_name_ar,
  c.company_name,
  rs.message_template,
  i.invoice_number,
  i.total_amount,
  comp.name as company_name,
  comp.currency
FROM reminder_schedules rs
LEFT JOIN customers c ON rs.customer_id = c.id
LEFT JOIN invoices i ON rs.invoice_id = i.id
LEFT JOIN companies comp ON rs.company_id = comp.id
WHERE rs.status = 'sent'
ORDER BY rs.sent_at DESC
LIMIT 10;

-- 2. فحص العملاء المرتبطين بالعقود
SELECT 
  c.id,
  c.first_name_ar,
  c.last_name_ar,
  c.company_name,
  c.phone,
  COUNT(contracts.id) as contract_count
FROM customers c
LEFT JOIN contracts ON contracts.customer_id = c.id
GROUP BY c.id, c.first_name_ar, c.last_name_ar, c.company_name, c.phone
ORDER BY contract_count DESC
LIMIT 20;

-- 3. فحص الشركات والعملات
SELECT 
  id,
  name,
  name_ar,
  currency,
  country
FROM companies;

-- 4. فحص العقود مع أسماء العملاء
SELECT 
  contracts.id,
  contracts.contract_number,
  c.first_name_ar,
  c.last_name_ar,
  c.company_name,
  contracts.monthly_rent,
  contracts.company_id,
  comp.currency
FROM contracts
LEFT JOIN customers c ON contracts.customer_id = c.id
LEFT JOIN companies comp ON contracts.company_id = comp.id
WHERE contracts.status = 'active'
LIMIT 20;

-- 5. فحص قالب الرسائل
SELECT 
  reminder_type,
  message_template,
  company_id
FROM reminder_schedules
WHERE status = 'sent'
GROUP BY reminder_type, message_template, company_id
LIMIT 5;

