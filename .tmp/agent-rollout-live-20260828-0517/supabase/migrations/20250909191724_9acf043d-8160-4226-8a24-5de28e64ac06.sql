-- المرحلة الثانية: إصلاح باقي الدوال بـ search_path
-- إضافة SET search_path TO 'public' للدوال المتبقية

-- تحديث الدوال الموجودة مع إضافة search_path
CREATE OR REPLACE FUNCTION public.analyze_account_deletion_enhanced(account_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_info RECORD;
    child_count INTEGER;
    journal_entries_count INTEGER;
    contracts_count INTEGER;
    invoices_count INTEGER;
    payments_count INTEGER;
    customers_count INTEGER;
    vehicles_count INTEGER;
    legal_cases_count INTEGER;
    budget_items_count INTEGER;
    bank_transactions_count INTEGER;
    can_delete BOOLEAN := true;
    blocking_reasons TEXT[] := ARRAY[]::TEXT[];
    warnings TEXT[] := ARRAY[]::TEXT[];
    suggestions TEXT[] := ARRAY[]::TEXT[];
    table_counts JSONB;
BEGIN
    -- Get account information
    SELECT * INTO account_info
    FROM chart_of_accounts
    WHERE id = account_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'can_delete', false,
            'account_info', null,
            'blocking_reasons', ARRAY['الحساب غير موجود'],
            'warnings', ARRAY[]::TEXT[],
            'suggestions', ARRAY[]::TEXT[],
            'affected_data', jsonb_build_object()
        );
    END IF;
    
    -- Count child accounts
    SELECT COUNT(*) INTO child_count
    FROM chart_of_accounts 
    WHERE parent_account_id = account_id_param AND is_active = true;
    
    -- Count journal entries
    SELECT COUNT(*) INTO journal_entries_count
    FROM journal_entry_lines 
    WHERE account_id = account_id_param;
    
    -- Count contracts  
    SELECT COUNT(*) INTO contracts_count
    FROM contracts 
    WHERE account_id = account_id_param;
    
    -- Count invoices
    SELECT COUNT(*) INTO invoices_count
    FROM invoices 
    WHERE account_id = account_id_param;
    
    -- Count payments
    SELECT COUNT(*) INTO payments_count
    FROM payments 
    WHERE account_id = account_id_param;
    
    -- Count customers
    SELECT COUNT(*) INTO customers_count
    FROM customers 
    WHERE account_id = account_id_param;
    
    -- Count vehicles
    SELECT COUNT(*) INTO vehicles_count
    FROM vehicles 
    WHERE account_id = account_id_param;
    
    -- Count legal cases
    SELECT COUNT(*) INTO legal_cases_count
    FROM legal_cases 
    WHERE account_id = account_id_param;
    
    -- Count budget items
    SELECT COUNT(*) INTO budget_items_count
    FROM budget_items 
    WHERE account_id = account_id_param;
    
    -- Count bank transactions (both debit and credit account references)
    SELECT COUNT(*) INTO bank_transactions_count
    FROM bank_transactions bt
    JOIN journal_entries je ON bt.journal_entry_id = je.id
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    WHERE jel.account_id = account_id_param;
    
    -- Build table counts JSONB object
    table_counts := jsonb_build_object(
        'child_accounts', child_count,
        'journal_entries', journal_entries_count,
        'contracts', contracts_count,
        'invoices', invoices_count,
        'payments', payments_count,
        'customers', customers_count,
        'vehicles', vehicles_count,
        'legal_cases', legal_cases_count,
        'budget_items', budget_items_count,
        'bank_transactions', bank_transactions_count
    );
    
    -- Check for blocking conditions
    IF child_count > 0 THEN
        can_delete := false;
        blocking_reasons := array_append(blocking_reasons, 'يحتوي على حسابات فرعية (' || child_count || ' حساب)');
        suggestions := array_append(suggestions, 'قم بحذف أو نقل الحسابات الفرعية أولاً');
    END IF;
    
    IF journal_entries_count > 0 THEN
        can_delete := false;
        blocking_reasons := array_append(blocking_reasons, 'يحتوي على قيود محاسبية (' || journal_entries_count || ' قيد)');
        suggestions := array_append(suggestions, 'لا يمكن حذف حساب له قيود محاسبية. فكر في إلغاء تنشيط الحساب بدلاً من الحذف');
    END IF;
    
    -- Check for data that can be transferred
    IF contracts_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بعقود (' || contracts_count || ' عقد)');
        suggestions := array_append(suggestions, 'يمكن نقل العقود إلى حساب آخر');
    END IF;
    
    IF invoices_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بفواتير (' || invoices_count || ' فاتورة)');
        suggestions := array_append(suggestions, 'يمكن نقل الفواتير إلى حساب آخر');
    END IF;
    
    IF payments_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بدفعات (' || payments_count || ' دفعة)');
        suggestions := array_append(suggestions, 'يمكن نقل الدفعات إلى حساب آخر');
    END IF;
    
    IF customers_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بعملاء (' || customers_count || ' عميل)');
        suggestions := array_append(suggestions, 'يمكن نقل العملاء إلى حساب آخر أو إزالة الربط');
    END IF;
    
    IF vehicles_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بمركبات (' || vehicles_count || ' مركبة)');
        suggestions := array_append(suggestions, 'يمكن نقل المركبات إلى حساب آخر أو إزالة الربط');
    END IF;
    
    IF legal_cases_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بقضايا قانونية (' || legal_cases_count || ' قضية)');
        suggestions := array_append(suggestions, 'يمكن نقل القضايا القانونية إلى حساب آخر');
    END IF;
    
    IF budget_items_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط ببنود الموازنة (' || budget_items_count || ' بند)');
        suggestions := array_append(suggestions, 'يمكن نقل بنود الموازنة إلى حساب آخر');
    END IF;
    
    IF bank_transactions_count > 0 THEN
        warnings := array_append(warnings, 'مرتبط بحركات بنكية (' || bank_transactions_count || ' حركة)');
        suggestions := array_append(suggestions, 'الحركات البنكية مرتبطة عبر القيود المحاسبية');
    END IF;
    
    -- Check if account is a system account
    IF account_info.is_system THEN
        can_delete := false;
        blocking_reasons := array_append(blocking_reasons, 'هذا حساب نظام ولا يمكن حذفه');
    END IF;
    
    -- Return comprehensive analysis
    RETURN jsonb_build_object(
        'can_delete', can_delete,
        'account_info', row_to_json(account_info),
        'blocking_reasons', blocking_reasons,
        'warnings', warnings,
        'suggestions', suggestions,
        'affected_data', table_counts
    );
