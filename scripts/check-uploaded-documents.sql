-- ============================================================
-- فحص الملفات المرفوعة (130 ملف بطاقة شخصية)
-- ============================================================

-- 1. عدد المستندات المرفوعة من نوع national_id
SELECT 
  COUNT(*) as total_national_id_documents,
  COUNT(DISTINCT customer_id) as unique_customers,
  MIN(created_at) as first_upload,
  MAX(created_at) as last_upload
FROM customer_documents
WHERE document_type = 'national_id';

-- 2. تفاصيل جميع المستندات المرفوعة مع معلومات العميل
SELECT 
  cd.id,
  cd.customer_id,
  cd.document_name,
  cd.file_path,
  cd.file_size,
  cd.mime_type,
  cd.created_at,
  cd.company_id,
  c.first_name,
  c.last_name,
  c.customer_code,
  c.phone,
  c.national_id as customer_national_id
FROM customer_documents cd
LEFT JOIN customers c ON cd.customer_id = c.id
WHERE cd.document_type = 'national_id'
ORDER BY cd.created_at DESC
LIMIT 130;

-- 3. عدد المستندات لكل عميل
SELECT 
  c.id as customer_id,
  c.first_name,
  c.last_name,
  c.customer_code,
  c.phone,
  COUNT(cd.id) as document_count
FROM customers c
INNER JOIN customer_documents cd ON c.id = cd.customer_id
WHERE cd.document_type = 'national_id'
GROUP BY c.id, c.first_name, c.last_name, c.customer_code, c.phone
ORDER BY document_count DESC;

-- 4. العقود المرتبطة بالعملاء الذين لديهم بطاقات شخصية
SELECT 
  c.id as customer_id,
  c.first_name || ' ' || c.last_name as customer_name,
  COUNT(cd.id) as national_id_count,
  COUNT(rc.id) as contract_count,
  STRING_AGG(DISTINCT rc.contract_number, ', ') as contract_numbers,
  STRING_AGG(DISTINCT v.plate_number, ', ') as vehicle_plates
FROM customers c
INNER JOIN customer_documents cd ON c.id = cd.customer_id
LEFT JOIN rental_contracts rc ON c.id = rc.customer_id
LEFT JOIN vehicles v ON rc.vehicle_id = v.id
WHERE cd.document_type = 'national_id'
GROUP BY c.id, c.first_name, c.last_name
ORDER BY national_id_count DESC, contract_count DESC;

-- 5. المركبات المرتبطة بالعملاء الذين لديهم بطاقات شخصية
SELECT DISTINCT
  v.id as vehicle_id,
  v.plate_number,
  v.make,
  v.model,
  v.year,
  c.id as customer_id,
  c.first_name || ' ' || c.last_name as customer_name,
  COUNT(cd.id) as customer_national_id_count
FROM vehicles v
INNER JOIN rental_contracts rc ON v.id = rc.vehicle_id
INNER JOIN customers c ON rc.customer_id = c.id
INNER JOIN customer_documents cd ON c.id = cd.customer_id
WHERE cd.document_type = 'national_id'
GROUP BY v.id, v.plate_number, v.make, v.model, v.year, c.id, c.first_name, c.last_name
ORDER BY customer_national_id_count DESC;

-- 6. ملخص شامل: العملاء، المستندات، العقود، المركبات
SELECT 
  'إجمالي المستندات' as metric,
  COUNT(*)::text as value
FROM customer_documents
WHERE document_type = 'national_id'
UNION ALL
SELECT 
  'عدد العملاء المختلفين' as metric,
  COUNT(DISTINCT customer_id)::text as value
FROM customer_documents
WHERE document_type = 'national_id'
UNION ALL
SELECT 
  'عدد العقود المرتبطة' as metric,
  COUNT(DISTINCT rc.id)::text as value
FROM customer_documents cd
INNER JOIN customers c ON cd.customer_id = c.id
INNER JOIN rental_contracts rc ON c.id = rc.customer_id
WHERE cd.document_type = 'national_id'
UNION ALL
SELECT 
  'عدد المركبات المرتبطة' as metric,
  COUNT(DISTINCT v.id)::text as value
FROM customer_documents cd
INNER JOIN customers c ON cd.customer_id = c.id
INNER JOIN rental_contracts rc ON c.id = rc.customer_id
INNER JOIN vehicles v ON rc.vehicle_id = v.id
WHERE cd.document_type = 'national_id';
