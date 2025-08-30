-- إنشاء دالة محسنة لمعاينة حذف جميع الحسابات مع تحليل القيود الخارجية
CREATE OR REPLACE FUNCTION public.get_enhanced_accounts_deletion_preview(
    target_company_id UUID,
    force_delete_system BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_accounts INTEGER := 0;
    system_accounts INTEGER := 0;
    regular_accounts INTEGER := 0;
    will_be_deleted INTEGER := 0;
    will_be_deactivated INTEGER := 0;
    account_record RECORD;
    sample_accounts JSON[] := '{}';
    system_accounts_sample JSON[] := '{}';
    warning_message TEXT := '';
    has_journal_entries BOOLEAN;
    has_fixed_assets BOOLEAN;
    has_budget_items BOOLEAN;
    has_other_refs BOOLEAN;
    analysis_result TEXT;
BEGIN
    -- عد إجمالي الحسابات
    SELECT COUNT(*) INTO total_accounts
    FROM chart_of_accounts
    WHERE company_id = target_company_id AND is_active = true;
    
    -- عد الحسابات النظامية
    SELECT COUNT(*) INTO system_accounts
    FROM chart_of_accounts
    WHERE company_id = target_company_id AND is_active = true AND is_system = true;
    
    regular_accounts := total_accounts - system_accounts;
    
    -- تحليل كل حساب لتحديد الإجراء المناسب
    FOR account_record IN 
        SELECT id, account_code, account_name, is_system
        FROM chart_of_accounts
        WHERE company_id = target_company_id 
        AND is_active = true
        ORDER BY account_code
    LOOP
        -- فحص القيود المحاسبية
        SELECT EXISTS(
            SELECT 1 FROM journal_entry_lines jel
            JOIN journal_entries je ON jel.journal_entry_id = je.id
            WHERE jel.account_id = account_record.id
            AND je.status = 'posted'
        ) INTO has_journal_entries;
        
        -- فحص الأصول الثابتة
        SELECT EXISTS(
            SELECT 1 FROM fixed_assets
            WHERE asset_account_id = account_record.id 
            OR depreciation_account_id = account_record.id
        ) INTO has_fixed_assets;
        
        -- فحص عناصر الميزانية
        SELECT EXISTS(
            SELECT 1 FROM budget_items
            WHERE account_id = account_record.id
        ) INTO has_budget_items;
        
        -- فحص مراجع أخرى (العقود، المدفوعات، الفواتير، العملاء)
        SELECT EXISTS(
            SELECT 1 FROM contracts WHERE account_id = account_record.id
            UNION ALL
            SELECT 1 FROM payments WHERE account_id = account_record.id
            UNION ALL
            SELECT 1 FROM invoices WHERE account_id = account_record.id
            UNION ALL
            SELECT 1 FROM customers WHERE account_id = account_record.id
        ) INTO has_other_refs;
        
        -- تحديد الإجراء بناءً على التحليل
        IF account_record.is_system AND NOT force_delete_system THEN
            analysis_result := 'deactivate_system';
            will_be_deactivated := will_be_deactivated + 1;
        ELSIF has_journal_entries OR has_other_refs THEN
            analysis_result := 'deactivate_has_entries';
            will_be_deactivated := will_be_deactivated + 1;
        ELSIF has_fixed_assets OR has_budget_items THEN
            analysis_result := 'delete_after_cleanup';
            will_be_deleted := will_be_deleted + 1;
        ELSE
            analysis_result := 'safe_delete';
            will_be_deleted := will_be_deleted + 1;
        END IF;
        
        -- إضافة عينات للعرض
        IF array_length(sample_accounts, 1) < 10 THEN
            sample_accounts := sample_accounts || json_build_object(
                'account_code', account_record.account_code,
                'account_name', account_record.account_name,
                'action', analysis_result,
                'has_journal_entries', has_journal_entries,
                'has_fixed_assets', has_fixed_assets,
                'has_budget_items', has_budget_items,
                'has_other_refs', has_other_refs
            );
        END IF;
        
        -- إضافة عينات الحسابات النظامية
        IF account_record.is_system AND array_length(system_accounts_sample, 1) < 5 THEN
            system_accounts_sample := system_accounts_sample || json_build_object(
                'account_code', account_record.account_code,
                'account_name', account_record.account_name,
                'action', CASE WHEN force_delete_system THEN 'force_delete' ELSE 'skip_system' END
            );
        END IF;
    END LOOP;
    
    -- إنشاء رسالة التحذير
    IF system_accounts > 0 AND NOT force_delete_system THEN
        warning_message := format('يوجد %s حساب نظامي سيتم تخطيه. فعل "فرض حذف الحسابات النظامية" لحذفها.', system_accounts);
    ELSIF will_be_deactivated > 0 THEN
        warning_message := format('سيتم إلغاء تفعيل %s حساب بدلاً من حذفه لوجود قيود محاسبية أو مراجع.', will_be_deactivated);
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'total_accounts', total_accounts,
        'system_accounts', system_accounts,
        'regular_accounts', regular_accounts,
        'will_be_deleted', will_be_deleted,
        'will_be_deactivated', will_be_deactivated,
        'sample_accounts', sample_accounts,
        'system_accounts_sample', system_accounts_sample,
        'warning_message', warning_message
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'total_accounts', 0,
            'system_accounts', 0,
            'regular_accounts', 0,
            'will_be_deleted', 0,
            'will_be_deactivated', 0,
            'sample_accounts', '[]'::json,
            'system_accounts_sample', '[]'::json,
            'warning_message', 'خطأ في تحليل الحسابات'
        );
