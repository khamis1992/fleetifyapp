-- إصلاح شامل لنظام حذف الحسابات والبيانات المرتبطة
-- تاريخ الإنشاء: 10 يناير 2025
-- الهدف: حل مشكلة "column i.account_id does not exist" وتطوير نظام حذف متكامل

-- المرحلة الأولى: إنشاء دالة للتحقق من وجود الأعمدة
CREATE OR REPLACE FUNCTION public.column_exists(table_name text, column_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
    );
END;
$$;

-- المرحلة الثانية: إنشاء دالة تحليل شاملة للبيانات المرتبطة
CREATE OR REPLACE FUNCTION public.analyze_account_dependencies(account_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_record record;
    dependencies jsonb := '[]'::jsonb;
    total_dependencies integer := 0;
    current_count integer;
    table_info jsonb;
BEGIN
    -- التحقق من وجود الحساب
    SELECT * INTO account_record
    FROM public.chart_of_accounts
    WHERE id = account_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الحساب غير موجود'
        );
    END IF;
    
    -- 1. فحص القيود المحاسبية (journal_entry_lines)
    SELECT COUNT(*) INTO current_count
    FROM public.journal_entry_lines
    WHERE account_id = account_id_param;
    
    IF current_count > 0 THEN
        table_info := jsonb_build_object(
            'table_name', 'journal_entry_lines',
            'count', current_count,
            'description', 'القيود المحاسبية',
            'action', 'سيتم نقلها أو حذفها'
        );
        dependencies := dependencies || table_info;
        total_dependencies := total_dependencies + current_count;
    END IF;
    
    -- 2. فحص العقود (contracts) - إذا كان العمود موجود
    IF column_exists('contracts', 'account_id') THEN
        SELECT COUNT(*) INTO current_count
        FROM public.contracts
        WHERE account_id = account_id_param;
        
        IF current_count > 0 THEN
            table_info := jsonb_build_object(
                'table_name', 'contracts',
                'count', current_count,
                'description', 'العقود',
                'action', 'سيتم إلغاء الربط'
            );
            dependencies := dependencies || table_info;
            total_dependencies := total_dependencies + current_count;
        END IF;
    END IF;
    
    -- 3. فحص المدفوعات (payments) - إذا كان العمود موجود
    IF column_exists('payments', 'account_id') THEN
        SELECT COUNT(*) INTO current_count
        FROM public.payments
        WHERE account_id = account_id_param;
        
        IF current_count > 0 THEN
            table_info := jsonb_build_object(
                'table_name', 'payments',
                'count', current_count,
                'description', 'المدفوعات',
                'action', 'سيتم إلغاء الربط'
            );
            dependencies := dependencies || table_info;
            total_dependencies := total_dependencies + current_count;
        END IF;
    END IF;
    
    -- 4. فحص عناصر الفواتير (invoice_items) - إذا كان العمود موجود
    IF column_exists('invoice_items', 'account_id') THEN
        SELECT COUNT(*) INTO current_count
        FROM public.invoice_items
        WHERE account_id = account_id_param;
        
        IF current_count > 0 THEN
            table_info := jsonb_build_object(
                'table_name', 'invoice_items',
                'count', current_count,
                'description', 'عناصر الفواتير',
                'action', 'سيتم حذفها'
            );
            dependencies := dependencies || table_info;
            total_dependencies := total_dependencies + current_count;
        END IF;
    END IF;
    
    -- 5. فحص الفواتير (invoices) - إذا كان العمود موجود
    IF column_exists('invoices', 'account_id') THEN
        SELECT COUNT(*) INTO current_count
        FROM public.invoices
        WHERE account_id = account_id_param;
        
        IF current_count > 0 THEN
            table_info := jsonb_build_object(
                'table_name', 'invoices',
                'count', current_count,
                'description', 'الفواتير',
                'action', 'سيتم إلغاء الربط'
            );
            dependencies := dependencies || table_info;
            total_dependencies := total_dependencies + current_count;
        END IF;
    END IF;
    
    -- 6. فحص العملاء (customers) - إذا كان العمود موجود
    IF column_exists('customers', 'account_id') THEN
        SELECT COUNT(*) INTO current_count
        FROM public.customers
        WHERE account_id = account_id_param;
        
        IF current_count > 0 THEN
            table_info := jsonb_build_object(
                'table_name', 'customers',
                'count', current_count,
                'description', 'العملاء',
                'action', 'سيتم إلغاء الربط'
            );
            dependencies := dependencies || table_info;
            total_dependencies := total_dependencies + current_count;
        END IF;
    END IF;
    
    -- 7. فحص عناصر الميزانية (budget_items) - إذا كان العمود موجود
    IF column_exists('budget_items', 'account_id') THEN
        SELECT COUNT(*) INTO current_count
        FROM public.budget_items
        WHERE account_id = account_id_param;
        
        IF current_count > 0 THEN
            table_info := jsonb_build_object(
                'table_name', 'budget_items',
                'count', current_count,
                'description', 'عناصر الميزانية',
                'action', 'سيتم حذفها'
            );
            dependencies := dependencies || table_info;
            total_dependencies := total_dependencies + current_count;
        END IF;
    END IF;
    
    -- 8. فحص الأصول الثابتة (fixed_assets)
    SELECT COUNT(*) INTO current_count
    FROM public.fixed_assets
    WHERE depreciation_account_id = account_id_param 
       OR accumulated_depreciation_account_id = account_id_param;
    
    IF current_count > 0 THEN
        table_info := jsonb_build_object(
            'table_name', 'fixed_assets',
            'count', current_count,
            'description', 'الأصول الثابتة',
            'action', 'سيتم إلغاء الربط'
        );
        dependencies := dependencies || table_info;
        total_dependencies := total_dependencies + current_count;
    END IF;
    
    -- 9. فحص حسابات التجار (vendor_accounts) - إذا كان الجدول موجود
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_accounts') THEN
        SELECT COUNT(*) INTO current_count
        FROM public.vendor_accounts
        WHERE account_id = account_id_param;
        
        IF current_count > 0 THEN
            table_info := jsonb_build_object(
                'table_name', 'vendor_accounts',
                'count', current_count,
                'description', 'حسابات التجار',
                'action', 'سيتم حذفها'
            );
            dependencies := dependencies || table_info;
            total_dependencies := total_dependencies + current_count;
        END IF;
    END IF;
    
    -- 10. فحص حسابات العملاء (customer_accounts) - إذا كان الجدول موجود
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_accounts') THEN
        SELECT COUNT(*) INTO current_count
        FROM public.customer_accounts
        WHERE account_id = account_id_param;
        
        IF current_count > 0 THEN
            table_info := jsonb_build_object(
                'table_name', 'customer_accounts',
                'count', current_count,
                'description', 'حسابات العملاء',
                'action', 'سيتم حذفها'
            );
            dependencies := dependencies || table_info;
            total_dependencies := total_dependencies + current_count;
        END IF;
    END IF;
    
    -- 11. فحص الحسابات الفرعية
    SELECT COUNT(*) INTO current_count
    FROM public.chart_of_accounts
    WHERE parent_account_id = account_id_param AND is_active = true;
    
    IF current_count > 0 THEN
        table_info := jsonb_build_object(
            'table_name', 'chart_of_accounts',
            'count', current_count,
            'description', 'الحسابات الفرعية',
            'action', 'سيتم إلغاء تفعيلها'
        );
        dependencies := dependencies || table_info;
        total_dependencies := total_dependencies + current_count;
    END IF;
    
    -- 12. فحص تخصيصات الصيانة (maintenance_account_mappings) - إذا كان الجدول موجود
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_account_mappings') THEN
        SELECT COUNT(*) INTO current_count
        FROM public.maintenance_account_mappings
        WHERE expense_account_id = account_id_param OR asset_account_id = account_id_param;
        
        IF current_count > 0 THEN
            table_info := jsonb_build_object(
                'table_name', 'maintenance_account_mappings',
                'count', current_count,
                'description', 'تخصيصات حسابات الصيانة',
                'action', 'سيتم حذفها'
            );
            dependencies := dependencies || table_info;
            total_dependencies := total_dependencies + current_count;
        END IF;
    END IF;
    
    -- إرجاع النتائج
    RETURN jsonb_build_object(
        'success', true,
        'account_info', jsonb_build_object(
            'id', account_record.id,
            'code', account_record.account_code,
            'name', account_record.account_name,
            'type', account_record.account_type,
            'is_system', account_record.is_system,
            'is_active', account_record.is_active
        ),
        'dependencies', dependencies,
        'total_dependencies', total_dependencies,
        'can_delete', total_dependencies = 0 OR account_record.is_system = false
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في تحليل التبعيات: ' || SQLERRM
        );
