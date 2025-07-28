-- إصلاح التحذيرات الأمنية للدوال المنشأة
-- Fix security warnings for created functions

-- تحديث دالة توليد رقم طلب الموافقة مع search_path آمن
CREATE OR REPLACE FUNCTION generate_approval_request_number(company_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    request_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- الحصول على السنة الحالية
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- عد الطلبات الموجودة للشركة في السنة الحالية
    SELECT COUNT(*) + 1 INTO request_count
    FROM public.approval_requests 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إرجاع رقم الطلب المنسق
    RETURN 'APR-' || year_suffix || '-' || LPAD(request_count::TEXT, 4, '0');
END;
$$;

-- تحديث دالة تحديث حالة طلب الموافقة مع search_path آمن
CREATE OR REPLACE FUNCTION update_approval_request_status(request_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    pending_steps INTEGER;
    total_steps INTEGER;
    rejected_steps INTEGER;
BEGIN
    -- عد الخطوات المختلفة
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'rejected')
    INTO pending_steps, total_steps, rejected_steps
    FROM public.approval_steps 
    WHERE request_id = request_id_param;
    
    -- تحديث حالة الطلب
    IF rejected_steps > 0 THEN
        UPDATE public.approval_requests 
        SET status = 'rejected', completed_at = now() 
        WHERE id = request_id_param;
    ELSIF pending_steps = 0 THEN
        UPDATE public.approval_requests 
        SET status = 'approved', completed_at = now() 
        WHERE id = request_id_param;
    END IF;
END;
$$;

-- تحديث دالة تريجر مع search_path آمن
CREATE OR REPLACE FUNCTION trigger_update_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    PERFORM update_approval_request_status(NEW.request_id);
    RETURN NEW;
END;
$$;