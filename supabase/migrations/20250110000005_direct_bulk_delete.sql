-- دالة حذف جميع الحسابات مباشرة وبسيطة
-- حل مشكلة عدم عمل زر "حذف جميع الحسابات"

-- دالة مبسطة جداً لحذف جميع الحسابات
CREATE OR REPLACE FUNCTION public.direct_delete_all_accounts(
    target_company_id uuid,
    include_system_accounts boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_rec record;
    deleted_count integer := 0;
    deactivated_count integer := 0;
    failed_count integer := 0;
    total_processed integer := 0;
    error_messages text[] := '{}';
BEGIN
    -- التحقق من صحة المعاملات
    IF target_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف الشركة مطلوب'
        );
    END IF;
    
    -- حذف/إلغاء تفعيل كل حساب
    FOR account_rec IN (
        SELECT id, account_code, account_name, is_system
        FROM public.chart_of_accounts
        WHERE company_id = target_company_id
        ORDER BY is_system ASC, account_code ASC
    ) LOOP
        BEGIN
            total_processed := total_processed + 1;
            
            -- تحديد نوع العملية
            IF account_rec.is_system AND NOT include_system_accounts THEN
                -- إلغاء تفعيل الحسابات النظامية
                UPDATE public.chart_of_accounts 
                SET is_active = false, updated_at = now()
                WHERE id = account_rec.id;
                deactivated_count := deactivated_count + 1;
                
            ELSE
                -- فحص وجود معاملات
                IF EXISTS (SELECT 1 FROM public.journal_entry_lines WHERE account_id = account_rec.id) THEN
                    -- إلغاء تفعيل الحسابات التي لها معاملات
                    UPDATE public.chart_of_accounts 
                    SET is_active = false, updated_at = now()
                    WHERE id = account_rec.id;
                    deactivated_count := deactivated_count + 1;
                ELSE
                    -- حذف الحسابات بدون معاملات
                    
                    -- تنظيف المراجع أولاً
                    BEGIN
                        -- تنظيف العقود
                        UPDATE public.contracts SET account_id = NULL WHERE account_id = account_rec.id;
                    EXCEPTION WHEN OTHERS THEN NULL;
                    END;
                    
                    BEGIN
                        -- تنظيف المدفوعات
                        UPDATE public.payments SET account_id = NULL WHERE account_id = account_rec.id;
                    EXCEPTION WHEN OTHERS THEN NULL;
                    END;
                    
                    BEGIN
                        -- تنظيف الفواتير
                        UPDATE public.invoices SET account_id = NULL WHERE account_id = account_rec.id;
                    EXCEPTION WHEN OTHERS THEN NULL;
                    END;
                    
                    BEGIN
                        -- تنظيف العملاء
                        UPDATE public.customers SET account_id = NULL WHERE account_id = account_rec.id;
                    EXCEPTION WHEN OTHERS THEN NULL;
                    END;
                    
                    BEGIN
                        -- حذف vendor_accounts
                        DELETE FROM public.vendor_accounts WHERE account_id = account_rec.id;
                    EXCEPTION WHEN OTHERS THEN NULL;
                    END;
                    
                    BEGIN
                        -- حذف customer_accounts
                        DELETE FROM public.customer_accounts WHERE account_id = account_rec.id;
                    EXCEPTION WHEN OTHERS THEN NULL;
                    END;
                    
                    BEGIN
                        -- حذف account_mappings
                        DELETE FROM public.account_mappings WHERE chart_of_accounts_id = account_rec.id;
                    EXCEPTION WHEN OTHERS THEN NULL;
                    END;
                    
                    -- إلغاء تفعيل الحسابات الفرعية
                    UPDATE public.chart_of_accounts 
                    SET is_active = false, updated_at = now()
                    WHERE parent_account_id = account_rec.id;
                    
                    -- حذف الحساب
                    DELETE FROM public.chart_of_accounts WHERE id = account_rec.id;
                    deleted_count := deleted_count + 1;
                END IF;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                failed_count := failed_count + 1;
                error_messages := error_messages || (account_rec.account_code || 'Unknown') || ': ' || SQLERRM;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('تمت معالجة %s حساب: %s تم حذفها، %s تم إلغاء تفعيلها، %s فشل', 
                         total_processed, deleted_count, deactivated_count, failed_count),
        'deleted_count', deleted_count,
        'deactivated_count', deactivated_count,
        'failed_count', failed_count,
        'total_processed', total_processed,
        'errors', CASE WHEN array_length(error_messages, 1) > 0 THEN error_messages[1:5] ELSE '{}' END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في حذف جميع الحسابات: ' || SQLERRM
        );
END;
$$;
