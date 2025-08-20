-- Fix the enhanced_cascade_delete_account function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION public.enhanced_cascade_delete_account(
    account_id_param uuid, 
    force_delete boolean DEFAULT false, 
    transfer_to_account_id uuid DEFAULT NULL::uuid, 
    analysis_only boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_record RECORD;
    child_accounts_count INTEGER;
    linked_tables_count INTEGER;
    linked_tables TEXT[];
    table_counts JSONB;
    deletion_log_id UUID;
    journal_entries_count INTEGER;
    result JSONB;
    transfer_account_record RECORD;
    affected_records JSONB := '{}'::jsonb;
    count_value INTEGER;
BEGIN
    -- التحقق من وجود الحساب
    SELECT * INTO account_record
    FROM public.chart_of_accounts
    WHERE id = account_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الحساب غير موجود أو غير نشط'
        );
    END IF;
    
    -- منع حذف الحسابات النظامية بدون إجبار
    IF account_record.is_system = true AND NOT force_delete THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'لا يمكن حذف الحساب النظامي بدون استخدام خيار الحذف القسري'
        );
    END IF;
    
    -- عد الحسابات الفرعية
    SELECT COUNT(*) INTO child_accounts_count
    FROM public.chart_of_accounts
    WHERE parent_account_id = account_id_param AND is_active = true;
    
    -- عد القيود المحاسبية المرتبطة
    SELECT COUNT(*) INTO journal_entries_count
    FROM public.journal_entry_lines
    WHERE account_id = account_id_param;
    
    -- تحديد الجداول المرتبطة مع عدد السجلات (استخدام فحص مباشر للجداول المعروفة)
    table_counts := jsonb_build_object();
    linked_tables := ARRAY[]::TEXT[];
    linked_tables_count := 0;
    
    -- فحص customers
    SELECT COUNT(*) INTO count_value FROM public.customers WHERE account_id = account_id_param;
    IF count_value > 0 THEN
        linked_tables := array_append(linked_tables, 'customers');
        linked_tables_count := linked_tables_count + count_value;
        table_counts := jsonb_set(table_counts, ARRAY['customers'], to_jsonb(count_value));
    END IF;
    
    -- فحص contracts
    SELECT COUNT(*) INTO count_value FROM public.contracts WHERE account_id = account_id_param;
    IF count_value > 0 THEN
        linked_tables := array_append(linked_tables, 'contracts');
        linked_tables_count := linked_tables_count + count_value;
        table_counts := jsonb_set(table_counts, ARRAY['contracts'], to_jsonb(count_value));
    END IF;
    
    -- فحص invoices
    SELECT COUNT(*) INTO count_value FROM public.invoices WHERE account_id = account_id_param;
    IF count_value > 0 THEN
        linked_tables := array_append(linked_tables, 'invoices');
        linked_tables_count := linked_tables_count + count_value;
        table_counts := jsonb_set(table_counts, ARRAY['invoices'], to_jsonb(count_value));
    END IF;
    
    -- فحص payments
    SELECT COUNT(*) INTO count_value FROM public.payments WHERE account_id = account_id_param;
    IF count_value > 0 THEN
        linked_tables := array_append(linked_tables, 'payments');
        linked_tables_count := linked_tables_count + count_value;
        table_counts := jsonb_set(table_counts, ARRAY['payments'], to_jsonb(count_value));
    END IF;
    
    -- في حالة التحليل فقط، إرجاع النتائج
    IF analysis_only THEN
        RETURN jsonb_build_object(
            'success', true,
            'can_delete', (child_accounts_count = 0 AND journal_entries_count = 0 AND linked_tables_count = 0) OR force_delete OR transfer_to_account_id IS NOT NULL,
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', account_record.is_system
            ),
            'child_accounts_count', child_accounts_count,
            'journal_entries_count', journal_entries_count,
            'linked_tables', linked_tables,
            'table_counts', table_counts,
            'message',
            CASE 
                WHEN child_accounts_count > 0 THEN 'يوجد ' || child_accounts_count || ' حساب فرعي مرتبط'
                WHEN journal_entries_count > 0 AND transfer_to_account_id IS NULL AND NOT force_delete THEN 'يوجد ' || journal_entries_count || ' قيد محاسبي مرتبط - يتطلب نقل أو حذف قسري'
                WHEN linked_tables_count > 0 AND NOT force_delete THEN 'يوجد بيانات مرتبطة في جداول أخرى - يتطلب حذف قسري'
                ELSE 'يمكن حذف الحساب بأمان'
            END
        );
    END IF;
    
    -- التحقق من صحة حساب النقل إذا تم تحديده
    IF transfer_to_account_id IS NOT NULL THEN
        SELECT * INTO transfer_account_record
        FROM public.chart_of_accounts
        WHERE id = transfer_to_account_id AND is_active = true;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'حساب النقل غير موجود أو غير نشط'
            );
        END IF;
        
        -- التأكد من أن حساب النقل ليس نفس الحساب المراد حذفه
        IF transfer_to_account_id = account_id_param THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'لا يمكن نقل البيانات إلى نفس الحساب'
            );
        END IF;
    END IF;
    
    -- منع الحذف العادي إذا كان هناك حسابات فرعية
    IF child_accounts_count > 0 AND NOT force_delete THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'لا يمكن حذف الحساب لوجود ' || child_accounts_count || ' حساب فرعي. استخدم الحذف القسري لحذف جميع الحسابات الفرعية.'
        );
    END IF;
    
    -- منع الحذف العادي إذا كان هناك قيود محاسبية بدون نقل
    IF journal_entries_count > 0 AND transfer_to_account_id IS NULL AND NOT force_delete THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'لا يمكن حذف الحساب لوجود ' || journal_entries_count || ' قيد محاسبي مرتبط. اختر حساب للنقل إليه أو استخدم الحذف القسري.'
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
        deletion_reason,
        deleted_by
    ) VALUES (
        account_record.company_id,
        account_record.id,
        account_record.account_code,
        account_record.account_name,
        CASE 
            WHEN force_delete THEN 'force_delete'
            WHEN transfer_to_account_id IS NOT NULL THEN 'transfer'
            ELSE 'normal'
        END,
        transfer_to_account_id,
        CASE 
            WHEN force_delete THEN 'حذف قسري للحساب وجميع البيانات المرتبطة'
            WHEN transfer_to_account_id IS NOT NULL THEN 'نقل البيانات إلى حساب آخر وحذف الحساب'
            ELSE 'حذف عادي للحساب'
        END,
        auth.uid()
    ) RETURNING id INTO deletion_log_id;
    
    -- معالجة القيود المحاسبية أولاً
    IF journal_entries_count > 0 THEN
        IF transfer_to_account_id IS NOT NULL THEN
            -- نقل القيود المحاسبية إلى الحساب الجديد
            UPDATE public.journal_entry_lines
            SET account_id = transfer_to_account_id
            WHERE account_id = account_id_param;
            
            -- تحديث رصيد الحساب الجديد
            UPDATE public.chart_of_accounts
            SET current_balance = current_balance + account_record.current_balance
            WHERE id = transfer_to_account_id;
            
            affected_records := jsonb_set(affected_records, ARRAY['journal_entries_transferred'], to_jsonb(journal_entries_count));
            
        ELSIF force_delete THEN
            -- حذف جميع القيود المحاسبية
            DELETE FROM public.journal_entry_lines WHERE account_id = account_id_param;
            affected_records := jsonb_set(affected_records, ARRAY['journal_entries_deleted'], to_jsonb(journal_entries_count));
        END IF;
    END IF;
    
    -- معالجة الحسابات الفرعية في حالة الحذف القسري
    IF child_accounts_count > 0 AND force_delete THEN
        -- حذف الحسابات الفرعية (سيتم التعامل معها تلقائياً بواسطة CASCADE في المستقبل)
        UPDATE public.chart_of_accounts
        SET is_active = false, updated_at = now()
        WHERE parent_account_id = account_id_param;
        
        affected_records := jsonb_set(affected_records, ARRAY['child_accounts_deactivated'], to_jsonb(child_accounts_count));
    END IF;
    
    -- معالجة الجداول الأخرى المرتبطة في حالة الحذف القسري
    IF force_delete AND array_length(linked_tables, 1) > 0 THEN
        -- customers
        IF 'customers' = ANY(linked_tables) THEN
            UPDATE public.customers SET account_id = NULL WHERE account_id = account_id_param;
            GET DIAGNOSTICS count_value = ROW_COUNT;
            IF count_value > 0 THEN
                affected_records := jsonb_set(affected_records, ARRAY['customers_updated'], to_jsonb(count_value));
            END IF;
        END IF;
        
        -- contracts  
        IF 'contracts' = ANY(linked_tables) THEN
            UPDATE public.contracts SET account_id = NULL WHERE account_id = account_id_param;
            GET DIAGNOSTICS count_value = ROW_COUNT;
            IF count_value > 0 THEN
                affected_records := jsonb_set(affected_records, ARRAY['contracts_updated'], to_jsonb(count_value));
            END IF;
        END IF;
        
        -- invoices
        IF 'invoices' = ANY(linked_tables) THEN
            UPDATE public.invoices SET account_id = NULL WHERE account_id = account_id_param;
            GET DIAGNOSTICS count_value = ROW_COUNT;
            IF count_value > 0 THEN
                affected_records := jsonb_set(affected_records, ARRAY['invoices_updated'], to_jsonb(count_value));
            END IF;
        END IF;
        
        -- payments
        IF 'payments' = ANY(linked_tables) THEN
            UPDATE public.payments SET account_id = NULL WHERE account_id = account_id_param;
            GET DIAGNOSTICS count_value = ROW_COUNT;
            IF count_value > 0 THEN
                affected_records := jsonb_set(affected_records, ARRAY['payments_updated'], to_jsonb(count_value));
            END IF;
        END IF;
    END IF;
    
    -- أخيراً، تعطيل الحساب (أو حذفه في حالة الحذف القسري)
    IF force_delete THEN
        -- في الحذف القسري، نحذف الحساب فعلياً
        DELETE FROM public.chart_of_accounts WHERE id = account_id_param;
    ELSE
        -- في الحذف العادي أو النقل، نعطل الحساب فقط
        UPDATE public.chart_of_accounts
        SET is_active = false, updated_at = now()
        WHERE id = account_id_param;
    END IF;
    
    -- تحديث سجل الحذف بالسجلات المتأثرة
    UPDATE public.account_deletion_log
    SET affected_records = affected_records
    WHERE id = deletion_log_id;
    
    -- إرجاع النتيجة
    result := jsonb_build_object(
        'success', true,
        'action', CASE 
            WHEN transfer_to_account_id IS NOT NULL THEN 'transferred'
            WHEN force_delete THEN 'force'
            ELSE 'deleted'
        END,
        'deleted_account', jsonb_build_object(
            'code', account_record.account_code,
            'name', account_record.account_name
        ),
        'deletion_log_id', deletion_log_id
    );
    
    -- إضافة معلومات إضافية حسب نوع العملية
    IF transfer_to_account_id IS NOT NULL THEN
        result := jsonb_set(result, ARRAY['transfer_to_account_id'], to_jsonb(transfer_to_account_id));
        result := jsonb_set(result, ARRAY['journal_entries_transferred'], to_jsonb(journal_entries_count));
    END IF;
    
    IF child_accounts_count > 0 THEN
        result := jsonb_set(result, ARRAY['child_accounts_deleted'], to_jsonb(child_accounts_count));
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في تنفيذ العملية: ' || SQLERRM
        );
END;
$function$;