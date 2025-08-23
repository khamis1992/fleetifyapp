-- إنشاء دالة لجلب إعدادات الغرامات
CREATE OR REPLACE FUNCTION public.get_late_fine_settings(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    fine_type TEXT,
    fine_rate NUMERIC,
    grace_period_days INTEGER,
    max_fine_amount NUMERIC,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lfs.id,
        lfs.company_id,
        lfs.fine_type,
        lfs.fine_rate,
        lfs.grace_period_days,
        lfs.max_fine_amount,
        lfs.is_active,
        lfs.created_at,
        lfs.updated_at
    FROM public.late_fine_settings lfs
    WHERE lfs.company_id = p_company_id 
    AND lfs.is_active = true
    ORDER BY lfs.created_at DESC
    LIMIT 1;
END;
$$;

-- إنشاء دالة لحفظ/تحديث إعدادات الغرامات
CREATE OR REPLACE FUNCTION public.upsert_late_fine_settings(
    p_company_id UUID,
    p_fine_type TEXT,
    p_fine_rate NUMERIC,
    p_grace_period_days INTEGER,
    p_max_fine_amount NUMERIC,
    p_is_active BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result_id UUID;
BEGIN
    -- إلغاء تفعيل الإعدادات السابقة
    UPDATE public.late_fine_settings 
    SET is_active = false, updated_at = now()
    WHERE company_id = p_company_id AND is_active = true;
    
    -- إدراج الإعدادات الجديدة
    INSERT INTO public.late_fine_settings (
        company_id,
        fine_type,
        fine_rate,
        grace_period_days,
        max_fine_amount,
        is_active
    ) VALUES (
        p_company_id,
        p_fine_type,
        p_fine_rate,
        p_grace_period_days,
        p_max_fine_amount,
        p_is_active
    ) RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$;