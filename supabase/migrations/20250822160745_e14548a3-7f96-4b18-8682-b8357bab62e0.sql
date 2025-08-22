-- إصلاح التحذيرات الأمنية للوظائف المضافة حديثاً

-- إصلاح وظيفة حساب المستوى لتضمين search_path
CREATE OR REPLACE FUNCTION calculate_account_level(account_code TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN LENGTH(account_code) = 1 THEN 1
    WHEN LENGTH(account_code) = 2 THEN 2
    WHEN LENGTH(account_code) = 3 THEN 3
    WHEN LENGTH(account_code) = 4 THEN 4
    WHEN LENGTH(account_code) = 5 THEN 5
    WHEN LENGTH(account_code) = 6 THEN 6
    ELSE LEAST(6, GREATEST(1, LENGTH(account_code)))
  END;
$$;

-- إصلاح وظيفة التريغر لتضمين search_path
CREATE OR REPLACE FUNCTION auto_calculate_account_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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