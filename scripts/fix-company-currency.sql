-- ===============================================
-- تحديث العملة لشركة العراف إلى الريال القطري
-- Fix Currency for Al-Arraf Company to QAR
-- ===============================================

-- 1. التحقق من الشركات الموجودة والعملة الحالية
-- Check existing companies and their current currency
SELECT 
  id,
  name,
  name_ar,
  currency,
  created_at
FROM companies
ORDER BY created_at DESC;

-- 2. تحديث شركة العراف (أو جميع الشركات) للريال القطري
-- Update Al-Arraf company (or all companies) to QAR

-- الخيار 1: تحديث شركة معينة بالاسم
-- Option 1: Update specific company by name
UPDATE companies 
SET currency = 'QAR'
WHERE name_ar LIKE '%العراف%' 
   OR name LIKE '%Arraf%'
   OR name LIKE '%Al-Arraf%';

-- الخيار 2: تحديث جميع الشركات (إذا كانت جميعها تستخدم الريال القطري)
-- Option 2: Update all companies (if they all use QAR)
-- UPDATE companies SET currency = 'QAR';

-- الخيار 3: تحديث شركة معينة بالمعرف
-- Option 3: Update specific company by ID
-- UPDATE companies SET currency = 'QAR' WHERE id = 'COMPANY_ID_HERE';

-- 3. التحقق من التحديث
-- Verify the update
SELECT 
  id,
  name,
  name_ar,
  currency,
  updated_at
FROM companies
WHERE currency = 'QAR';

-- ===============================================
-- ملاحظات مهمة / Important Notes:
-- ===============================================
-- 
-- العملات المدعومة / Supported Currencies:
-- - QAR: الريال القطري (Qatari Riyal) - 2 decimal places
-- - KWD: الدينار الكويتي (Kuwaiti Dinar) - 3 decimal places
-- - SAR: الريال السعودي (Saudi Riyal) - 2 decimal places
-- - AED: الدرهم الإماراتي (UAE Dirham) - 2 decimal places
-- - OMR: الريال العماني (Omani Rial) - 3 decimal places
-- - BHD: الدينار البحريني (Bahraini Dinar) - 3 decimal places
-- - USD: الدولار الأمريكي (US Dollar) - 2 decimal places
-- - EUR: اليورو (Euro) - 2 decimal places
--
-- العملة الافتراضية / Default Currency:
-- إذا لم تكن العملة محددة، النظام سيستخدم QAR افتراضياً
-- If currency is not set, the system will default to QAR
--
-- ===============================================