END;
$$;

-- المرحلة الثالثة: إنشاء دالة الحذف الشامل المحسنة
CREATE OR REPLACE FUNCTION public.comprehensive_delete_account(
    account_id_param uuid,
    deletion_mode text DEFAULT 'soft', -- 'soft', 'transfer', 'force'
    transfer_to_account_id uuid DEFAULT NULL,
    user_id_param uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_record record;
    analysis_result jsonb;
    deletion_log_id uuid;
    affected_records jsonb := '{}'::jsonb;
    operation_result jsonb;
    current_count integer;
BEGIN
    -- التحقق من صحة المعاملات
    IF account_id_param IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف الحساب مطلوب'
        );
    END IF;
    
    IF deletion_mode NOT IN ('soft', 'transfer', 'force') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'نمط الحذف غير صحيح. يجب أن يكون: soft, transfer, أو force'
        );
    END IF;
    
    IF deletion_mode = 'transfer' AND transfer_to_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف الحساب البديل مطلوب عند اختيار نمط النقل'
        );
    END IF;
    
    -- الحصول على معلومات الحساب
    SELECT * INTO account_record
    FROM public.chart_of_accounts
    WHERE id = account_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الحساب غير موجود'
        );
    END IF;
    
    -- تحليل التبعيات
    SELECT * INTO analysis_result
    FROM public.analyze_account_dependencies(account_id_param);
    
    IF (analysis_result->>'success')::boolean = false THEN
        RETURN analysis_result;
    END IF;
    
    -- التحقق من الحساب البديل إذا كان مطلوباً
    IF transfer_to_account_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.chart_of_accounts
            WHERE id = transfer_to_account_id
            AND company_id = account_record.company_id
            AND is_active = true
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'الحساب البديل غير موجود أو غير نشط'
            );
        END IF;
    END IF;
    
    -- إنشاء سجل الحذف
    INSERT INTO public.account_deletion_log (
        company_id,
        deleted_account_id,
        deleted_account_code,
        deleted_account_name,
        deletion_type,
        transfer_to_account_id,
        deleted_by,
        deletion_reason,
        analysis_data
    ) VALUES (
        account_record.company_id,
        account_record.id,
        account_record.account_code,
        account_record.account_name,
        deletion_mode,
        transfer_to_account_id,
        COALESCE(user_id_param, auth.uid()),
        CASE deletion_mode
            WHEN 'soft' THEN 'إلغاء تفعيل الحساب'
            WHEN 'transfer' THEN 'نقل البيانات إلى حساب آخر'
            WHEN 'force' THEN 'حذف قسري مع جميع البيانات'
        END,
        analysis_result
    ) RETURNING id INTO deletion_log_id;
    
    -- تنفيذ عملية الحذف حسب النمط المختار
    CASE deletion_mode
        WHEN 'soft' THEN
            -- إلغاء تفعيل الحساب فقط
            UPDATE public.chart_of_accounts 
            SET is_active = false, updated_at = now()
            WHERE id = account_id_param;
            
            operation_result := jsonb_build_object(
                'action', 'soft_delete',
                'message', 'تم إلغاء تفعيل الحساب بنجاح'
            );
            
        WHEN 'transfer' THEN
            -- نقل جميع البيانات إلى الحساب البديل
            
            -- نقل القيود المحاسبية
            UPDATE public.journal_entry_lines 
            SET account_id = transfer_to_account_id 
            WHERE account_id = account_id_param;
            GET DIAGNOSTICS current_count = ROW_COUNT;
            affected_records := affected_records || jsonb_build_object('journal_entry_lines', current_count);
            
            -- نقل العقود (إذا كان العمود موجود)
            IF column_exists('contracts', 'account_id') THEN
                UPDATE public.contracts 
                SET account_id = transfer_to_account_id 
                WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('contracts', current_count);
            END IF;
            
            -- نقل المدفوعات (إذا كان العمود موجود)
            IF column_exists('payments', 'account_id') THEN
                UPDATE public.payments 
                SET account_id = transfer_to_account_id 
                WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('payments', current_count);
            END IF;
            
            -- نقل عناصر الفواتير (إذا كان العمود موجود)
            IF column_exists('invoice_items', 'account_id') THEN
                UPDATE public.invoice_items 
                SET account_id = transfer_to_account_id 
                WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('invoice_items', current_count);
            END IF;
            
            -- نقل الفواتير (إذا كان العمود موجود)
            IF column_exists('invoices', 'account_id') THEN
                UPDATE public.invoices 
                SET account_id = transfer_to_account_id 
                WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('invoices', current_count);
            END IF;
            
            -- نقل العملاء (إذا كان العمود موجود)
            IF column_exists('customers', 'account_id') THEN
                UPDATE public.customers 
                SET account_id = transfer_to_account_id 
                WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('customers', current_count);
            END IF;
            
            -- نقل عناصر الميزانية (إذا كان العمود موجود)
            IF column_exists('budget_items', 'account_id') THEN
                UPDATE public.budget_items 
                SET account_id = transfer_to_account_id 
                WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('budget_items', current_count);
            END IF;
            
            -- نقل الأصول الثابتة
            UPDATE public.fixed_assets 
            SET depreciation_account_id = transfer_to_account_id 
            WHERE depreciation_account_id = account_id_param;
            
            UPDATE public.fixed_assets 
            SET accumulated_depreciation_account_id = transfer_to_account_id 
            WHERE accumulated_depreciation_account_id = account_id_param;
            
            -- نقل تخصيصات الصيانة (إذا كان الجدول موجود)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_account_mappings') THEN
                UPDATE public.maintenance_account_mappings 
                SET expense_account_id = transfer_to_account_id 
                WHERE expense_account_id = account_id_param;
                
                UPDATE public.maintenance_account_mappings 
                SET asset_account_id = transfer_to_account_id 
                WHERE asset_account_id = account_id_param;
            END IF;
            
            -- حذف الحساب بعد النقل
            DELETE FROM public.chart_of_accounts WHERE id = account_id_param;
            
            operation_result := jsonb_build_object(
                'action', 'transferred_and_deleted',
                'message', 'تم نقل جميع البيانات وحذف الحساب بنجاح',
                'affected_records', affected_records
            );
            
        WHEN 'force' THEN
            -- حذف قسري لجميع البيانات
            
            -- حذف القيود المحاسبية
            DELETE FROM public.journal_entry_lines WHERE account_id = account_id_param;
            GET DIAGNOSTICS current_count = ROW_COUNT;
            affected_records := affected_records || jsonb_build_object('journal_entry_lines_deleted', current_count);
            
            -- إلغاء ربط العقود (إذا كان العمود موجود)
            IF column_exists('contracts', 'account_id') THEN
                UPDATE public.contracts SET account_id = NULL WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('contracts_unlinked', current_count);
            END IF;
            
            -- إلغاء ربط المدفوعات (إذا كان العمود موجود)
            IF column_exists('payments', 'account_id') THEN
                UPDATE public.payments SET account_id = NULL WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('payments_unlinked', current_count);
            END IF;
            
            -- حذف عناصر الفواتير (إذا كان العمود موجود)
            IF column_exists('invoice_items', 'account_id') THEN
                DELETE FROM public.invoice_items WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('invoice_items_deleted', current_count);
            END IF;
            
            -- إلغاء ربط الفواتير (إذا كان العمود موجود)
            IF column_exists('invoices', 'account_id') THEN
                UPDATE public.invoices SET account_id = NULL WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('invoices_unlinked', current_count);
            END IF;
            
            -- إلغاء ربط العملاء (إذا كان العمود موجود)
            IF column_exists('customers', 'account_id') THEN
                UPDATE public.customers SET account_id = NULL WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('customers_unlinked', current_count);
            END IF;
            
            -- حذف عناصر الميزانية (إذا كان العمود موجود)
            IF column_exists('budget_items', 'account_id') THEN
                DELETE FROM public.budget_items WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('budget_items_deleted', current_count);
            END IF;
            
            -- إلغاء ربط الأصول الثابتة
            UPDATE public.fixed_assets SET depreciation_account_id = NULL WHERE depreciation_account_id = account_id_param;
            UPDATE public.fixed_assets SET accumulated_depreciation_account_id = NULL WHERE accumulated_depreciation_account_id = account_id_param;
            
            -- حذف حسابات التجار (إذا كان الجدول موجود)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_accounts') THEN
                DELETE FROM public.vendor_accounts WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('vendor_accounts_deleted', current_count);
            END IF;
            
            -- حذف حسابات العملاء (إذا كان الجدول موجود)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_accounts') THEN
                DELETE FROM public.customer_accounts WHERE account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('customer_accounts_deleted', current_count);
            END IF;
            
            -- حذف تخصيصات الصيانة (إذا كان الجدول موجود)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_account_mappings') THEN
                DELETE FROM public.maintenance_account_mappings 
                WHERE expense_account_id = account_id_param OR asset_account_id = account_id_param;
                GET DIAGNOSTICS current_count = ROW_COUNT;
                affected_records := affected_records || jsonb_build_object('maintenance_mappings_deleted', current_count);
            END IF;
            
            -- إلغاء تفعيل الحسابات الفرعية
            UPDATE public.chart_of_accounts 
            SET is_active = false, updated_at = now()
            WHERE parent_account_id = account_id_param;
            GET DIAGNOSTICS current_count = ROW_COUNT;
            affected_records := affected_records || jsonb_build_object('child_accounts_deactivated', current_count);
            
            -- حذف الحساب الأساسي
            DELETE FROM public.chart_of_accounts WHERE id = account_id_param;
            
            operation_result := jsonb_build_object(
                'action', 'force_deleted',
                'message', 'تم حذف الحساب وجميع البيانات المرتبطة قسرياً',
                'affected_records', affected_records
            );
    END CASE;
    
    -- تحديث سجل الحذف
    UPDATE public.account_deletion_log 
    SET 
        affected_records = affected_records,
        operation_result = operation_result,
        completed_at = now()
    WHERE id = deletion_log_id;
    
    -- إرجاع النتيجة النهائية
    RETURN jsonb_build_object(
        'success', true,
        'deletion_log_id', deletion_log_id,
        'account_info', jsonb_build_object(
            'code', account_record.account_code,
            'name', account_record.account_name
        ),
        'operation', operation_result
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- تسجيل الخطأ في حالة الفشل
        IF deletion_log_id IS NOT NULL THEN
            UPDATE public.account_deletion_log 
            SET 
                error_message = SQLERRM,
                completed_at = now()
            WHERE id = deletion_log_id;
        END IF;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في تنفيذ العملية: ' || SQLERRM,
            'deletion_log_id', deletion_log_id
        );
