-- إنشاء دالة حذف جميع الحسابات بشكل مبسط وفعال
-- حل مشكلة عدم عمل زر "حذف جميع الحسابات"

-- إنشاء دالة معاينة حذف جميع الحسابات
CREATE OR REPLACE FUNCTION public.get_all_accounts_deletion_preview(
    target_company_id uuid,
    force_delete_system boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_accounts integer := 0;
    system_accounts integer := 0;
    regular_accounts integer := 0;
    accounts_with_transactions integer := 0;
    accounts_without_transactions integer := 0;
    sample_accounts jsonb := '[]'::jsonb;
    system_accounts_sample jsonb := '[]'::jsonb;
    account_rec record;
    sample_count integer := 0;
    system_sample_count integer := 0;
BEGIN
    -- عد إجمالي الحسابات
    SELECT COUNT(*) INTO total_accounts
    FROM public.chart_of_accounts
    WHERE company_id = target_company_id;
    
    -- عد الحسابات النظامية
    SELECT COUNT(*) INTO system_accounts
    FROM public.chart_of_accounts
    WHERE company_id = target_company_id AND is_system = true;
    
    -- عد الحسابات العادية
    regular_accounts := total_accounts - system_accounts;
    
    -- عد الحسابات التي لها معاملات
    SELECT COUNT(*) INTO accounts_with_transactions
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = target_company_id
    AND EXISTS (
        SELECT 1 FROM public.journal_entry_lines jel 
        WHERE jel.account_id = coa.id
    );
    
    -- عد الحسابات بدون معاملات
    accounts_without_transactions := total_accounts - accounts_with_transactions;
    
    -- جمع عينة من الحسابات العادية
    FOR account_rec IN (
        SELECT account_code, account_name, is_system,
               CASE 
                   WHEN EXISTS (SELECT 1 FROM public.journal_entry_lines WHERE account_id = chart_of_accounts.id) 
                   THEN 'will_be_deactivated'
                   ELSE 'will_be_deleted'
               END as action
        FROM public.chart_of_accounts
        WHERE company_id = target_company_id 
        AND is_system = false
        ORDER BY account_code
        LIMIT 10
    ) LOOP
        sample_accounts := sample_accounts || jsonb_build_object(
            'account_code', account_rec.account_code,
            'account_name', account_rec.account_name,
            'action', account_rec.action
        );
        sample_count := sample_count + 1;
    END LOOP;
    
    -- جمع عينة من الحسابات النظامية
    FOR account_rec IN (
        SELECT account_code, account_name, is_system,
               CASE 
                   WHEN force_delete_system THEN 'will_be_force_deleted'
                   ELSE 'will_be_deactivated'
               END as action
        FROM public.chart_of_accounts
        WHERE company_id = target_company_id 
        AND is_system = true
        ORDER BY account_code
        LIMIT 5
    ) LOOP
        system_accounts_sample := system_accounts_sample || jsonb_build_object(
            'account_code', account_rec.account_code,
            'account_name', account_rec.account_name,
            'action', account_rec.action
        );
        system_sample_count := system_sample_count + 1;
    END LOOP;
    
    -- إرجاع النتائج
    RETURN jsonb_build_object(
        'success', true,
        'total_accounts', total_accounts,
        'system_accounts', system_accounts,
        'regular_accounts', regular_accounts,
        'accounts_with_transactions', accounts_with_transactions,
        'accounts_without_transactions', accounts_without_transactions,
        'will_be_deleted', CASE 
            WHEN force_delete_system THEN accounts_without_transactions
            ELSE regular_accounts - (accounts_with_transactions - system_accounts)
        END,
        'will_be_deactivated', CASE 
            WHEN force_delete_system THEN accounts_with_transactions
            ELSE accounts_with_transactions + (CASE WHEN force_delete_system THEN 0 ELSE system_accounts END)
        END,
        'sample_accounts', sample_accounts,
        'system_accounts_sample', system_accounts_sample,
        'warning_message', CASE 
            WHEN system_accounts > 0 AND NOT force_delete_system 
            THEN 'الحسابات النظامية سيتم إلغاء تفعيلها فقط لحماية النظام'
            ELSE 'جميع الحسابات ستتم معالجتها حسب حالتها'
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في معاينة الحذف: ' || SQLERRM
        );
END;
$$;

-- إنشاء دالة حذف جميع الحسابات
CREATE OR REPLACE FUNCTION public.bulk_delete_company_accounts(
    target_company_id uuid,
    include_system_accounts boolean DEFAULT false,
    deletion_reason text DEFAULT 'Bulk account deletion'
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
    success_details jsonb := '[]'::jsonb;
    error_details jsonb := '[]'::jsonb;
    total_processed integer := 0;
    operation_start_time timestamp := now();
BEGIN
    -- التحقق من صحة المعاملات
    IF target_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف الشركة مطلوب'
        );
    END IF;
    
    -- التحقق من وجود الشركة
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = target_company_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الشركة غير موجودة'
        );
    END IF;
    
    -- حذف/إلغاء تفعيل الحسابات واحد تلو الآخر
    FOR account_rec IN (
        SELECT id, account_code, account_name, is_system,
               EXISTS (SELECT 1 FROM public.journal_entry_lines WHERE account_id = chart_of_accounts.id) as has_transactions
        FROM public.chart_of_accounts
        WHERE company_id = target_company_id
        ORDER BY is_system ASC, account_code ASC -- الحسابات العادية أولاً
    ) LOOP
        BEGIN
            total_processed := total_processed + 1;
            
            -- تحديد نوع العملية
            IF account_rec.is_system AND NOT include_system_accounts THEN
                -- إلغاء تفعيل الحسابات النظامية إذا لم يتم تحديد الحذف القسري
                UPDATE public.chart_of_accounts 
                SET is_active = false, updated_at = now()
                WHERE id = account_rec.id;
                
                deactivated_count := deactivated_count + 1;
                success_details := success_details || jsonb_build_object(
                    'account_code', account_rec.account_code,
                    'account_name', account_rec.account_name,
                    'action', 'deactivated',
                    'reason', 'حساب نظامي - تم إلغاء التفعيل'
                );
                
            ELSIF account_rec.has_transactions THEN
                -- إلغاء تفعيل الحسابات التي لها معاملات
                UPDATE public.chart_of_accounts 
                SET is_active = false, updated_at = now()
                WHERE id = account_rec.id;
                
                deactivated_count := deactivated_count + 1;
                success_details := success_details || jsonb_build_object(
                    'account_code', account_rec.account_code,
                    'account_name', account_rec.account_name,
                    'action', 'deactivated',
                    'reason', 'يحتوي على معاملات - تم إلغاء التفعيل'
                );
                
            ELSE
                -- حذف الحسابات التي لا تحتوي على معاملات
                
                -- أولاً: حذف أي مراجع في الجداول الأخرى
                -- إلغاء ربط العقود (إذا كان العمود موجود)
                BEGIN
                    UPDATE public.contracts SET account_id = NULL WHERE account_id = account_rec.id;
                EXCEPTION
                    WHEN OTHERS THEN
                        -- تجاهل الخطأ إذا كان العمود غير موجود
                        NULL;
                END;
                
                -- إلغاء ربط المدفوعات (إذا كان العمود موجود)
                BEGIN
                    UPDATE public.payments SET account_id = NULL WHERE account_id = account_rec.id;
                EXCEPTION
                    WHEN OTHERS THEN
                        -- تجاهل الخطأ إذا كان العمود غير موجود
                        NULL;
                END;
                
                -- إلغاء ربط الفواتير (إذا كان العمود موجود)
                BEGIN
                    UPDATE public.invoices SET account_id = NULL WHERE account_id = account_rec.id;
                EXCEPTION
                    WHEN OTHERS THEN
                        -- تجاهل الخطأ إذا كان العمود غير موجود
                        NULL;
                END;
                
                -- إلغاء ربط العملاء (إذا كان العمود موجود)
                BEGIN
                    UPDATE public.customers SET account_id = NULL WHERE account_id = account_rec.id;
                EXCEPTION
                    WHEN OTHERS THEN
                        -- تجاهل الخطأ إذا كان العمود غير موجود
                        NULL;
                END;
                
                -- ثانياً: حذف الحساب
                DELETE FROM public.chart_of_accounts WHERE id = account_rec.id;
                
                deleted_count := deleted_count + 1;
                success_details := success_details || jsonb_build_object(
                    'account_code', account_rec.account_code,
                    'account_name', account_rec.account_name,
                    'action', 'deleted',
                    'reason', 'لا يحتوي على معاملات - تم الحذف نهائياً'
                );
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                failed_count := failed_count + 1;
                error_details := error_details || jsonb_build_object(
                    'account_code', account_rec.account_code,
                    'account_name', account_rec.account_name,
                    'error', SQLERRM
                );
        END;
    END LOOP;
    
    -- إرجاع النتائج
    RETURN jsonb_build_object(
        'success', true,
        'message', format('تمت معالجة %s حساب: %s تم حذفها، %s تم إلغاء تفعيلها، %s فشل', 
                         total_processed, deleted_count, deactivated_count, failed_count),
        'deleted_count', deleted_count,
        'deactivated_count', deactivated_count,
        'failed_count', failed_count,
        'total_processed', total_processed,
        'success_details', success_details,
        'error_details', error_details,
        'operation_duration', extract(epoch from (now() - operation_start_time)) || ' seconds'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في حذف جميع الحسابات: ' || SQLERRM
        );