END;
$$;

-- إنشاء دالة محسنة لحذف جميع الحسابات مع معالجة القيود الخارجية
CREATE OR REPLACE FUNCTION public.enhanced_bulk_delete_company_accounts(
    target_company_id UUID,
    include_system_accounts BOOLEAN DEFAULT FALSE,
    deletion_reason TEXT DEFAULT 'Bulk deletion'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    start_time TIMESTAMP := now();
    account_record RECORD;
    deleted_count INTEGER := 0;
    deactivated_count INTEGER := 0;
    failed_count INTEGER := 0;
    total_processed INTEGER := 0;
    success_details JSON[] := '{}';
    error_details JSON[] := '{}';
    operation_result TEXT;
    error_message TEXT;
    has_journal_entries BOOLEAN;
    has_fixed_assets BOOLEAN;
    has_budget_items BOOLEAN;
    has_other_refs BOOLEAN;
BEGIN
    -- معالجة كل حساب بشكل منفصل
    FOR account_record IN 
        SELECT id, account_code, account_name, is_system
        FROM chart_of_accounts
        WHERE company_id = target_company_id 
        AND is_active = true
        ORDER BY account_level DESC, account_code -- البدء بالحسابات الفرعية
    LOOP
        total_processed := total_processed + 1;
        operation_result := 'unknown';
        error_message := NULL;
        
        BEGIN
            -- فحص القيود والمراجع
            SELECT EXISTS(
                SELECT 1 FROM journal_entry_lines jel
                JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE jel.account_id = account_record.id
                AND je.status = 'posted'
            ) INTO has_journal_entries;
            
            SELECT EXISTS(
                SELECT 1 FROM fixed_assets
                WHERE asset_account_id = account_record.id 
                OR depreciation_account_id = account_record.id
            ) INTO has_fixed_assets;
            
            SELECT EXISTS(
                SELECT 1 FROM budget_items
                WHERE account_id = account_record.id
            ) INTO has_budget_items;
            
            SELECT EXISTS(
                SELECT 1 FROM contracts WHERE account_id = account_record.id
                UNION ALL
                SELECT 1 FROM payments WHERE account_id = account_record.id
                UNION ALL
                SELECT 1 FROM invoices WHERE account_id = account_record.id
                UNION ALL
                SELECT 1 FROM customers WHERE account_id = account_record.id
            ) INTO has_other_refs;
            
            -- تحديد الإجراء المناسب وتنفيذه
            IF account_record.is_system AND NOT include_system_accounts THEN
                -- تخطي الحسابات النظامية
                operation_result := 'skipped_system';
                error_message := 'حساب نظامي - تم تخطيه';
                
            ELSIF has_journal_entries OR has_other_refs THEN
                -- إلغاء تفعيل الحسابات التي لها قيود محاسبية أو مراجع
                UPDATE chart_of_accounts 
                SET is_active = false, updated_at = now() 
                WHERE id = account_record.id;
                
                -- تسجيل سبب إلغاء التفعيل
                INSERT INTO account_deletion_log (
                    company_id,
                    deleted_account_id,
                    deleted_account_code,
                    deleted_account_name,
                    deletion_type,
                    deletion_reason,
                    deleted_by
                ) VALUES (
                    target_company_id,
                    account_record.id,
                    account_record.account_code,
                    account_record.account_name,
                    'deactivated',
                    'له قيود محاسبية أو مراجع: ' || deletion_reason,
                    auth.uid()
                );
                
                deactivated_count := deactivated_count + 1;
                operation_result := 'deactivated';
                error_message := CASE 
                    WHEN has_journal_entries THEN 'له قيود محاسبية'
                    WHEN has_other_refs THEN 'له مراجع في جداول أخرى'
                    ELSE 'إلغاء تفعيل لأسباب أمان'
                END;
                
            ELSE
                -- محاولة حذف الحساب بعد تنظيف البيانات التابعة
                
                -- 1. حذف عناصر الميزانية المرتبطة
                IF has_budget_items THEN
                    DELETE FROM budget_items WHERE account_id = account_record.id;
                END IF;
                
                -- 2. معالجة الأصول الثابتة
                IF has_fixed_assets THEN
                    -- حذف الأصول الثابتة المرتبطة
                    DELETE FROM fixed_assets 
                    WHERE asset_account_id = account_record.id 
                    OR depreciation_account_id = account_record.id;
                END IF;
                
                -- 3. تنظيف المراجع الأخرى (تحديث إلى NULL)
                UPDATE contracts SET account_id = NULL WHERE account_id = account_record.id;
                UPDATE payments SET account_id = NULL WHERE account_id = account_record.id;
                UPDATE invoices SET account_id = NULL WHERE account_id = account_record.id;
                UPDATE customers SET account_id = NULL WHERE account_id = account_record.id;
                
                -- 4. حذف الحساب نهائياً
                DELETE FROM chart_of_accounts WHERE id = account_record.id;
                
                -- تسجيل الحذف
                INSERT INTO account_deletion_log (
                    company_id,
                    deleted_account_id,
                    deleted_account_code,
                    deleted_account_name,
                    deletion_type,
                    deletion_reason,
                    deleted_by
                ) VALUES (
                    target_company_id,
                    account_record.id,
                    account_record.account_code,
                    account_record.account_name,
                    'deleted',
                    deletion_reason,
                    auth.uid()
                );
                
                deleted_count := deleted_count + 1;
                operation_result := 'deleted';
                error_message := 'تم الحذف بنجاح';
            END IF;
            
            -- إضافة تفاصيل النجاح
            success_details := success_details || json_build_object(
                'account_code', account_record.account_code,
                'account_name', account_record.account_name,
                'action', operation_result,
                'reason', error_message
            );
            
        EXCEPTION
            WHEN OTHERS THEN
                -- معالجة الأخطاء
                failed_count := failed_count + 1;
                error_message := SQLERRM;
                
                error_details := error_details || json_build_object(
                    'account_code', account_record.account_code,
                    'account_name', account_record.account_name,
                    'error', error_message
                );
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', format('تمت معالجة %s حساب: %s تم حذفها، %s تم إلغاء تفعيلها، %s فشل', 
                         total_processed, deleted_count, deactivated_count, failed_count),
        'deleted_count', deleted_count,
        'deactivated_count', deactivated_count,
        'failed_count', failed_count,
        'total_processed', total_processed,
        'success_details', success_details,
        'error_details', error_details,
        'operation_duration', EXTRACT(EPOCH FROM (now() - start_time))::text || ' seconds'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'فشل في عملية الحذف الجماعي',
            'deleted_count', deleted_count,
            'deactivated_count', deactivated_count,
            'failed_count', failed_count,
            'total_processed', total_processed,
            'success_details', success_details,
            'error_details', error_details,
            'operation_duration', EXTRACT(EPOCH FROM (now() - start_time))::text || ' seconds'
        );
END;
$$;