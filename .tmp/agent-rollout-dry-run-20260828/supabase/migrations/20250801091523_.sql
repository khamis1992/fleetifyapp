-- إنشاء وظائف محاسبية محسنة للعقود
-- 1. إنشاء وظيفة إنشاء قيد محاسبي للعقد
CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    revenue_account_id uuid;
    sales_cost_center_id uuid;
BEGIN
    -- الحصول على بيانات العقد
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found';
    END IF;
    
    -- الحصول على مركز تكلفة المبيعات
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = contract_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- الحصول على حساب الذمم المدينة
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%' OR account_name ILIKE '%ذمم%')
    AND is_active = true
    AND is_header = false
    ORDER BY account_level DESC
    LIMIT 1;
    
    -- الحصول على حساب الإيرادات
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'revenue'
    AND (account_name ILIKE '%rental%' OR account_name ILIKE '%sales%' OR account_name ILIKE '%إيجار%' OR account_name ILIKE '%مبيعات%')
    AND is_active = true
    AND is_header = false
    ORDER BY account_level DESC
    LIMIT 1;
    
    -- إنشاء القيد المحاسبي
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit,
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        contract_record.company_id,
        'CNT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
            SELECT COUNT(*) + 1 
            FROM public.journal_entries 
            WHERE company_id = contract_record.company_id 
            AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        )::TEXT, 4, '0'),
        contract_record.contract_date,
        'Contract Entry - ' || contract_record.contract_number,
        'contract',
        contract_record.id,
        contract_record.contract_amount,
        contract_record.contract_amount,
        'posted',
        contract_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إضافة خط الذمم المدينة
    IF receivable_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            receivable_account_id,
            sales_cost_center_id,
            1,
            'Accounts Receivable - Contract #' || contract_record.contract_number,
            contract_record.contract_amount,
            0
        );
    END IF;
    
    -- إضافة خط الإيرادات
    IF revenue_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            revenue_account_id,
            sales_cost_center_id,
            2,
            'Contract Revenue - ' || contract_record.contract_number,
            0,
            contract_record.contract_amount
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- 2. إنشاء وظيفة إنشاء فاتورة دورية للعقد
CREATE OR REPLACE FUNCTION public.create_contract_invoice(contract_id_param uuid, invoice_period text DEFAULT 'monthly')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    contract_record record;
    invoice_id uuid;
    invoice_number text;
    invoice_amount numeric;
    due_date date;
BEGIN
    -- الحصول على بيانات العقد
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param
    AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active contract not found';
    END IF;
    
    -- حساب مبلغ الفاتورة بناءً على فترة الفوترة
    CASE invoice_period
        WHEN 'monthly' THEN
            invoice_amount := contract_record.monthly_amount;
            due_date := CURRENT_DATE + INTERVAL '30 days';
        WHEN 'quarterly' THEN
            invoice_amount := contract_record.monthly_amount * 3;
            due_date := CURRENT_DATE + INTERVAL '90 days';
        WHEN 'yearly' THEN
            invoice_amount := contract_record.contract_amount;
            due_date := CURRENT_DATE + INTERVAL '365 days';
        ELSE
            invoice_amount := contract_record.monthly_amount;
            due_date := CURRENT_DATE + INTERVAL '30 days';
    END CASE;
    
    -- توليد رقم الفاتورة
    invoice_number := 'CNT-INV-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.invoices 
        WHERE company_id = contract_record.company_id 
        AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    )::TEXT, 4, '0');
    
    -- إنشاء الفاتورة
    INSERT INTO public.invoices (
        id,
        company_id,
        customer_id,
        invoice_number,
        invoice_date,
        due_date,
        subtotal,
        tax_amount,
        total_amount,
        status,
        notes,
        created_by,
        contract_id
    ) VALUES (
        gen_random_uuid(),
        contract_record.company_id,
        contract_record.customer_id,
        invoice_number,
        CURRENT_DATE,
        due_date,
        invoice_amount,
        0,
        invoice_amount,
        'draft',
        'Auto-generated from contract #' || contract_record.contract_number || ' (' || invoice_period || ' billing)',
        contract_record.created_by,
        contract_record.id
    ) RETURNING id INTO invoice_id;
    
    -- إضافة عنصر الفاتورة
    INSERT INTO public.invoice_items (
        id,
        invoice_id,
        description,
        quantity,
        unit_price,
        total_price
    ) VALUES (
        gen_random_uuid(),
        invoice_id,
        'Contract Service - ' || contract_record.contract_number || ' (' || invoice_period || ')',
        1,
        invoice_amount,
        invoice_amount
    );
    
    RETURN invoice_id;
END;
$function$;

-- 3. إنشاء محفز لإنشاء قيد محاسبي عند تفعيل العقد
CREATE OR REPLACE FUNCTION public.handle_contract_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    journal_id uuid;
BEGIN
    -- إنشاء قيد محاسبي عند تغيير الحالة من draft إلى active
    IF OLD.status = 'draft' AND NEW.status = 'active' AND NEW.journal_entry_id IS NULL THEN
        BEGIN
            journal_id := public.create_contract_journal_entry(NEW.id);
            
            -- ربط القيد بالعقد
            UPDATE public.contracts 
            SET journal_entry_id = journal_id 
            WHERE id = NEW.id;
            
            NEW.journal_entry_id := journal_id;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- تسجيل الخطأ دون إيقاف تفعيل العقد
                RAISE WARNING 'Failed to create journal entry for contract %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- إنشاء المحفز
