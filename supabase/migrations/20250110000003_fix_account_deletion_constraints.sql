-- إصلاح القيود الخارجية التي تمنع حذف الحسابات
-- حل مشكلة فشل حذف 11 حساب من أصل 14

-- دالة تشخيص أسباب فشل حذف الحسابات
CREATE OR REPLACE FUNCTION public.diagnose_account_deletion_failures(target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_rec record;
    constraint_violations jsonb := '[]'::jsonb;
    total_issues integer := 0;
    constraint_info jsonb;
    violation_count integer;
BEGIN
    -- فحص كل حساب والقيود التي تمنع حذفه
    FOR account_rec IN (
        SELECT id, account_code, account_name, is_system
        FROM public.chart_of_accounts
        WHERE company_id = target_company_id
        ORDER BY account_code
    ) LOOP
        -- فحص vendor_accounts
        BEGIN
            SELECT COUNT(*) INTO violation_count
            FROM public.vendor_accounts
            WHERE account_id = account_rec.id;
            
            IF violation_count > 0 THEN
                constraint_info := jsonb_build_object(
                    'account_code', account_rec.account_code,
                    'account_name', account_rec.account_name,
                    'constraint_table', 'vendor_accounts',
                    'violation_count', violation_count,
                    'constraint_type', 'foreign_key',
                    'solution', 'حذف مراجع vendor_accounts أولاً'
                );
                constraint_violations := constraint_violations || constraint_info;
                total_issues := total_issues + 1;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- تجاهل إذا كان الجدول غير موجود
                NULL;
        END;
        
        -- فحص customer_accounts
        BEGIN
            SELECT COUNT(*) INTO violation_count
            FROM public.customer_accounts
            WHERE account_id = account_rec.id;
            
            IF violation_count > 0 THEN
                constraint_info := jsonb_build_object(
                    'account_code', account_rec.account_code,
                    'account_name', account_rec.account_name,
                    'constraint_table', 'customer_accounts',
                    'violation_count', violation_count,
                    'constraint_type', 'foreign_key',
                    'solution', 'حذف مراجع customer_accounts أولاً'
                );
                constraint_violations := constraint_violations || constraint_info;
                total_issues := total_issues + 1;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
        
        -- فحص account_mappings
        BEGIN
            SELECT COUNT(*) INTO violation_count
            FROM public.account_mappings
            WHERE chart_of_accounts_id = account_rec.id;
            
            IF violation_count > 0 THEN
                constraint_info := jsonb_build_object(
                    'account_code', account_rec.account_code,
                    'account_name', account_rec.account_name,
                    'constraint_table', 'account_mappings',
                    'violation_count', violation_count,
                    'constraint_type', 'foreign_key',
                    'solution', 'حذف مراجع account_mappings أولاً'
                );
                constraint_violations := constraint_violations || constraint_info;
                total_issues := total_issues + 1;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
        
        -- فحص essential_account_mappings
        BEGIN
            SELECT COUNT(*) INTO violation_count
            FROM public.essential_account_mappings
            WHERE account_id = account_rec.id;
            
            IF violation_count > 0 THEN
                constraint_info := jsonb_build_object(
                    'account_code', account_rec.account_code,
                    'account_name', account_rec.account_name,
                    'constraint_table', 'essential_account_mappings',
                    'violation_count', violation_count,
                    'constraint_type', 'foreign_key',
                    'solution', 'حذف مراجع essential_account_mappings أولاً'
                );
                constraint_violations := constraint_violations || constraint_info;
                total_issues := total_issues + 1;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
        
        -- فحص maintenance_account_mappings
        BEGIN
            SELECT COUNT(*) INTO violation_count
            FROM public.maintenance_account_mappings
            WHERE expense_account_id = account_rec.id OR asset_account_id = account_rec.id;
            
            IF violation_count > 0 THEN
                constraint_info := jsonb_build_object(
                    'account_code', account_rec.account_code,
                    'account_name', account_rec.account_name,
                    'constraint_table', 'maintenance_account_mappings',
                    'violation_count', violation_count,
                    'constraint_type', 'foreign_key',
                    'solution', 'حذف مراجع maintenance_account_mappings أولاً'
                );
                constraint_violations := constraint_violations || constraint_info;
                total_issues := total_issues + 1;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_issues', total_issues,
        'constraint_violations', constraint_violations,
        'analysis_summary', jsonb_build_object(
            'vendor_account_issues', (
                SELECT COUNT(*) FROM jsonb_array_elements(constraint_violations) 
                WHERE value->>'constraint_table' = 'vendor_accounts'
            ),
            'customer_account_issues', (
                SELECT COUNT(*) FROM jsonb_array_elements(constraint_violations) 
                WHERE value->>'constraint_table' = 'customer_accounts'
            ),
            'mapping_issues', (
                SELECT COUNT(*) FROM jsonb_array_elements(constraint_violations) 
                WHERE value->>'constraint_table' IN ('account_mappings', 'essential_account_mappings')
            ),
            'maintenance_issues', (
                SELECT COUNT(*) FROM jsonb_array_elements(constraint_violations) 
                WHERE value->>'constraint_table' = 'maintenance_account_mappings'
            )
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في تشخيص أسباب الفشل: ' || SQLERRM
        );
END;
$$;

-- دالة تنظيف شاملة لجميع المراجع المعلقة
CREATE OR REPLACE FUNCTION public.cleanup_all_account_references(target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    cleanup_results jsonb := '{}'::jsonb;
    total_cleaned integer := 0;
    temp_count integer;
BEGIN
    -- 1. تنظيف vendor_accounts
    BEGIN
        DELETE FROM public.vendor_accounts 
        WHERE account_id IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id
        );
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        cleanup_results := cleanup_results || jsonb_build_object('vendor_accounts_cleaned', temp_count);
        total_cleaned := total_cleaned + temp_count;
    EXCEPTION
        WHEN OTHERS THEN
            cleanup_results := cleanup_results || jsonb_build_object('vendor_accounts_error', SQLERRM);
    END;
    
    -- 2. تنظيف customer_accounts
    BEGIN
        DELETE FROM public.customer_accounts 
        WHERE account_id IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id
        );
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        cleanup_results := cleanup_results || jsonb_build_object('customer_accounts_cleaned', temp_count);
        total_cleaned := total_cleaned + temp_count;
    EXCEPTION
        WHEN OTHERS THEN
            cleanup_results := cleanup_results || jsonb_build_object('customer_accounts_error', SQLERRM);
    END;
    
    -- 3. تنظيف account_mappings
    BEGIN
        DELETE FROM public.account_mappings 
        WHERE chart_of_accounts_id IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id
        );
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        cleanup_results := cleanup_results || jsonb_build_object('account_mappings_cleaned', temp_count);
        total_cleaned := total_cleaned + temp_count;
    EXCEPTION
        WHEN OTHERS THEN
            cleanup_results := cleanup_results || jsonb_build_object('account_mappings_error', SQLERRM);
    END;
    
    -- 4. تنظيف essential_account_mappings
    BEGIN
        DELETE FROM public.essential_account_mappings 
        WHERE account_id IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id
        );
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        cleanup_results := cleanup_results || jsonb_build_object('essential_mappings_cleaned', temp_count);
        total_cleaned := total_cleaned + temp_count;
    EXCEPTION
        WHEN OTHERS THEN
            cleanup_results := cleanup_results || jsonb_build_object('essential_mappings_error', SQLERRM);
    END;
    
    -- 5. تنظيف maintenance_account_mappings
    BEGIN
        DELETE FROM public.maintenance_account_mappings 
        WHERE expense_account_id IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id
        ) OR asset_account_id IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id
        );
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        cleanup_results := cleanup_results || jsonb_build_object('maintenance_mappings_cleaned', temp_count);
        total_cleaned := total_cleaned + temp_count;
    EXCEPTION
        WHEN OTHERS THEN
            cleanup_results := cleanup_results || jsonb_build_object('maintenance_mappings_error', SQLERRM);
    END;
    
    -- 6. تنظيف fixed_assets references
    BEGIN
        UPDATE public.fixed_assets 
        SET depreciation_account_id = NULL,
            accumulated_depreciation_account_id = NULL,
            disposal_account_id = NULL
        WHERE company_id = target_company_id
        AND (
            depreciation_account_id IN (SELECT id FROM public.chart_of_accounts WHERE company_id = target_company_id)
            OR accumulated_depreciation_account_id IN (SELECT id FROM public.chart_of_accounts WHERE company_id = target_company_id)
            OR disposal_account_id IN (SELECT id FROM public.chart_of_accounts WHERE company_id = target_company_id)
        );
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        cleanup_results := cleanup_results || jsonb_build_object('fixed_assets_cleaned', temp_count);
        total_cleaned := total_cleaned + temp_count;
    EXCEPTION
        WHEN OTHERS THEN
            cleanup_results := cleanup_results || jsonb_build_object('fixed_assets_error', SQLERRM);
    END;
    
    -- 7. تنظيف journal_entry_lines (حذف القيود المحاسبية)
    BEGIN
        DELETE FROM public.journal_entry_lines 
        WHERE account_id IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id
        );
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        cleanup_results := cleanup_results || jsonb_build_object('journal_entries_cleaned', temp_count);
        total_cleaned := total_cleaned + temp_count;
    EXCEPTION
        WHEN OTHERS THEN
            cleanup_results := cleanup_results || jsonb_build_object('journal_entries_error', SQLERRM);
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('تم تنظيف %s مرجع من %s جدول', total_cleaned, 7),
        'total_cleaned', total_cleaned,
        'cleanup_details', cleanup_results
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في تنظيف المراجع: ' || SQLERRM
        );