END;
$$;

-- المرحلة الرابعة: إنشاء جدول سجل حذف الحسابات (إذا لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS public.account_deletion_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    deleted_account_id UUID,
    deleted_account_code VARCHAR(20),
    deleted_account_name TEXT,
    deletion_type TEXT NOT NULL CHECK (deletion_type IN ('soft', 'transfer', 'force')),
    transfer_to_account_id UUID,
    deleted_by UUID,
    deletion_reason TEXT,
    analysis_data JSONB,
    affected_records JSONB,
    operation_result JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_account_deletion_log_company_id ON public.account_deletion_log(company_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_log_deleted_account_id ON public.account_deletion_log(deleted_account_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_log_created_at ON public.account_deletion_log(created_at);

-- المرحلة الخامسة: إصلاح الدالة المسببة للخطأ
-- استبدال الدالة القديمة بالدالة الجديدة المحسنة
DROP FUNCTION IF EXISTS public.enhanced_cascade_delete_account(uuid, boolean, uuid, boolean);

-- إنشاء دالة مساعدة للتحقق من سلامة البيانات بعد الحذف
CREATE OR REPLACE FUNCTION public.verify_account_deletion_integrity(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    orphaned_records jsonb := '[]'::jsonb;
    issues_found integer := 0;
    current_count integer;
    table_info jsonb;
BEGIN
    -- فحص القيود المحاسبية المعلقة
    SELECT COUNT(*) INTO current_count
    FROM public.journal_entry_lines jel
    LEFT JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
    WHERE coa.id IS NULL AND jel.account_id IS NOT NULL;
    
    IF current_count > 0 THEN
        table_info := jsonb_build_object(
            'table', 'journal_entry_lines',
            'issue', 'قيود محاسبية تشير إلى حسابات محذوفة',
            'count', current_count
        );
        orphaned_records := orphaned_records || table_info;
        issues_found := issues_found + current_count;
    END IF;
    
    -- فحص العقود المعلقة (إذا كان العمود موجود)
    IF column_exists('contracts', 'account_id') THEN
        SELECT COUNT(*) INTO current_count
        FROM public.contracts c
        LEFT JOIN public.chart_of_accounts coa ON c.account_id = coa.id
        WHERE coa.id IS NULL AND c.account_id IS NOT NULL;
        
        IF current_count > 0 THEN
            table_info := jsonb_build_object(
                'table', 'contracts',
                'issue', 'عقود تشير إلى حسابات محذوفة',
                'count', current_count
            );
            orphaned_records := orphaned_records || table_info;
            issues_found := issues_found + current_count;
        END IF;
    END IF;
    
    -- إرجاع النتائج
    RETURN jsonb_build_object(
        'success', true,
        'issues_found', issues_found,
        'orphaned_records', orphaned_records,
        'integrity_status', CASE WHEN issues_found = 0 THEN 'clean' ELSE 'issues_detected' END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في فحص سلامة البيانات: ' || SQLERRM
        );
END;
$$;

-- المرحلة السادسة: إنشاء دالة تنظيف البيانات المعلقة
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_account_references(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    cleaned_records jsonb := '{}'::jsonb;
    current_count integer;
BEGIN
    -- تنظيف القيود المحاسبية المعلقة
    DELETE FROM public.journal_entry_lines
    WHERE account_id NOT IN (SELECT id FROM public.chart_of_accounts WHERE is_active = true);
    GET DIAGNOSTICS current_count = ROW_COUNT;
    cleaned_records := cleaned_records || jsonb_build_object('journal_entry_lines_cleaned', current_count);
    
    -- تنظيف العقود المعلقة (إذا كان العمود موجود)
    IF column_exists('contracts', 'account_id') THEN
        UPDATE public.contracts 
        SET account_id = NULL 
        WHERE account_id IS NOT NULL 
        AND account_id NOT IN (SELECT id FROM public.chart_of_accounts WHERE is_active = true);
        GET DIAGNOSTICS current_count = ROW_COUNT;
        cleaned_records := cleaned_records || jsonb_build_object('contracts_cleaned', current_count);
    END IF;
    
    -- تنظيف المدفوعات المعلقة (إذا كان العمود موجود)
    IF column_exists('payments', 'account_id') THEN
        UPDATE public.payments 
        SET account_id = NULL 
        WHERE account_id IS NOT NULL 
        AND account_id NOT IN (SELECT id FROM public.chart_of_accounts WHERE is_active = true);
        GET DIAGNOSTICS current_count = ROW_COUNT;
        cleaned_records := cleaned_records || jsonb_build_object('payments_cleaned', current_count);
    END IF;
    
    -- تنظيف عناصر الفواتير المعلقة (إذا كان العمود موجود)
    IF column_exists('invoice_items', 'account_id') THEN
        DELETE FROM public.invoice_items 
        WHERE account_id IS NOT NULL 
        AND account_id NOT IN (SELECT id FROM public.chart_of_accounts WHERE is_active = true);
        GET DIAGNOSTICS current_count = ROW_COUNT;
        cleaned_records := cleaned_records || jsonb_build_object('invoice_items_cleaned', current_count);
    END IF;
    
    -- تنظيف الفواتير المعلقة (إذا كان العمود موجود)
    IF column_exists('invoices', 'account_id') THEN
        UPDATE public.invoices 
        SET account_id = NULL 
        WHERE account_id IS NOT NULL 
        AND account_id NOT IN (SELECT id FROM public.chart_of_accounts WHERE is_active = true);
        GET DIAGNOSTICS current_count = ROW_COUNT;
        cleaned_records := cleaned_records || jsonb_build_object('invoices_cleaned', current_count);
    END IF;
    
    -- تنظيف العملاء المعلقين (إذا كان العمود موجود)
    IF column_exists('customers', 'account_id') THEN
        UPDATE public.customers 
        SET account_id = NULL 
        WHERE account_id IS NOT NULL 
        AND account_id NOT IN (SELECT id FROM public.chart_of_accounts WHERE is_active = true);
        GET DIAGNOSTICS current_count = ROW_COUNT;
        cleaned_records := cleaned_records || jsonb_build_object('customers_cleaned', current_count);
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم تنظيف البيانات المعلقة بنجاح',
        'cleaned_records', cleaned_records
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في تنظيف البيانات: ' || SQLERRM
        );
END;
$$;
