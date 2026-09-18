-- دالة لتحويل الأسماء الإنجليزية إلى العربية (Transliteration)
CREATE OR REPLACE FUNCTION transliterate_to_arabic(english_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    result TEXT;
BEGIN
    IF english_text IS NULL OR english_text = '' THEN
        RETURN english_text;
    END IF;
    
    result := LOWER(english_text);
    
    -- استبدال المجموعات الصوتية أولاً (الأطول أولاً)
    result := REPLACE(result, 'mohammed', 'محمد');
    result := REPLACE(result, 'muhammad', 'محمد');
    result := REPLACE(result, 'mohamed', 'محمد');
    result := REPLACE(result, 'ahmad', 'أحمد');
    result := REPLACE(result, 'ahmed', 'أحمد');
    result := REPLACE(result, 'abdullah', 'عبدالله');
    result := REPLACE(result, 'abdallah', 'عبدالله');
    result := REPLACE(result, 'abdul', 'عبد');
    result := REPLACE(result, 'abd', 'عبد');
    
    -- استبدال المجموعات الصوتية
    result := REPLACE(result, 'sh', 'ش');
    result := REPLACE(result, 'th', 'ث');
    result := REPLACE(result, 'ch', 'تش');
    result := REPLACE(result, 'kh', 'خ');
    result := REPLACE(result, 'gh', 'غ');
    result := REPLACE(result, 'dh', 'ذ');
    result := REPLACE(result, 'ph', 'ف');
    result := REPLACE(result, 'qu', 'كو');
    result := REPLACE(result, 'ck', 'ك');
    result := REPLACE(result, 'ee', 'ي');
    result := REPLACE(result, 'oo', 'و');
    result := REPLACE(result, 'aa', 'ا');
    result := REPLACE(result, 'ou', 'و');
    result := REPLACE(result, 'ai', 'اي');
    result := REPLACE(result, 'ei', 'اي');
    result := REPLACE(result, 'au', 'او');
    result := REPLACE(result, 'aw', 'او');
    
    -- استبدال الحروف المفردة
    result := REPLACE(result, 'a', 'ا');
    result := REPLACE(result, 'b', 'ب');
    result := REPLACE(result, 'c', 'ك');
    result := REPLACE(result, 'd', 'د');
    result := REPLACE(result, 'e', 'ي');
    result := REPLACE(result, 'f', 'ف');
    result := REPLACE(result, 'g', 'ج');
    result := REPLACE(result, 'h', 'ه');
    result := REPLACE(result, 'i', 'ي');
    result := REPLACE(result, 'j', 'ج');
    result := REPLACE(result, 'k', 'ك');
    result := REPLACE(result, 'l', 'ل');
    result := REPLACE(result, 'm', 'م');
    result := REPLACE(result, 'n', 'ن');
    result := REPLACE(result, 'o', 'و');
    result := REPLACE(result, 'p', 'ب');
    result := REPLACE(result, 'q', 'ق');
    result := REPLACE(result, 'r', 'ر');
    result := REPLACE(result, 's', 'س');
    result := REPLACE(result, 't', 'ت');
    result := REPLACE(result, 'u', 'و');
    result := REPLACE(result, 'v', 'ف');
    result := REPLACE(result, 'w', 'و');
    result := REPLACE(result, 'x', 'كس');
    result := REPLACE(result, 'y', 'ي');
    result := REPLACE(result, 'z', 'ز');
    
    RETURN result;
END;
$$;

-- دالة للتحقق إذا كان النص يحتوي على حروف عربية
CREATE OR REPLACE FUNCTION contains_arabic(text_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    IF text_to_check IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN text_to_check ~ '[\u0600-\u06FF]';
END;
$$;

COMMENT ON FUNCTION transliterate_to_arabic IS 'تحويل النص الإنجليزي إلى العربية باستخدام التعريب الصوتي';
COMMENT ON FUNCTION contains_arabic IS 'التحقق إذا كان النص يحتوي على أحرف عربية';;