END;
$$;

-- دالة حذف جميع الحسابات محسنة مع تنظيف شامل
CREATE OR REPLACE FUNCTION public.force_delete_all_accounts(
    target_company_id uuid,
    include_system_accounts boolean DEFAULT false,
    cleanup_first boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    cleanup_result jsonb;
    deleted_count integer := 0;
    deactivated_count integer := 0;
    failed_count integer := 0;
    account_rec record;
    operation_start timestamp := now();
BEGIN
    -- التحقق من صحة المعاملات
    IF target_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف الشركة مطلوب'
        );
    END IF;
    
    -- تنظيف المراجع أولاً إذا طُلب ذلك
    IF cleanup_first THEN
        SELECT * INTO cleanup_result
        FROM public.cleanup_all_account_references(target_company_id);
        
        IF NOT (cleanup_result->>'success')::boolean THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'فشل في تنظيف المراجع: ' || (cleanup_result->>'error')
            );
        END IF;
    END IF;
    
    -- حذف الحسابات واحد تلو الآخر
    FOR account_rec IN (
        SELECT id, account_code, account_name, is_system
        FROM public.chart_of_accounts
        WHERE company_id = target_company_id
        ORDER BY is_system ASC, account_code ASC -- الحسابات العادية أولاً
    ) LOOP
        BEGIN
            IF account_rec.is_system AND NOT include_system_accounts THEN
                -- إلغاء تفعيل الحسابات النظامية
                UPDATE public.chart_of_accounts 
                SET is_active = false, updated_at = now()
                WHERE id = account_rec.id;
                deactivated_count := deactivated_count + 1;
            ELSE
                -- محاولة حذف الحساب
                DELETE FROM public.chart_of_accounts WHERE id = account_rec.id;
                deleted_count := deleted_count + 1;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- في حالة الفشل، محاولة إلغاء التفعيل
                BEGIN
                    UPDATE public.chart_of_accounts 
                    SET is_active = false, updated_at = now()
                    WHERE id = account_rec.id;
                    deactivated_count := deactivated_count + 1;
                EXCEPTION
                    WHEN OTHERS THEN
                        failed_count := failed_count + 1;
                END;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('تمت معالجة الحسابات: %s تم حذفها، %s تم إلغاء تفعيلها، %s فشل', 
                         deleted_count, deactivated_count, failed_count),
        'deleted_count', deleted_count,
        'deactivated_count', deactivated_count,
        'failed_count', failed_count,
        'total_processed', deleted_count + deactivated_count + failed_count,
        'cleanup_result', cleanup_result,
        'operation_duration', extract(epoch from (now() - operation_start)) || ' seconds'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في حذف جميع الحسابات: ' || SQLERRM
        );
END;
$$;
