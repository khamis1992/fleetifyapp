-- ====================================================================
-- SQL Script: Comprehensive Verification Report
-- ====================================================================
-- This script compares JSON data with database records
-- Run this in Supabase SQL Editor after loading JSON data
-- ====================================================================

-- Step 1: Create a temporary table with JSON data structure
-- (In real execution, you would load JSON data here)
-- For now, we'll use a sample query to verify matches

-- Check customers matching by name patterns
WITH json_sample AS (
  SELECT 'انور محمد ابراهيم' as customer_name, '70561365' as phone, '10172' as vehicle UNION ALL
  SELECT 'KIBROM', '30796407', '10174' UNION ALL
  SELECT 'احمد الشيخ الصديق', '50118063', '10197' UNION ALL
  SELECT 'محمد العويني', '66816813', '21860' UNION ALL
  SELECT 'خميس الجبر', '66707063', '893411' UNION ALL
  SELECT 'عماد العياري', '66071051', '11473' UNION ALL
  SELECT 'فادي السعيد', '66043445', '21849' UNION ALL
  SELECT 'محمد محمد احمد', '70007983', '2766' UNION ALL
  SELECT 'عبد الغفور درار', '77122519', '2767' UNION ALL
  SELECT 'عبد العزيز محمد', '70342655', '2768'
)
SELECT 
  'CUSTOMER_MATCH' as check_type,
  js.customer_name as json_name,
  js.phone as json_phone,
  js.vehicle as json_vehicle,
  CASE 
    WHEN c.id IS NOT NULL THEN 'MATCHED'
    ELSE 'NOT_FOUND'
  END as status,
  c.first_name_ar || ' ' || COALESCE(c.last_name_ar, '') as db_name_ar,
  c.first_name || ' ' || COALESCE(c.last_name, '') as db_name_en,
  c.phone as db_phone,
  CASE 
    WHEN normalize_phone(c.phone) = normalize_phone(js.phone) THEN 'MATCH'
    WHEN c.phone IS NULL THEN 'MISSING'
    ELSE 'MISMATCH'
  END as phone_status
FROM json_sample js
LEFT JOIN customers c ON 
  TRIM(c.first_name_ar || ' ' || COALESCE(c.last_name_ar, '')) = TRIM(js.customer_name)
  OR TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')) = TRIM(js.customer_name)
  OR c.company_name = TRIM(js.customer_name)
  OR c.company_name_ar = TRIM(js.customer_name);