DROP TRIGGER IF EXISTS trigger_contract_activation ON public.contracts;
CREATE TRIGGER trigger_contract_activation
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_contract_activation();

-- 4. إنشاء وظيفة للتحقق من صحة بيانات العقد
CREATE OR REPLACE FUNCTION public.validate_contract_data(contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    validation_result jsonb := '{"valid": true, "errors": []}'::jsonb;
    customer_status text;
    vehicle_availability text;
    conflicts_count integer;
BEGIN
    -- التحقق من حالة العميل
    SELECT 
        CASE 
            WHEN is_blacklisted = true THEN 'blacklisted'
            WHEN is_active = false THEN 'inactive'
            ELSE 'active'
        END INTO customer_status
    FROM public.customers
    WHERE id = (contract_data->>'customer_id')::uuid;
    
    IF customer_status = 'blacklisted' THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || '["العميل محظور ولا يمكن إنشاء عقود معه"]'::jsonb
        );
    END IF;
    
    IF customer_status = 'inactive' THEN
        validation_result := jsonb_set(
            validation_result, 
            '{valid}', 
            'false'::jsonb
        );
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            validation_result->'errors' || '["العميل غير نشط"]'::jsonb
        );
    END IF;
    
    -- التحقق من توفر المركبة (إذا تم تحديدها)
    IF contract_data->>'vehicle_id' IS NOT NULL AND contract_data->>'vehicle_id' != '' AND contract_data->>'vehicle_id' != 'none' THEN
        SELECT status INTO vehicle_availability
        FROM public.vehicles
        WHERE id = (contract_data->>'vehicle_id')::uuid;
        
        IF vehicle_availability NOT IN ('available', 'reserved') THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'::jsonb
            );
            validation_result := jsonb_set(
                validation_result,
                '{errors}',
                validation_result->'errors' || '["المركبة غير متاحة حالياً"]'::jsonb
            );
        END IF;
        
        -- التحقق من تضارب المواعيد
        SELECT COUNT(*) INTO conflicts_count
        FROM public.contracts
        WHERE vehicle_id = (contract_data->>'vehicle_id')::uuid
        AND status IN ('active', 'draft')
        AND (
            (start_date <= (contract_data->>'end_date')::date AND end_date >= (contract_data->>'start_date')::date)
        );
        
        IF conflicts_count > 0 THEN
            validation_result := jsonb_set(
                validation_result, 
                '{valid}', 
                'false'::jsonb
            );
            validation_result := jsonb_set(
                validation_result,
                '{errors}',
                validation_result->'errors' || '["يوجد تضارب في مواعيد استخدام المركبة"]'::jsonb
            );
        END IF;
    END IF;
    
    RETURN validation_result;
END;
$function$;

-- 5. إنشاء جدول لتتبع عمليات العقود
CREATE TABLE IF NOT EXISTS public.contract_operations_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL,
    company_id uuid NOT NULL,
    operation_type text NOT NULL, -- 'created', 'activated', 'suspended', 'renewed', 'cancelled'
    operation_details jsonb DEFAULT '{}'::jsonb,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    old_values jsonb,
    new_values jsonb,
    notes text
);

-- تمكين RLS للجدول الجديد
ALTER TABLE public.contract_operations_log ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Users can view contract operations in their company"
ON public.contract_operations_log
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can insert contract operations in their company"
ON public.contract_operations_log
FOR INSERT
WITH CHECK (
    company_id = get_user_company(auth.uid()) AND
    (has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role) OR 
     has_role(auth.uid(), 'sales_agent'::user_role))
);

-- 6. إنشاء محفز لتسجيل العمليات
CREATE OR REPLACE FUNCTION public.log_contract_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    operation_type text;
    operation_details jsonb := '{}'::jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        operation_type := 'created';
        operation_details := jsonb_build_object(
            'contract_number', NEW.contract_number,
            'contract_type', NEW.contract_type,
            'status', NEW.status,
            'amount', NEW.contract_amount
        );
        
        INSERT INTO public.contract_operations_log (
            contract_id,
            company_id,
            operation_type,
            operation_details,
            performed_by,
            new_values
        ) VALUES (
            NEW.id,
            NEW.company_id,
            operation_type,
            operation_details,
            NEW.created_by,
            to_jsonb(NEW)
        );
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- تحديد نوع العملية بناءً على التغييرات
        IF OLD.status != NEW.status THEN
            CASE NEW.status
                WHEN 'active' THEN operation_type := 'activated';
                WHEN 'suspended' THEN operation_type := 'suspended';
                WHEN 'cancelled' THEN operation_type := 'cancelled';
                WHEN 'renewed' THEN operation_type := 'renewed';
                ELSE operation_type := 'status_changed';
            END CASE;
            
            operation_details := jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'contract_number', NEW.contract_number
            );
        ELSE
            operation_type := 'updated';
            operation_details := jsonb_build_object(
                'contract_number', NEW.contract_number,
                'update_type', 'data_modification'
            );
        END IF;
        
        INSERT INTO public.contract_operations_log (
            contract_id,
            company_id,
            operation_type,
            operation_details,
            performed_by,
            old_values,
            new_values
        ) VALUES (
            NEW.id,
            NEW.company_id,
            operation_type,
            operation_details,
            auth.uid(),
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- إنشاء المحفز لتسجيل العمليات
DROP TRIGGER IF EXISTS trigger_log_contract_operations ON public.contracts;
CREATE TRIGGER trigger_log_contract_operations
    AFTER INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.log_contract_operations();;
