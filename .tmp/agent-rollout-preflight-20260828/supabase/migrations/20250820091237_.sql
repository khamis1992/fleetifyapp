-- تحديث دالة حذف جميع حسابات الشركة مع معالجة شاملة للقيود الخارجية
CREATE OR REPLACE FUNCTION public.bulk_delete_company_accounts(
    target_company_id uuid,
    include_system_accounts boolean DEFAULT false,
    deletion_reason text DEFAULT 'Bulk deletion operation'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_record RECORD;
    cleanup_count INTEGER := 0;
    deleted_count INTEGER := 0;
    deactivated_count INTEGER := 0;
    failed_count INTEGER := 0;
    error_count INTEGER := 0;
    success_details jsonb := '[]'::jsonb;
    error_details jsonb := '[]'::jsonb;
    start_time timestamp := now();
    current_error text;
BEGIN
    -- التحقق من صحة معرف الشركة
    IF target_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف الشركة مطلوب'
        );
    END IF;

    -- التحقق من وجود الشركة
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = target_company_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الشركة غير موجودة'
        );
    END IF;

    RAISE NOTICE '🚀 [BULK_DELETE] بدء عملية الحذف الشامل للشركة: %', target_company_id;

    -- حذف الحسابات بترتيب المستوى (من الأعمق للأضحل)
    FOR account_record IN 
        SELECT id, account_code, account_name, account_level, is_system, current_balance
        FROM chart_of_accounts 
        WHERE company_id = target_company_id 
        AND is_active = true
        AND (include_system_accounts = true OR is_system = false)
        ORDER BY account_level DESC, account_code
    LOOP
        BEGIN
            RAISE NOTICE '🔄 [BULK_DELETE] معالجة الحساب: % - %', account_record.account_code, account_record.account_name;
            
            -- 1. تنظيف المراجع في جدول الأصول الثابتة
            UPDATE fixed_assets 
            SET asset_account_id = NULL,
                depreciation_account_id = NULL,
                accumulated_depreciation_account_id = NULL
            WHERE (asset_account_id = account_record.id 
                  OR depreciation_account_id = account_record.id 
                  OR accumulated_depreciation_account_id = account_record.id)
            AND company_id = target_company_id;
            
            GET DIAGNOSTICS cleanup_count = ROW_COUNT;
            IF cleanup_count > 0 THEN
                RAISE NOTICE '🧹 تنظيف % مرجع في جدول الأصول الثابتة', cleanup_count;
            END IF;

            -- 2. تنظيف المراجع في جدول عناصر الميزانية
            DELETE FROM budget_items 
            WHERE account_id = account_record.id
            AND budget_id IN (SELECT id FROM budgets WHERE company_id = target_company_id);
            
            GET DIAGNOSTICS cleanup_count = ROW_COUNT;
            IF cleanup_count > 0 THEN
                RAISE NOTICE '🧹 حذف % عنصر ميزانية مرتبط', cleanup_count;
            END IF;

            -- 3. تنظيف المراجع في جداول القضايا القانونية
            UPDATE legal_case_account_mappings 
            SET legal_fees_revenue_account_id = NULL,
                consultation_revenue_account_id = NULL,
                legal_fees_receivable_account_id = NULL,
                court_fees_expense_account_id = NULL,
                legal_expenses_account_id = NULL,
                expert_witness_expense_account_id = NULL,
                legal_research_expense_account_id = NULL,
                settlements_expense_account_id = NULL,
                settlements_payable_account_id = NULL,
                client_retainer_liability_account_id = NULL
            WHERE (legal_fees_revenue_account_id = account_record.id 
                  OR consultation_revenue_account_id = account_record.id 
                  OR legal_fees_receivable_account_id = account_record.id 
                  OR court_fees_expense_account_id = account_record.id 
                  OR legal_expenses_account_id = account_record.id 
                  OR expert_witness_expense_account_id = account_record.id 
                  OR legal_research_expense_account_id = account_record.id 
                  OR settlements_expense_account_id = account_record.id 
                  OR settlements_payable_account_id = account_record.id 
                  OR client_retainer_liability_account_id = account_record.id)
            AND company_id = target_company_id;

            -- 4. تنظيف المراجع في جدول العملاء
            UPDATE customers 
            SET account_id = NULL
            WHERE account_id = account_record.id 
            AND company_id = target_company_id;

            -- 5. تنظيف المراجع في جدول العقود  
            UPDATE contracts 
            SET account_id = NULL
            WHERE account_id = account_record.id 
            AND company_id = target_company_id;

            -- 6. تنظيف المراجع في جدول الفواتير
            UPDATE invoices 
            SET account_id = NULL
            WHERE account_id = account_record.id 
            AND company_id = target_company_id;

            -- 7. تنظيف المراجع في جدول المدفوعات
            UPDATE payments 
            SET account_id = NULL
            WHERE account_id = account_record.id 
            AND company_id = target_company_id;

            -- 8. فحص وجود قيود يومية
            IF EXISTS (
                SELECT 1 FROM journal_entry_lines 
                WHERE account_id = account_record.id
                AND journal_entry_id IN (
                    SELECT id FROM journal_entries WHERE company_id = target_company_id
                )
                LIMIT 1
            ) THEN
                -- إلغاء تفعيل الحساب بدلاً من حذفه إذا كان له قيود يومية
                UPDATE chart_of_accounts 
                SET is_active = false,
                    account_name = account_name || ' (DEACTIVATED)',
                    updated_at = now()
                WHERE id = account_record.id;
                
                deactivated_count := deactivated_count + 1;
                
                success_details := success_details || jsonb_build_object(
                    'account_code', account_record.account_code,
                    'account_name', account_record.account_name,
                    'action', 'deactivated',
                    'reason', 'يحتوي على قيود يومية'
                );
                
                RAISE NOTICE '⚠️ تم إلغاء تفعيل الحساب: % (يحتوي على قيود يومية)', account_record.account_code;
            ELSE
                -- محاولة حذف الحساب
                DELETE FROM chart_of_accounts WHERE id = account_record.id;
                deleted_count := deleted_count + 1;
                
                success_details := success_details || jsonb_build_object(
                    'account_code', account_record.account_code,
                    'account_name', account_record.account_name,
                    'action', 'deleted',
                    'reason', 'تم الحذف بنجاح'
                );
                
                -- تسجيل في سجل الحذف
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
                    'bulk_delete',
                    deletion_reason,
                    auth.uid()
                );
                
                RAISE NOTICE '✅ تم حذف الحساب: %', account_record.account_code;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            failed_count := failed_count + 1;
            current_error := SQLERRM;
            
            error_details := error_details || jsonb_build_object(
                'account_code', account_record.account_code,
                'account_name', account_record.account_name,
                'error', current_error
            );
            
            RAISE NOTICE '❌ فشل في معالجة الحساب %: %', account_record.account_code, current_error;
            
        END;
    END LOOP;

    RAISE NOTICE '🏁 [BULK_DELETE] انتهت العملية: % محذوف، % معطل، % فشل', deleted_count, deactivated_count, failed_count;

    -- إرجاع النتائج
    RETURN jsonb_build_object(
        'success', true,
        'message', format('تمت معالجة الحسابات: %s تم حذفها، %s تم إلغاء تفعيلها، %s فشل', 
                         deleted_count, deactivated_count, failed_count),
        'deleted_count', deleted_count,
        'deactivated_count', deactivated_count,
        'failed_count', failed_count,
        'total_processed', deleted_count + deactivated_count + failed_count,
        'success_details', success_details,
        'error_details', error_details,
        'operation_duration', (extract(epoch from (now() - start_time)) || ' seconds')
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '💥 [BULK_DELETE] خطأ عام في العملية: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في عملية الحذف الشامل: ' || SQLERRM,
        'deleted_count', deleted_count,
        'deactivated_count', deactivated_count,
        'failed_count', failed_count,
        'operation_duration', (extract(epoch from (now() - start_time)) || ' seconds')
    );
END;
$function$;;
