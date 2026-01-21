-- ============================================================
-- سكريبت تنظيف الوثائق المكررة من قاعدة البيانات
-- يرجى تشغيل هذا السكريبت في Supabase SQL Editor
-- ============================================================

BEGIN;

-- 1. تنظيف جدول customer_documents (الوثائق المكررة للعملاء)
-- نحتفظ بأقدم سجل (الأول) ونحذف البقية التي لها نفس العميل والنوع والاسم
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY customer_id, document_type, document_name 
               ORDER BY created_at ASC
           ) as row_num
    FROM customer_documents
)
DELETE FROM customer_documents
WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
);

-- 2. تنظيف جدول contract_documents (الوثائق المكررة للعقود)
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY contract_id, document_type, document_name 
               ORDER BY created_at ASC
           ) as row_num
    FROM contract_documents
)
DELETE FROM contract_documents
WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
);

-- 3. تنظيف جدول vehicle_documents (الوثائق المكررة للمركبات)
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY vehicle_id, document_type, document_name 
               ORDER BY created_at ASC
           ) as row_num
    FROM vehicle_documents
)
DELETE FROM vehicle_documents
WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
);

COMMIT;

-- عرض ملخص بعد التنظيف
SELECT 'customer_documents' as table_name, COUNT(*) as current_count FROM customer_documents
UNION ALL
SELECT 'contract_documents', COUNT(*) FROM contract_documents
UNION ALL
SELECT 'vehicle_documents', COUNT(*) FROM vehicle_documents;
