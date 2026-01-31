-- Migration: Add Number to Arabic Words Function
-- Date: 2026-01-31
-- Description: دالة لتحويل الأرقام إلى كلمات عربية وتحديث قيمة المطالبة كتابتاً

-- ==========================================
-- 1. إنشاء دالة تحويل الأرقام إلى كلمات عربية
-- ==========================================

CREATE OR REPLACE FUNCTION number_to_arabic_words(amount DECIMAL)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_ones TEXT[] := ARRAY['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  v_tens TEXT[] := ARRAY['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  v_hundreds TEXT[] := ARRAY['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  v_teens TEXT[] := ARRAY['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  
  v_integer_part BIGINT;
  v_decimal_part INTEGER;
  v_result TEXT := '';
  v_thousands INTEGER;
  v_hundreds_digit INTEGER;
  v_tens_digit INTEGER;
  v_ones_digit INTEGER;
  v_temp TEXT;
BEGIN
  -- التعامل مع القيم الخاصة
  IF amount IS NULL OR amount = 0 THEN
    RETURN 'صفر ريال قطري';
  END IF;
  
  IF amount < 0 THEN
    RETURN 'سالب ' || number_to_arabic_words(ABS(amount));
  END IF;
  
  -- فصل الجزء الصحيح والعشري
  v_integer_part := FLOOR(amount)::BIGINT;
  v_decimal_part := ROUND((amount - v_integer_part) * 100)::INTEGER;
  
  -- معالجة الآلاف
  IF v_integer_part >= 1000 THEN
    v_thousands := v_integer_part / 1000;
    
    IF v_thousands = 1 THEN
      v_result := 'ألف';
    ELSIF v_thousands = 2 THEN
      v_result := 'ألفان';
    ELSIF v_thousands >= 3 AND v_thousands <= 10 THEN
      v_result := v_ones[v_thousands + 1] || ' آلاف';
    ELSIF v_thousands > 10 THEN
      -- للأعداد الكبيرة، نستخدم تحويل بسيط
      v_result := v_thousands::TEXT || ' ألف';
    END IF;
    
    v_integer_part := v_integer_part % 1000;
    
    IF v_integer_part > 0 THEN
      v_result := v_result || ' و';
    END IF;
  END IF;
  
  -- معالجة المئات
  IF v_integer_part >= 100 THEN
    v_hundreds_digit := v_integer_part / 100;
    v_result := v_result || v_hundreds[v_hundreds_digit + 1];
    v_integer_part := v_integer_part % 100;
    
    IF v_integer_part > 0 THEN
      v_result := v_result || ' و';
    END IF;
  END IF;
  
  -- معالجة العشرات والآحاد
  IF v_integer_part >= 20 THEN
    v_tens_digit := v_integer_part / 10;
    v_ones_digit := v_integer_part % 10;
    
    v_result := v_result || v_tens[v_tens_digit + 1];
    
    IF v_ones_digit > 0 THEN
      v_result := v_result || ' و' || v_ones[v_ones_digit + 1];
    END IF;
  ELSIF v_integer_part >= 10 THEN
    -- الأعداد من 10 إلى 19
    v_result := v_result || v_teens[v_integer_part - 9];
  ELSIF v_integer_part > 0 THEN
    -- الأعداد من 1 إلى 9
    v_result := v_result || v_ones[v_integer_part + 1];
  END IF;
  
  -- إضافة "ريال قطري"
  IF TRIM(v_result) = '' THEN
    v_result := 'صفر';
  END IF;
  
  v_result := v_result || ' ريال قطري';
  
  -- إضافة الجزء العشري إذا وجد
  IF v_decimal_part > 0 THEN
    v_result := v_result || ' و' || v_decimal_part::TEXT || ' درهم';
  END IF;
  
  -- تنظيف المسافات الزائدة
  v_result := REGEXP_REPLACE(v_result, '\s+', ' ', 'g');
  v_result := TRIM(v_result);
  
  RETURN v_result;
END;
$$;

-- إضافة تعليق
COMMENT ON FUNCTION number_to_arabic_words IS 'تحويل الأرقام إلى كلمات عربية للمبالغ المالية';

-- ==========================================
-- 2. تحديث القضايا الموجودة بقيمة المطالبة كتابتاً
-- ==========================================

UPDATE lawsuit_templates
SET claim_amount_words = number_to_arabic_words(claim_amount)
WHERE claim_amount_words IS NULL 
   OR claim_amount_words = '';

-- ==========================================
-- 3. إنشاء Trigger لملء القيمة تلقائياً عند الإدراج/التحديث
-- ==========================================

CREATE OR REPLACE FUNCTION auto_fill_claim_amount_words()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- ملء قيمة المطالبة كتابتاً تلقائياً إذا كانت فارغة
  IF NEW.claim_amount IS NOT NULL AND (NEW.claim_amount_words IS NULL OR NEW.claim_amount_words = '') THEN
    NEW.claim_amount_words := number_to_arabic_words(NEW.claim_amount);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_fill_claim_words_trigger ON lawsuit_templates;
CREATE TRIGGER auto_fill_claim_words_trigger
  BEFORE INSERT OR UPDATE ON lawsuit_templates
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_claim_amount_words();

-- إضافة تعليق
COMMENT ON FUNCTION auto_fill_claim_amount_words IS 'ملء قيمة المطالبة كتابتاً تلقائياً';
COMMENT ON TRIGGER auto_fill_claim_words_trigger ON lawsuit_templates IS 'يملأ claim_amount_words تلقائياً من claim_amount';

-- ==========================================
-- 4. Grant Permissions
-- ==========================================

GRANT EXECUTE ON FUNCTION number_to_arabic_words TO authenticated;
GRANT EXECUTE ON FUNCTION auto_fill_claim_amount_words TO authenticated;
