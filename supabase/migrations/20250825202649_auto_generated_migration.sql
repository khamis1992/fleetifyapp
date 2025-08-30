-- إنشاء دالة محسنة لحذف جميع الحسابات مع خيارات متقدمة
CREATE OR REPLACE FUNCTION public.enhanced_complete_account_deletion(
    target_company_id uuid,
    include_system_accounts boolean DEFAULT false,
    include_inactive_accounts boolean DEFAULT true,
    force_complete_reset boolean DEFAULT false,
    deletion_reason text DEFAULT 'Complete accounts deletion'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    start_time TIMESTAMP := now();
    account_record RECORD;
    deleted_count INTEGER := 0;
    deactivated_count INTEGER := 0;
    failed_count INTEGER := 0;
    system_deleted_count INTEGER := 0;
    inactive_deleted_count INTEGER := 0;
    total_processed INTEGER := 0;
    success_details JSON[] := '{}';
    error_details JSON[] := '{}';
    operation_result TEXT;
    error_message TEXT;
BEGIN
    -- معالجة الحسابات غير النشطة أولاً إذا طُلب ذلك
    IF include_inactive_accounts THEN
        FOR account_record IN 
            SELECT id, account_code, account_name, is_system, is_active
            FROM chart_of_accounts
            WHERE company_id = target_company_id 
            AND is_active = false
            ORDER BY account_level DESC, account_code
        LOOP
            total_processed := total_processed + 1;
            
            BEGIN
                -- حذف الحسابات غير النشطة مباشرة
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
                    'deleted_inactive',
                    'حذف الحسابات غير النشطة: ' || deletion_reason,
                    auth.uid()
                );
                
                inactive_deleted_count := inactive_deleted_count + 1;
                
                success_details := success_details || json_build_object(
                    'account_code', COALESCE(account_record.account_code, 'N/A'),
                    'account_name', account_record.account_name,
                    'action', 'deleted_inactive',
                    'reason', 'حساب غير نشط - تم حذفه'
                );
                
            EXCEPTION
                WHEN OTHERS THEN
                    failed_count := failed_count + 1;
                    error_details := error_details || json_build_object(
                        'account_code', COALESCE(account_record.account_code, 'N/A'),
                        'account_name', account_record.account_name,
                        'error', SQLERRM
                    );
            END;
        END LOOP;
    END IF;

    -- معالجة الحسابات النشطة
    FOR account_record IN 
        SELECT id, account_code, account_name, is_system, is_active
        FROM chart_of_accounts
        WHERE company_id = target_company_id 
        AND is_active = true
        ORDER BY account_level DESC, account_code
    LOOP
        total_processed := total_processed + 1;
        operation_result := 'unknown';
        error_message := NULL;
        
        BEGIN
            -- تحديد الإجراء بناءً على نوع الحساب والخيارات المحددة
            IF account_record.is_system AND NOT include_system_accounts THEN
                -- تخطي الحسابات النظامية إذا لم يُطلب حذفها
                operation_result := 'skipped_system';
                error_message := 'حساب نظامي - تم تخطيه';
                
                success_details := success_details || json_build_object(
                    'account_code', COALESCE(account_record.account_code, 'N/A'),
                    'account_name', account_record.account_name,
                    'action', operation_result,
                    'reason', error_message
                );
                
            ELSIF account_record.is_system AND include_system_accounts THEN
                -- حذف الحسابات النظامية إذا طُلب ذلك صراحة
                
                -- تنظيف جميع المراجع أولاً
                IF force_complete_reset THEN
                    -- تنظيف شامل لجميع البيانات المرتبطة
                    DELETE FROM journal_entry_lines WHERE account_id = account_record.id;
                    DELETE FROM budget_items WHERE account_id = account_record.id;
                    
                    -- تنظيف المراجع في الجداول الأخرى (تحديث إلى NULL)
                    UPDATE fixed_assets SET asset_account_id = NULL WHERE asset_account_id = account_record.id;
                    UPDATE fixed_assets SET depreciation_account_id = NULL WHERE depreciation_account_id = account_record.id;
                    
                    -- التحقق من وجود الأعمدة قبل التحديث
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'account_id' AND table_schema = 'public') THEN
                        UPDATE contracts SET account_id = NULL WHERE account_id = account_record.id;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'account_id' AND table_schema = 'public') THEN
                        UPDATE payments SET account_id = NULL WHERE account_id = account_record.id;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'account_id' AND table_schema = 'public') THEN
                        UPDATE invoices SET account_id = NULL WHERE account_id = account_record.id;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'account_id' AND table_schema = 'public') THEN
                        UPDATE customers SET account_id = NULL WHERE account_id = account_record.id;
                    END IF;
                END IF;
                
                -- حذف الحساب النظامي
                DELETE FROM chart_of_accounts WHERE id = account_record.id;
                
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
                    'deleted_system',
                    'حذف حساب نظامي: ' || deletion_reason,
                    auth.uid()
                );
                
                system_deleted_count := system_deleted_count + 1;
                operation_result := 'deleted_system';
                error_message := 'حساب نظامي - تم حذفه';
                
            ELSE
                -- معالجة الحسابات العادية
                DECLARE
                    has_journal_entries BOOLEAN;
                    has_other_refs BOOLEAN;
                BEGIN
                    -- فحص القيود المحاسبية
                    SELECT EXISTS(
                        SELECT 1 FROM journal_entry_lines jel
                        JOIN journal_entries je ON jel.journal_entry_id = je.id
                        WHERE jel.account_id = account_record.id
                        AND je.status = 'posted'
                    ) INTO has_journal_entries;
                    
                    -- فحص المراجع الأخرى
                    has_other_refs := false;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'account_id' AND table_schema = 'public') THEN
                        SELECT EXISTS(SELECT 1 FROM contracts WHERE account_id = account_record.id) INTO has_other_refs;
                    END IF;
                    
                    IF NOT has_other_refs AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'account_id' AND table_schema = 'public') THEN
                        SELECT EXISTS(SELECT 1 FROM payments WHERE account_id = account_record.id) INTO has_other_refs;
                    END IF;
                    
                    IF NOT has_other_refs AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'account_id' AND table_schema = 'public') THEN
                        SELECT EXISTS(SELECT 1 FROM invoices WHERE account_id = account_record.id) INTO has_other_refs;
                    END IF;
                    
                    IF NOT has_other_refs AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'account_id' AND table_schema = 'public') THEN
                        SELECT EXISTS(SELECT 1 FROM customers WHERE account_id = account_record.id) INTO has_other_refs;
                    END IF;
                    
                    IF (has_journal_entries OR has_other_refs) AND NOT force_complete_reset THEN
                        -- إلغاء تفعيل الحسابات التي لها مراجع
                        UPDATE chart_of_accounts 
                        SET is_active = false, updated_at = now() 
                        WHERE id = account_record.id;
                        
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
                        error_message := 'تم إلغاء التفعيل بدلاً من الحذف';
                        
                    ELSE
                        -- حذف الحساب مع تنظيف البيانات المرتبطة
                        IF force_complete_reset THEN
                            DELETE FROM journal_entry_lines WHERE account_id = account_record.id;
                        END IF;
                        
                        DELETE FROM budget_items WHERE account_id = account_record.id;
                        DELETE FROM fixed_assets WHERE asset_account_id = account_record.id OR depreciation_account_id = account_record.id;
                        
                        -- تنظيف المراجع الأخرى
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'account_id' AND table_schema = 'public') THEN
                            UPDATE contracts SET account_id = NULL WHERE account_id = account_record.id;
                        END IF;
                        
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'account_id' AND table_schema = 'public') THEN
                            UPDATE payments SET account_id = NULL WHERE account_id = account_record.id;
                        END IF;
                        
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'account_id' AND table_schema = 'public') THEN
                            UPDATE invoices SET account_id = NULL WHERE account_id = account_record.id;
                        END IF;
                        
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'account_id' AND table_schema = 'public') THEN
                            UPDATE customers SET account_id = NULL WHERE account_id = account_record.id;
                        END IF;
                        
                        -- حذف الحساب
                        DELETE FROM chart_of_accounts WHERE id = account_record.id;
                        
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
                            'حذف نهائي: ' || deletion_reason,
                            auth.uid()
                        );
                        
                        deleted_count := deleted_count + 1;
                        operation_result := 'deleted';
                        error_message := 'تم الحذف بنجاح';
                    END IF;
                END;
            END IF;
            
            -- إضافة تفاصيل النجاح
            success_details := success_details || json_build_object(
                'account_code', COALESCE(account_record.account_code, 'N/A'),
                'account_name', account_record.account_name,
                'action', operation_result,
                'reason', error_message,
                'is_system', account_record.is_system
            );
            
        EXCEPTION
            WHEN OTHERS THEN
                failed_count := failed_count + 1;
                error_details := error_details || json_build_object(
                    'account_code', COALESCE(account_record.account_code, 'N/A'),
                    'account_name', account_record.account_name,
                    'error', SQLERRM,
                    'is_system', account_record.is_system
                );
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', format('تمت معالجة %s حساب: %s تم حذفها (%s نظامية، %s غير نشطة)، %s تم إلغاء تفعيلها، %s فشل', 
                         total_processed, 
                         (deleted_count + system_deleted_count + inactive_deleted_count), 
                         system_deleted_count,
                         inactive_deleted_count,
                         deactivated_count, 
                         failed_count),
        'deleted_count', deleted_count,
        'system_deleted_count', system_deleted_count,
        'inactive_deleted_count', inactive_deleted_count,
        'deactivated_count', deactivated_count,
        'failed_count', failed_count,
        'total_processed', total_processed,
        'success_details', success_details,
        'error_details', error_details,
        'operation_duration', EXTRACT(EPOCH FROM (now() - start_time))::text || ' seconds',
        'settings_used', json_build_object(
            'include_system_accounts', include_system_accounts,
            'include_inactive_accounts', include_inactive_accounts,
            'force_complete_reset', force_complete_reset
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'فشل في عملية الحذف الشاملة',
            'deleted_count', deleted_count,
            'system_deleted_count', system_deleted_count,
            'inactive_deleted_count', inactive_deleted_count,
            'deactivated_count', deactivated_count,
            'failed_count', failed_count,
            'total_processed', total_processed,
            'success_details', success_details,
            'error_details', error_details,
            'operation_duration', EXTRACT(EPOCH FROM (now() - start_time))::text || ' seconds'
        );
END;
$function$;