END;
$function$;
CREATE OR REPLACE FUNCTION public.bulk_delete_company_accounts(target_company_id uuid, include_system_accounts boolean DEFAULT false, deletion_reason text DEFAULT 'Bulk deletion operation'::text)
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
$function$;
CREATE OR REPLACE FUNCTION public.calculate_smart_late_fee(p_days_overdue integer, p_daily_rate numeric DEFAULT 120.000, p_monthly_cap numeric DEFAULT 3000.000)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_months_overdue INTEGER;
    v_final_amount DECIMAL := 0;
    v_breakdown JSONB := '{}';
    v_cap_applied BOOLEAN := FALSE;
    v_month INTEGER;
    v_days_in_month INTEGER;
    v_monthly_fine DECIMAL;
BEGIN
    v_months_overdue := CEIL(p_days_overdue::DECIMAL / 30);
    
    FOR v_month IN 1..v_months_overdue LOOP
        v_days_in_month := LEAST(30, p_days_overdue - ((v_month - 1) * 30));
        v_monthly_fine := v_days_in_month * p_daily_rate;
        
        IF v_monthly_fine > p_monthly_cap THEN
            v_monthly_fine := p_monthly_cap;
            v_cap_applied := TRUE;
        END IF;
        
        v_final_amount := v_final_amount + v_monthly_fine;
        v_breakdown := v_breakdown || jsonb_build_object('month' || v_month, v_monthly_fine);
    END LOOP;
    
    RETURN jsonb_build_object(
        'final_amount', v_final_amount,
        'months_overdue', v_months_overdue,
        'cap_applied', v_cap_applied,
        'breakdown', v_breakdown,
        'daily_rate', p_daily_rate,
        'monthly_cap', p_monthly_cap
    );
END;
$function$;
