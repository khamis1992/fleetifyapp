-- المرحلة الثانية: دوال التخصيص الذكي للمدفوعات والمطابقة

-- دالة اقتراح تخصيص المدفوعات الذكي
CREATE OR REPLACE FUNCTION suggest_payment_allocation(
    customer_id_param UUID,
    payment_amount_param NUMERIC,
    allocation_strategy_param TEXT DEFAULT 'oldest_first'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    company_id_val UUID;
    remaining_amount NUMERIC := payment_amount_param;
    allocation_result JSONB := '[]';
    obligation_record RECORD;
    allocated_amount NUMERIC;
    confidence_score NUMERIC := 100;
    total_obligations NUMERIC := 0;
BEGIN
    -- الحصول على معرف الشركة
    SELECT company_id INTO company_id_val
    FROM customers
    WHERE id = customer_id_param;
    
    IF company_id_val IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'العميل غير موجود',
            'allocations', '[]'::jsonb
        );
    END IF;
    
    -- حساب إجمالي الالتزامات
    SELECT COALESCE(SUM(remaining_amount), 0) INTO total_obligations
    FROM customer_financial_obligations
    WHERE customer_id = customer_id_param
    AND status IN ('pending', 'partial', 'overdue')
    AND remaining_amount > 0;
    
    -- تحديد إستراتيجية التخصيص
    CASE allocation_strategy_param
        WHEN 'oldest_first' THEN
            -- تخصيص الأقدم أولاً
            FOR obligation_record IN 
                SELECT id, obligation_number, due_date, remaining_amount, priority, contract_id
                FROM customer_financial_obligations
                WHERE customer_id = customer_id_param
                AND status IN ('pending', 'partial', 'overdue')
                AND remaining_amount > 0
                ORDER BY due_date ASC, priority ASC
            LOOP
                IF remaining_amount <= 0 THEN
                    EXIT;
                END IF;
                
                allocated_amount := LEAST(remaining_amount, obligation_record.remaining_amount);
                remaining_amount := remaining_amount - allocated_amount;
                
                allocation_result := allocation_result || jsonb_build_object(
                    'obligation_id', obligation_record.id,
                    'obligation_number', obligation_record.obligation_number,
                    'due_date', obligation_record.due_date,
                    'contract_id', obligation_record.contract_id,
                    'allocated_amount', allocated_amount,
                    'remaining_after_allocation', obligation_record.remaining_amount - allocated_amount
                );
            END LOOP;
            
        WHEN 'highest_priority' THEN
            -- تخصيص الأولوية العالية أولاً
            FOR obligation_record IN 
                SELECT id, obligation_number, due_date, remaining_amount, priority, contract_id
                FROM customer_financial_obligations
                WHERE customer_id = customer_id_param
                AND status IN ('pending', 'partial', 'overdue')
                AND remaining_amount > 0
                ORDER BY priority ASC, due_date ASC
            LOOP
                IF remaining_amount <= 0 THEN
                    EXIT;
                END IF;
                
                allocated_amount := LEAST(remaining_amount, obligation_record.remaining_amount);
                remaining_amount := remaining_amount - allocated_amount;
                
                allocation_result := allocation_result || jsonb_build_object(
                    'obligation_id', obligation_record.id,
                    'obligation_number', obligation_record.obligation_number,
                    'due_date', obligation_record.due_date,
                    'contract_id', obligation_record.contract_id,
                    'allocated_amount', allocated_amount,
                    'remaining_after_allocation', obligation_record.remaining_amount - allocated_amount
                );
            END LOOP;
            
        WHEN 'proportional' THEN
            -- تخصيص نسبي
            IF total_obligations > 0 THEN
                FOR obligation_record IN 
                    SELECT id, obligation_number, due_date, remaining_amount, priority, contract_id
                    FROM customer_financial_obligations
                    WHERE customer_id = customer_id_param
                    AND status IN ('pending', 'partial', 'overdue')
                    AND remaining_amount > 0
                    ORDER BY due_date ASC
                LOOP
                    allocated_amount := ROUND(
                        (obligation_record.remaining_amount / total_obligations) * payment_amount_param, 
                        3
                    );
                    
                    allocation_result := allocation_result || jsonb_build_object(
                        'obligation_id', obligation_record.id,
                        'obligation_number', obligation_record.obligation_number,
                        'due_date', obligation_record.due_date,
                        'contract_id', obligation_record.contract_id,
                        'allocated_amount', allocated_amount,
                        'remaining_after_allocation', obligation_record.remaining_amount - allocated_amount
                    );
                END LOOP;
                remaining_amount := 0; -- التخصيص النسبي يوزع كامل المبلغ
            END IF;
    END CASE;
    
    -- حساب نقاط الثقة
    IF payment_amount_param > total_obligations THEN
        confidence_score := 90; -- دفعة أكبر من المطلوب
    ELSIF remaining_amount > 0 THEN
        confidence_score := 95; -- تخصيص جزئي
    ELSE
        confidence_score := 100; -- تخصيص كامل
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'payment_amount', payment_amount_param,
        'total_obligations', total_obligations,
        'remaining_unallocated', remaining_amount,
        'allocation_strategy', allocation_strategy_param,
        'confidence_score', confidence_score,
        'allocations', allocation_result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'allocations', '[]'::jsonb
        );
