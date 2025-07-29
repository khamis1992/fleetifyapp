-- إصلاح مسار البحث للدوال المضافة حديثاً
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
DECLARE
    ticket_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- الحصول على السنة الحالية
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- عد التذاكر الموجودة في السنة الحالية
    SELECT COUNT(*) + 1 INTO ticket_count
    FROM public.support_tickets 
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إرجاع رقم التذكرة المنسق
    RETURN 'TK-' || year_suffix || '-' || LPAD(ticket_count::TEXT, 6, '0');
END;
$$;

-- إصلاح مسار البحث لمحفز توليد رقم التذكرة
CREATE OR REPLACE FUNCTION public.handle_ticket_number_generation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := public.generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$;

-- إصلاح مسار البحث لمحفز تحديث أول رد
CREATE OR REPLACE FUNCTION public.update_first_response_time()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    -- تحديث وقت أول رد للتذكرة إذا لم يكن محدداً مسبقاً
    IF NEW.user_id != (SELECT created_by FROM public.support_tickets WHERE id = NEW.ticket_id) THEN
        UPDATE public.support_tickets 
        SET first_response_at = COALESCE(first_response_at, NEW.created_at)
        WHERE id = NEW.ticket_id AND first_response_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$;