END;
$$;

-- دالة مساعدة لتنظيف جميع المراجع المعلقة
CREATE OR REPLACE FUNCTION public.cleanup_all_account_references(target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    cleaned_contracts integer := 0;
    cleaned_payments integer := 0;
    cleaned_invoices integer := 0;
    cleaned_customers integer := 0;
    cleaned_journal_lines integer := 0;
BEGIN
    -- تنظيف المراجع في العقود
    BEGIN
        UPDATE public.contracts 
        SET account_id = NULL 
        WHERE company_id = target_company_id 
        AND account_id IS NOT NULL 
        AND account_id NOT IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id AND is_active = true
        );
        GET DIAGNOSTICS cleaned_contracts = ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            cleaned_contracts := 0;
    END;
    
    -- تنظيف المراجع في المدفوعات
    BEGIN
        UPDATE public.payments 
        SET account_id = NULL 
        WHERE company_id = target_company_id 
        AND account_id IS NOT NULL 
        AND account_id NOT IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id AND is_active = true
        );
        GET DIAGNOSTICS cleaned_payments = ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            cleaned_payments := 0;
    END;
    
    -- تنظيف المراجع في الفواتير
    BEGIN
        UPDATE public.invoices 
        SET account_id = NULL 
        WHERE company_id = target_company_id 
        AND account_id IS NOT NULL 
        AND account_id NOT IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id AND is_active = true
        );
        GET DIAGNOSTICS cleaned_invoices = ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            cleaned_invoices := 0;
    END;
    
    -- تنظيف المراجع في العملاء
    BEGIN
        UPDATE public.customers 
        SET account_id = NULL 
        WHERE company_id = target_company_id 
        AND account_id IS NOT NULL 
        AND account_id NOT IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id AND is_active = true
        );
        GET DIAGNOSTICS cleaned_customers = ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            cleaned_customers := 0;
    END;
    
    -- تنظيف القيود المحاسبية المعلقة
    BEGIN
        DELETE FROM public.journal_entry_lines 
        WHERE account_id NOT IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id AND is_active = true
        );
        GET DIAGNOSTICS cleaned_journal_lines = ROW_COUNT;
    EXCEPTION
        WHEN OTHERS THEN
            cleaned_journal_lines := 0;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم تنظيف جميع المراجع المعلقة',
        'cleaned_records', jsonb_build_object(
            'contracts', cleaned_contracts,
            'payments', cleaned_payments,
            'invoices', cleaned_invoices,
            'customers', cleaned_customers,
            'journal_lines', cleaned_journal_lines
        ),
        'total_cleaned', cleaned_contracts + cleaned_payments + cleaned_invoices + cleaned_customers + cleaned_journal_lines
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في تنظيف المراجع: ' || SQLERRM
        );
END;
$$;