END;
$function$;

-- دالة تطبيق تخصيص المدفوعات
CREATE OR REPLACE FUNCTION apply_payment_allocation(
    payment_id_param UUID,
    allocations_param JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    payment_record payments%ROWTYPE;
    allocation_item JSONB;
    obligation_id_val UUID;
    allocated_amount_val NUMERIC;
    updated_count INTEGER := 0;
    error_count INTEGER := 0;
    total_allocated NUMERIC := 0;
BEGIN
    -- التحقق من وجود المدفوعة
    SELECT * INTO payment_record
    FROM payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المدفوعة غير موجودة'
        );
    END IF;
    
    -- تطبيق التخصيصات
    FOR allocation_item IN SELECT * FROM jsonb_array_elements(allocations_param)
    LOOP
        BEGIN
            obligation_id_val := (allocation_item->>'obligation_id')::UUID;
            allocated_amount_val := (allocation_item->>'allocated_amount')::NUMERIC;
            
            -- تحديث الالتزام المالي
            UPDATE customer_financial_obligations
            SET 
                paid_amount = paid_amount + allocated_amount_val,
                remaining_amount = remaining_amount - allocated_amount_val,
                status = CASE 
                    WHEN remaining_amount - allocated_amount_val <= 0 THEN 'paid'
                    WHEN paid_amount + allocated_amount_val > 0 THEN 'partial'
                    ELSE status
                END,
                updated_at = now()
            WHERE id = obligation_id_val
            AND customer_id = payment_record.customer_id;
            
            GET DIAGNOSTICS updated_count = ROW_COUNT;
            
            IF updated_count > 0 THEN
                total_allocated := total_allocated + allocated_amount_val;
            ELSE
                error_count := error_count + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
        END;
    END LOOP;
    
    -- تحديث المدفوعة
    UPDATE payments
    SET 
        auto_allocated = true,
        allocation_method = 'auto_oldest', -- أو الطريقة المستخدمة
        allocation_details = allocations_param,
        updated_at = now()
    WHERE id = payment_id_param;
    
    -- إعادة حساب أرصدة العميل
    PERFORM calculate_customer_financial_balance(
        payment_record.customer_id,
        NULL -- الرصيد الإجمالي
    );
    
    -- إعادة حساب أرصدة العقود إذا وجدت
    PERFORM calculate_customer_financial_balance(
        payment_record.customer_id,
        payment_record.contract_id
    ) WHERE payment_record.contract_id IS NOT NULL;
    
    RETURN jsonb_build_object(
        'success', true,
        'updated_obligations', jsonb_array_length(allocations_param) - error_count,
        'total_allocated', total_allocated,
        'errors', error_count
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$;

-- دالة إنشاء التزامات مالية من جدولة مدفوعات العقد
CREATE OR REPLACE FUNCTION create_obligations_from_payment_schedule(
    contract_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record contracts%ROWTYPE;
    schedule_record RECORD;
    obligation_count INTEGER := 0;
    error_count INTEGER := 0;
    obligation_number_base TEXT;
BEGIN
    -- التحقق من وجود العقد
    SELECT * INTO contract_record
    FROM contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'العقد غير موجود'
        );
    END IF;
    
    -- إنشاء رقم أساسي للالتزامات
    obligation_number_base := 'CNT-' || contract_record.contract_number || '-';
    
    -- إنشاء التزامات من جدولة المدفوعات
    FOR schedule_record IN 
        SELECT *
        FROM contract_payment_schedules
        WHERE contract_id = contract_id_param
        AND status IN ('pending', 'overdue')
    LOOP
        BEGIN
            INSERT INTO customer_financial_obligations (
                company_id,
                customer_id,
                contract_id,
                obligation_type,
                obligation_number,
                due_date,
                original_amount,
                remaining_amount,
                status,
                description,
                installment_number,
                created_by
            ) VALUES (
                contract_record.company_id,
                contract_record.customer_id,
                contract_record.id,
                'contract_payment',
                obligation_number_base || LPAD(schedule_record.installment_number::TEXT, 3, '0'),
                schedule_record.due_date,
                schedule_record.amount,
                schedule_record.amount - COALESCE(schedule_record.paid_amount, 0),
                CASE 
                    WHEN schedule_record.due_date < CURRENT_DATE THEN 'overdue'
                    ELSE 'pending'
                END,
                'قسط رقم ' || schedule_record.installment_number || ' من العقد ' || contract_record.contract_number,
                schedule_record.installment_number,
                contract_record.created_by
            );
            
            obligation_count := obligation_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
        END;
    END LOOP;
    
    -- إعادة حساب أرصدة العميل
    IF obligation_count > 0 THEN
        PERFORM calculate_customer_financial_balance(
            contract_record.customer_id,
            contract_record.id
        );
        
        PERFORM calculate_customer_financial_balance(
            contract_record.customer_id,
            NULL
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'created_obligations', obligation_count,
        'errors', error_count,
        'contract_number', contract_record.contract_number
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$;

-- دالة تحديث حالة الالتزامات تلقائياً (للتشغيل اليومي)
CREATE OR REPLACE FUNCTION daily_obligations_maintenance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    updated_overdue INTEGER := 0;
    processed_companies INTEGER := 0;
    company_record RECORD;
BEGIN
    -- تحديث الالتزامات المتأخرة
    UPDATE customer_financial_obligations
    SET 
        status = 'overdue',
        updated_at = now()
    WHERE status = 'pending'
    AND due_date < CURRENT_DATE
    AND remaining_amount > 0;
    
    GET DIAGNOSTICS updated_overdue = ROW_COUNT;
    
    -- إعادة حساب أرصدة العملاء لكل شركة
    FOR company_record IN 
        SELECT DISTINCT company_id
        FROM customer_financial_obligations
        WHERE updated_at::date = CURRENT_DATE
    LOOP
        -- إعادة حساب الأرصدة الإجمالية للعملاء في هذه الشركة
        PERFORM calculate_customer_financial_balance(customer_id, NULL)
        FROM (
            SELECT DISTINCT customer_id
            FROM customer_financial_obligations
            WHERE company_id = company_record.company_id
        ) customers;
        
        processed_companies := processed_companies + 1;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'updated_overdue_obligations', updated_overdue,
        'processed_companies', processed_companies,
        'maintenance_date', CURRENT_DATE
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$function$;