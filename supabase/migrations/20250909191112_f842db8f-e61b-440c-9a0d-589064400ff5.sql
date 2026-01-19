-- إصلاح المشاكل الأمنية الحرجة - المرحلة الأولى
-- تفعيل RLS للجداول المعطلة وإضافة search_path للدوال المهمة

-- 1. تفعيل RLS للجداول المعطلة
ALTER TABLE advanced_late_fee_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_contract_matching ENABLE ROW LEVEL SECURITY;

-- 2. إنشاء RLS policies للجداول المعطلة
-- Advanced Late Fee Calculations
CREATE POLICY "Users can manage late fee calculations in their company"
ON advanced_late_fee_calculations
FOR ALL
USING (company_id = get_user_company(auth.uid()));

-- Payment AI Analysis
CREATE POLICY "Users can manage payment AI analysis in their company"
ON payment_ai_analysis
FOR ALL
USING (company_id = get_user_company(auth.uid()));

-- Payment Contract Matching
CREATE POLICY "Users can manage payment contract matching in their company"
ON payment_contract_matching
FOR ALL
USING (company_id = get_user_company(auth.uid()));

-- 3. إضافة SET search_path TO 'public' للدوال الناقصة
CREATE OR REPLACE FUNCTION public.add_vehicles_to_installment(installment_id_param uuid, vehicle_ids_param uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result_count integer := 0;
    vehicle_id uuid;
    existing_count integer;
BEGIN
    -- التحقق من وجود القسط
    IF NOT EXISTS (SELECT 1 FROM installment_payments WHERE id = installment_id_param) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'القسط غير موجود'
        );
    END IF;

    -- إضافة المركبات للقسط
    FOREACH vehicle_id IN ARRAY vehicle_ids_param
    LOOP
        -- التحقق من عدم وجود المركبة مسبقاً
        SELECT COUNT(*) INTO existing_count
        FROM installment_vehicles 
        WHERE installment_id = installment_id_param AND vehicle_id = vehicle_id;
        
        IF existing_count = 0 THEN
            INSERT INTO installment_vehicles (installment_id, vehicle_id)
            VALUES (installment_id_param, vehicle_id);
            result_count := result_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'added_count', result_count,
        'message', 'تم إضافة ' || result_count || ' مركبة للقسط'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_customer_payment_history(customer_id_param uuid, company_id_param uuid)
RETURNS TABLE(
    payment_id uuid,
    payment_date date,
    amount numeric,
    payment_method text,
    reference_number text,
    status text,
    contract_number text,
    notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.reference_number,
        p.payment_status,
        c.contract_number,
        p.notes
    FROM payments p
    LEFT JOIN contracts c ON p.contract_id = c.id
    WHERE p.customer_id = customer_id_param 
    AND p.company_id = company_id_param
    ORDER BY p.payment_date DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_customer_contract_summary(customer_id_param uuid, company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_contracts integer;
    active_contracts integer;
    total_value numeric;
    total_paid numeric;
    remaining_balance numeric;
BEGIN
    -- حساب إجمالي العقود
    SELECT COUNT(*) INTO total_contracts
    FROM contracts
    WHERE customer_id = customer_id_param AND company_id = company_id_param;
    
    -- حساب العقود النشطة
    SELECT COUNT(*) INTO active_contracts
    FROM contracts
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param 
    AND status = 'active';
    
    -- حساب إجمالي القيمة
    SELECT COALESCE(SUM(contract_amount), 0) INTO total_value
    FROM contracts
    WHERE customer_id = customer_id_param AND company_id = company_id_param;
    
    -- حساب إجمالي المدفوع
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param 
    AND payment_status = 'completed';
    
    remaining_balance := total_value - total_paid;
    
    RETURN jsonb_build_object(
        'total_contracts', total_contracts,
        'active_contracts', active_contracts,
        'total_value', total_value,
        'total_paid', total_paid,
        'remaining_balance', remaining_balance
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_payment_due_dates(contract_id_param uuid)
RETURNS TABLE(
    installment_number integer,
    due_date date,
    amount numeric,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record contracts%ROWTYPE;
    monthly_amount numeric;
    current_date date;
    installment_count integer;
BEGIN
    -- الحصول على بيانات العقد
    SELECT * INTO contract_record
    FROM contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    monthly_amount := contract_record.monthly_amount;
    current_date := contract_record.start_date;
    installment_count := 1;
    
    -- إنشاء جدول أقساط افتراضي بناءً على مدة العقد
    WHILE current_date <= contract_record.end_date
    LOOP
        RETURN QUERY SELECT 
            installment_count,
            current_date,
            monthly_amount,
            CASE 
                WHEN current_date < CURRENT_DATE THEN 'overdue'::text
                WHEN current_date = CURRENT_DATE THEN 'due_today'::text
                ELSE 'upcoming'::text
            END;
        
        current_date := current_date + INTERVAL '1 month';
        installment_count := installment_count + 1;
    END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_vehicle_status_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- عند إنشاء عقد جديد، تحديث حالة المركبة
    IF TG_OP = 'INSERT' AND NEW.vehicle_id IS NOT NULL THEN
        UPDATE vehicles 
        SET status = CASE 
            WHEN NEW.status = 'active' THEN 'rented'::vehicle_status
            WHEN NEW.status = 'draft' THEN 'reserved'::vehicle_status
            ELSE status
        END
        WHERE id = NEW.vehicle_id;
    END IF;
    
    -- عند تحديث العقد
    IF TG_OP = 'UPDATE' AND NEW.vehicle_id IS NOT NULL THEN
        -- إذا تم إلغاء العقد، إرجاع المركبة لحالة متاحة
        IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
            UPDATE vehicles 
            SET status = 'available'::vehicle_status
            WHERE id = NEW.vehicle_id;
        -- إذا تم تفعيل العقد، تحديث المركبة لمؤجرة
        ELSIF NEW.status = 'active' AND OLD.status != 'active' THEN
            UPDATE vehicles 
            SET status = 'rented'::vehicle_status
            WHERE id = NEW.vehicle_id;
        END IF;
    END IF;
    
    -- عند حذف العقد، إرجاع المركبة لحالة متاحة
    IF TG_OP = 'DELETE' AND OLD.vehicle_id IS NOT NULL THEN
        UPDATE vehicles 
        SET status = 'available'::vehicle_status
        WHERE id = OLD.vehicle_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;