-- تصحيح وإنشاء دوال التكامل المالي - المجموعة الأولى

-- 1. دالة توليد رقم القيد اليومي
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    entry_count INTEGER;
    entry_number TEXT;
BEGIN
    SELECT COUNT(*) INTO entry_count
    FROM public.journal_entries
    WHERE company_id = company_id_param;
    
    entry_number := 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((entry_count + 1)::TEXT, 6, '0');
    
    RETURN entry_number;
END;
$$;