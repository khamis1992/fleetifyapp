-- إصلاح وتطوير دالة الحذف الشامل للحسابات
DROP FUNCTION IF EXISTS public.enhanced_cascade_delete_account(uuid, boolean, uuid, boolean);

CREATE OR REPLACE FUNCTION public.enhanced_cascade_delete_account(
    account_id_param uuid,
    force_delete boolean DEFAULT false,
    transfer_to_account_id uuid DEFAULT NULL,
    analysis_only boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_record record;
    child_accounts_count integer := 0;
    linked_tables_info jsonb := '[]'::jsonb;
    table_counts jsonb := '{}'::jsonb;
    affected_records jsonb := '{}'::jsonb;
    deletion_log_id uuid;
    current_table_name text;
    current_count integer;
    transfer_account_record record;
    result jsonb;
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
    
    -- التحقق من الحساب البديل إذا تم تحديده
    IF transfer_to_account_id IS NOT NULL THEN
        SELECT * INTO transfer_account_record
        FROM public.chart_of_accounts
        WHERE id = transfer_to_account_id
        AND company_id = account_record.company_id
        AND is_active = true;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'حساب النقل غير موجود أو غير نشط'
            );
        END IF;
    END IF;
    
    -- عد الحسابات الفرعية
    SELECT COUNT(*) INTO child_accounts_count
    FROM public.chart_of_accounts
    WHERE parent_account_id = account_id_param AND is_active = true;
    
    -- المرحلة الأولى: تحليل البيانات المرتبطة
    -- فحص القيود المحاسبية
    SELECT COUNT(*) INTO current_count
    FROM public.journal_entry_lines jel
    WHERE jel.account_id = account_id_param;
    
    IF current_count > 0 THEN
        linked_tables_info := linked_tables_info || jsonb_build_object('table', 'journal_entry_lines', 'count', current_count);
        table_counts := table_counts || jsonb_build_object('journal_entry_lines', current_count);
    END IF;
    
    -- فحص العقود
    SELECT COUNT(*) INTO current_count
    FROM public.contracts c
    WHERE c.account_id = account_id_param;
    
    IF current_count > 0 THEN
        linked_tables_info := linked_tables_info || jsonb_build_object('table', 'contracts', 'count', current_count);
        table_counts := table_counts || jsonb_build_object('contracts', current_count);
    END IF;
    
    -- فحص المدفوعات
    SELECT COUNT(*) INTO current_count
    FROM public.payments p
    WHERE p.account_id = account_id_param;
    
    IF current_count > 0 THEN
        linked_tables_info := linked_tables_info || jsonb_build_object('table', 'payments', 'count', current_count);
        table_counts := table_counts || jsonb_build_object('payments', current_count);
    END IF;
    
    -- فحص عناصر الفواتير
    SELECT COUNT(*) INTO current_count
    FROM public.invoice_items ii
    WHERE ii.account_id = account_id_param;
    
    IF current_count > 0 THEN
        linked_tables_info := linked_tables_info || jsonb_build_object('table', 'invoice_items', 'count', current_count);
        table_counts := table_counts || jsonb_build_object('invoice_items', current_count);
    END IF;
    
    -- فحص الفواتير
    SELECT COUNT(*) INTO current_count
    FROM public.invoices i
    WHERE i.account_id = account_id_param;
    
    IF current_count > 0 THEN
        linked_tables_info := linked_tables_info || jsonb_build_object('table', 'invoices', 'count', current_count);
        table_counts := table_counts || jsonb_build_object('invoices', current_count);
    END IF;
    
    -- فحص الأصول الثابتة
    SELECT COUNT(*) INTO current_count
    FROM public.fixed_assets fa
    WHERE fa.depreciation_account_id = account_id_param 
       OR fa.accumulated_depreciation_account_id = account_id_param;
    
    IF current_count > 0 THEN
        linked_tables_info := linked_tables_info || jsonb_build_object('table', 'fixed_assets', 'count', current_count);
        table_counts := table_counts || jsonb_build_object('fixed_assets', current_count);
    END IF;
    
    -- فحص عناصر الميزانية
    SELECT COUNT(*) INTO current_count
    FROM public.budget_items bi
    WHERE bi.account_id = account_id_param;
    
    IF current_count > 0 THEN
        linked_tables_info := linked_tables_info || jsonb_build_object('table', 'budget_items', 'count', current_count);
        table_counts := table_counts || jsonb_build_object('budget_items', current_count);
    END IF;
    
    -- فحص العملاء
    SELECT COUNT(*) INTO current_count
    FROM public.customers cu
    WHERE cu.account_id = account_id_param;
    
    IF current_count > 0 THEN
        linked_tables_info := linked_tables_info || jsonb_build_object('table', 'customers', 'count', current_count);
        table_counts := table_counts || jsonb_build_object('customers', current_count);
    END IF;
    
    -- التحقق من إمكانية الحذف
    IF account_record.is_system = true AND force_delete = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'error', 'لا يمكن حذف الحساب النظامي بدون استخدام خيار الحذف القسري',
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', account_record.is_system
            ),
            'linked_tables', linked_tables_info,
            'table_counts', table_counts,
            'child_accounts_count', child_accounts_count
        );
    END IF;
    
    IF jsonb_array_length(linked_tables_info) > 0 AND force_delete = false AND transfer_to_account_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'message', 'يوجد بيانات مرتبطة بهذا الحساب. يرجى اختيار نقل البيانات أو الحذف القسري',
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', account_record.is_system
            ),
            'linked_tables', linked_tables_info,
            'table_counts', table_counts,
            'child_accounts_count', child_accounts_count
        );
    END IF;
    
    -- إذا كان تحليل فقط، إرجاع النتائج
    IF analysis_only = true THEN
        RETURN jsonb_build_object(
            'success', true,
            'can_delete', true,
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', account_record.is_system
            ),
            'linked_tables', linked_tables_info,
            'table_counts', table_counts,
            'child_accounts_count', child_accounts_count,
            'message', 'تحليل مكتمل - يمكن المتابعة للحذف'
        );
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
        deletion_reason
    ) VALUES (
        account_record.company_id,
        account_record.id,
        account_record.account_code,
        account_record.account_name,
        CASE 
            WHEN force_delete THEN 'force'
            WHEN transfer_to_account_id IS NOT NULL THEN 'transferred'
            ELSE 'deleted'
        END,
        transfer_to_account_id,
        auth.uid(),
        CASE 
            WHEN force_delete THEN 'حذف قسري بواسطة المستخدم'
            WHEN transfer_to_account_id IS NOT NULL THEN 'نقل البيانات قبل الحذف'
            ELSE 'حذف عادي'
        END
    ) RETURNING id INTO deletion_log_id;
    
    -- المرحلة الثانية: نقل أو حذف البيانات
    IF transfer_to_account_id IS NOT NULL THEN
        -- نقل القيود المحاسبية
        UPDATE public.journal_entry_lines 
        SET account_id = transfer_to_account_id 
        WHERE account_id = account_id_param;
        
        -- نقل العقود
        UPDATE public.contracts 
        SET account_id = transfer_to_account_id 
        WHERE account_id = account_id_param;
        
        -- نقل المدفوعات
        UPDATE public.payments 
        SET account_id = transfer_to_account_id 
        WHERE account_id = account_id_param;
        
        -- نقل عناصر الفواتير
        UPDATE public.invoice_items 
        SET account_id = transfer_to_account_id 
        WHERE account_id = account_id_param;
        
        -- نقل الفواتير
        UPDATE public.invoices 
        SET account_id = transfer_to_account_id 
        WHERE account_id = account_id_param;
        
        -- نقل العملاء
        UPDATE public.customers 
        SET account_id = transfer_to_account_id 
        WHERE account_id = account_id_param;
        
        -- نقل عناصر الميزانية
        UPDATE public.budget_items 
        SET account_id = transfer_to_account_id 
        WHERE account_id = account_id_param;
        
        -- نقل الأصول الثابتة
        UPDATE public.fixed_assets 
        SET depreciation_account_id = transfer_to_account_id 
        WHERE depreciation_account_id = account_id_param;
        
        UPDATE public.fixed_assets 
        SET accumulated_depreciation_account_id = transfer_to_account_id 
        WHERE accumulated_depreciation_account_id = account_id_param;
        
        affected_records := table_counts;
        
    ELSIF force_delete = true THEN
        -- حذف القيود المحاسبية
        DELETE FROM public.journal_entry_lines WHERE account_id = account_id_param;
        
        -- حذف أو إلغاء ربط العقود
        UPDATE public.contracts SET account_id = NULL WHERE account_id = account_id_param;
        
        -- حذف أو إلغاء ربط المدفوعات  
        UPDATE public.payments SET account_id = NULL WHERE account_id = account_id_param;
        
        -- حذف عناصر الفواتير
        DELETE FROM public.invoice_items WHERE account_id = account_id_param;
        
        -- إلغاء ربط الفواتير
        UPDATE public.invoices SET account_id = NULL WHERE account_id = account_id_param;
        
        -- إلغاء ربط العملاء
        UPDATE public.customers SET account_id = NULL WHERE account_id = account_id_param;
        
        -- حذف عناصر الميزانية
        DELETE FROM public.budget_items WHERE account_id = account_id_param;
        
        -- إلغاء ربط الأصول الثابتة
        UPDATE public.fixed_assets SET depreciation_account_id = NULL WHERE depreciation_account_id = account_id_param;
        UPDATE public.fixed_assets SET accumulated_depreciation_account_id = NULL WHERE accumulated_depreciation_account_id = account_id_param;
        
        affected_records := table_counts;
    END IF;
    
    -- المرحلة الثالثة: حذف الحسابات الفرعية
    IF force_delete = true THEN
        UPDATE public.chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE parent_account_id = account_id_param;
    END IF;
    
    -- المرحلة الرابعة: حذف الحساب الأساسي
    IF force_delete = true THEN
        DELETE FROM public.chart_of_accounts WHERE id = account_id_param;
    ELSE
        UPDATE public.chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE id = account_id_param;
    END IF;
    
    -- تحديث سجل الحذف
    UPDATE public.account_deletion_log 
    SET affected_records = affected_records
    WHERE id = deletion_log_id;
    
    -- إعداد النتيجة النهائية
    result := jsonb_build_object(
        'success', true,
        'deletion_log_id', deletion_log_id,
        'deleted_account', jsonb_build_object(
            'code', account_record.account_code,
            'name', account_record.account_name
        ),
        'child_accounts_deleted', child_accounts_count
    );
    
    IF transfer_to_account_id IS NOT NULL THEN
        result := result || jsonb_build_object(
            'action', 'transferred',
            'transfer_to_account_id', transfer_to_account_id
        );
    ELSIF force_delete = true THEN
        result := result || jsonb_build_object('action', 'force');
    ELSE
        result := result || jsonb_build_object('action', 'deleted');
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في تنفيذ العملية: ' || SQLERRM
        );
END;
$$;