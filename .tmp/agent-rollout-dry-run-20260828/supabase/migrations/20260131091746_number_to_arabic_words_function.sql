-- دالة تحويل الأرقام إلى كلمات عربية
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
  v_result TEXT := '';
  v_thousands INTEGER;
  v_hundreds_digit INTEGER;
  v_tens_digit INTEGER;
  v_ones_digit INTEGER;
BEGIN
  IF amount IS NULL OR amount = 0 THEN RETURN 'صفر ريال قطري'; END IF;
  IF amount < 0 THEN RETURN 'سالب ' || number_to_arabic_words(ABS(amount)); END IF;
  
  v_integer_part := FLOOR(amount)::BIGINT;
  
  IF v_integer_part >= 1000 THEN
    v_thousands := v_integer_part / 1000;
    IF v_thousands = 1 THEN v_result := 'ألف';
    ELSIF v_thousands = 2 THEN v_result := 'ألفان';
    ELSIF v_thousands >= 3 AND v_thousands <= 10 THEN v_result := v_ones[v_thousands + 1] || ' آلاف';
    ELSE v_result := v_thousands::TEXT || ' ألف'; END IF;
    v_integer_part := v_integer_part % 1000;
    IF v_integer_part > 0 THEN v_result := v_result || ' و'; END IF;
  END IF;
  
  IF v_integer_part >= 100 THEN
    v_hundreds_digit := v_integer_part / 100;
    v_result := v_result || v_hundreds[v_hundreds_digit + 1];
    v_integer_part := v_integer_part % 100;
    IF v_integer_part > 0 THEN v_result := v_result || ' و'; END IF;
  END IF;
  
  IF v_integer_part >= 20 THEN
    v_tens_digit := v_integer_part / 10;
    v_ones_digit := v_integer_part % 10;
    v_result := v_result || v_tens[v_tens_digit + 1];
    IF v_ones_digit > 0 THEN v_result := v_result || ' و' || v_ones[v_ones_digit + 1]; END IF;
  ELSIF v_integer_part >= 10 THEN
    v_result := v_result || v_teens[v_integer_part - 9];
  ELSIF v_integer_part > 0 THEN
    v_result := v_result || v_ones[v_integer_part + 1];
  END IF;
  
  IF TRIM(v_result) = '' THEN v_result := 'صفر'; END IF;
  v_result := v_result || ' ريال قطري';
  v_result := REGEXP_REPLACE(v_result, '\s+', ' ', 'g');
  
  RETURN TRIM(v_result);
END;
$$;

COMMENT ON FUNCTION number_to_arabic_words IS 'تحويل الأرقام إلى كلمات عربية';;
