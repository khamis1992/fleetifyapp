-- إصلاح مشكلة المستويات في نسخ القوالب

-- 1. تنظيف البيانات الخاطئة والمكررة
DELETE FROM chart_of_accounts 
WHERE company_id IN (SELECT id FROM companies WHERE id IS NOT NULL)
AND account_level > 6; -- حذف الحسابات بمستويات خاطئة

-- 2. إصلاح حساب المستويات بناءً على كود الحساب
-- المستوى يتم تحديده بناءً على طول الكود
-- المستوى 1: كود من رقم واحد (1, 2, 3, 4, 5)
-- المستوى 2: كود من رقمين (11, 12, 21, 22, ...)
-- المستوى 3: كود من 3 أرقام (111, 112, 211, ...)
-- المستوى 4: كود من 4 أرقام (1111, 1112, ...)
-- المستوى 5: كود من 5 أرقام (11111, 11112, ...)
-- المستوى 6: كود من 6 أرقام (111111, 111112, ...)

UPDATE chart_of_accounts 
SET account_level = CASE 
  WHEN LENGTH(account_code) = 1 THEN 1
  WHEN LENGTH(account_code) = 2 THEN 2
  WHEN LENGTH(account_code) = 3 THEN 3
  WHEN LENGTH(account_code) = 4 THEN 4
  WHEN LENGTH(account_code) = 5 THEN 5
  WHEN LENGTH(account_code) = 6 THEN 6
  ELSE 1 -- افتراضي للحالات الاستثنائية
END,
updated_at = now()
WHERE company_id IN (SELECT id FROM companies WHERE id IS NOT NULL);

-- 3. إنشاء وظيفة محدثة لحساب المستوى بناءً على كود الحساب
CREATE OR REPLACE FUNCTION calculate_account_level(account_code TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN LENGTH(account_code) = 1 THEN 1
    WHEN LENGTH(account_code) = 2 THEN 2
    WHEN LENGTH(account_code) = 3 THEN 3
    WHEN LENGTH(account_code) = 4 THEN 4
    WHEN LENGTH(account_code) = 5 THEN 5
    WHEN LENGTH(account_code) = 6 THEN 6
    ELSE LEAST(6, GREATEST(1, LENGTH(account_code))) -- تحديد بين 1 و 6
  END;
$$;

-- 4. إضافة تريغر لتحديث المستوى تلقائياً عند إدراج أو تحديث الحسابات
CREATE OR REPLACE FUNCTION auto_calculate_account_level()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- حساب المستوى بناءً على كود الحساب
  NEW.account_level := calculate_account_level(NEW.account_code);
  
  -- إذا لم يتم تمرير is_header صراحة، حدده بناءً على المستوى
  IF NEW.is_header IS NULL THEN
    NEW.is_header := (NEW.account_level < 5);
  END IF;
  
  RETURN NEW;
END;
$$;

-- حذف التريغر السابق إن وجد
DROP TRIGGER IF EXISTS trigger_auto_calculate_account_level ON chart_of_accounts;

-- إنشاء التريغر الجديد
CREATE TRIGGER trigger_auto_calculate_account_level
  BEFORE INSERT OR UPDATE ON chart_of_accounts
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_account_level();

-- 5. تحديث parent_account_id بناءً على منطق الكود
-- الحساب الأب هو الحساب الذي كوده أقصر بحرف واحد
UPDATE chart_of_accounts AS child 
SET parent_account_id = parent.id
FROM chart_of_accounts AS parent
WHERE child.company_id = parent.company_id
  AND child.account_level > 1
  AND parent.account_level = child.account_level - 1
  AND child.account_code LIKE parent.account_code || '%'
  AND LENGTH(child.account_code) = LENGTH(parent.account_code) + 1;