-- Restores the exact pre-20260714320000 function definitions and execution grants.

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

GRANT EXECUTE ON FUNCTION public.bulk_delete_company_accounts(target_company_id uuid, include_system_accounts boolean, deletion_reason text) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.copy_selected_accounts_to_company(target_company_id uuid, selected_account_codes text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  account_record RECORD;
  new_account_id UUID;
  parent_account_uuid UUID;
BEGIN
  -- التحقق من وجود الشركة
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = target_company_id) THEN
    RAISE EXCEPTION 'الشركة غير موجودة';
  END IF;

  -- نسخ الحسابات المحددة من القالب الافتراضي بترتيب المستويات
  FOR account_record IN 
    SELECT * FROM default_chart_of_accounts 
    WHERE account_code = ANY(selected_account_codes)
    ORDER BY account_level, account_code
  LOOP
    -- التحقق من عدم وجود الحساب مسبقاً
    IF NOT EXISTS (
      SELECT 1 FROM chart_of_accounts 
      WHERE company_id = target_company_id 
      AND account_code = account_record.account_code
    ) THEN
      
      -- البحث عن الحساب الأب إذا كان موجوداً
      parent_account_uuid := NULL;
      IF account_record.parent_account_code IS NOT NULL THEN
        SELECT id INTO parent_account_uuid
        FROM chart_of_accounts 
        WHERE company_id = target_company_id 
        AND account_code = account_record.parent_account_code;
      END IF;
      
      -- إدراج الحساب الجديد
      INSERT INTO chart_of_accounts (
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        account_subtype,
        balance_type,
        account_level,
        is_header,
        is_system,
        description,
        sort_order,
        parent_account_id
      ) VALUES (
        target_company_id,
        account_record.account_code,
        account_record.account_name,
        account_record.account_name_ar,
        account_record.account_type,
        account_record.account_subtype,
        account_record.balance_type,
        account_record.account_level,
        account_record.is_header,
        account_record.is_system,
        account_record.description,
        account_record.sort_order,
        parent_account_uuid
      );
    END IF;
  END LOOP;

END;
$function$;

GRANT EXECUTE ON FUNCTION public.copy_selected_accounts_to_company(target_company_id uuid, selected_account_codes text[]) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.create_customer_with_contract(p_company_id uuid, p_first_name text, p_last_name text, p_monthly_amount numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_customer_id uuid;
  v_contract_number text;
  v_start_date date;
  v_end_date date;
  result json;
BEGIN
  -- Generate unique contract number
  v_contract_number := 'CNT-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 8);
  
  -- Set contract dates
  v_start_date := current_date;
  v_end_date := current_date + interval '1 year';
  
  -- Insert customer and get the ID
  INSERT INTO customers (
    company_id,
    first_name,
    last_name,
    customer_type,
    phone,
    is_active
  ) VALUES (
    p_company_id,
    p_first_name,
    p_last_name,
    'individual',
    '000000000',
    true
  ) RETURNING id INTO v_customer_id;
  
  -- Insert contract
  INSERT INTO contracts (
    customer_id,
    company_id,
    contract_number,
    contract_date,
    start_date,
    end_date,
    contract_type,
    monthly_amount,
    status
  ) VALUES (
    v_customer_id,
    p_company_id,
    v_contract_number,
    v_start_date,
    v_start_date,
    v_end_date,
    'vehicle_rental',
    p_monthly_amount,
    'active'
  );
  
  -- Return result
  result := json_build_object(
    'customer_id', v_customer_id,
    'contract_number', v_contract_number,
    'success', true,
    'message', 'Customer and contract created successfully'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_customer_with_contract(p_company_id uuid, p_first_name text, p_last_name text, p_monthly_amount numeric) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.enhanced_complete_account_deletion(target_company_id uuid, include_system_accounts boolean DEFAULT false, include_inactive_accounts boolean DEFAULT false, force_complete_reset boolean DEFAULT false, deletion_reason text DEFAULT 'Enhanced bulk deletion'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    start_time TIMESTAMP := now();
    account_record RECORD;
    deleted_count INTEGER := 0;
    system_deleted_count INTEGER := 0;
    inactive_deleted_count INTEGER := 0;
    deactivated_count INTEGER := 0;
    failed_count INTEGER := 0;
    total_processed INTEGER := 0;
    success_details JSON[] := '{}';
    error_details JSON[] := '{}';
    operation_result TEXT;
    error_message TEXT;
    cleanup_result JSON;
    has_journal_entries BOOLEAN;
BEGIN
    -- Process each account individually
    FOR account_record IN 
        SELECT id, account_code, account_name, is_system, is_active
        FROM chart_of_accounts
        WHERE company_id = target_company_id 
        AND (is_active = true OR include_inactive_accounts)
        ORDER BY account_level DESC, account_code -- Start with leaf accounts
    LOOP
        total_processed := total_processed + 1;
        operation_result := 'unknown';
        error_message := NULL;
        
        BEGIN
            -- Skip system accounts if not forced
            IF account_record.is_system AND NOT include_system_accounts THEN
                operation_result := 'skipped_system';
                error_message := 'System account - skipped';
                CONTINUE;
            END IF;
            
            -- Check for journal entries
            SELECT EXISTS(
                SELECT 1 FROM journal_entry_lines jel
                JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE jel.account_id = account_record.id
                AND je.status = 'posted'
            ) INTO has_journal_entries;
            
            -- If has journal entries, only deactivate
            IF has_journal_entries AND NOT force_complete_reset THEN
                UPDATE chart_of_accounts 
                SET is_active = false, updated_at = now() 
                WHERE id = account_record.id;
                
                deactivated_count := deactivated_count + 1;
                operation_result := 'deactivated';
                error_message := 'Has journal entries - deactivated';
            ELSE
                -- Clean up all references first
                SELECT * INTO cleanup_result 
                FROM safe_cleanup_account_references(account_record.id);
                
                -- Now delete the account
                DELETE FROM chart_of_accounts WHERE id = account_record.id;
                
                -- Count by type
                IF account_record.is_system THEN
                    system_deleted_count := system_deleted_count + 1;
                ELSIF NOT account_record.is_active THEN
                    inactive_deleted_count := inactive_deleted_count + 1;
                ELSE
                    deleted_count := deleted_count + 1;
                END IF;
                
                operation_result := 'deleted';
                error_message := 'Successfully deleted with cleanup: ' || 
                    COALESCE((cleanup_result->>'cleanup_actions')::text, '[]');
            END IF;
            
            -- Log successful operation
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
                operation_result,
                deletion_reason || ' - ' || error_message,
                auth.uid()
            );
            
            -- Add to success details
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
                error_message := SQLERRM;
                
                error_details := error_details || json_build_object(
                    'account_code', COALESCE(account_record.account_code, 'N/A'),
                    'account_name', account_record.account_name,
                    'error', error_message,
                    'is_system', account_record.is_system
                );
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Processed %s accounts: %s deleted, %s system deleted, %s inactive deleted, %s deactivated, %s failed', 
                         total_processed, deleted_count, system_deleted_count, inactive_deleted_count, deactivated_count, failed_count),
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
            'message', 'Enhanced deletion failed',
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

GRANT EXECUTE ON FUNCTION public.enhanced_complete_account_deletion(target_company_id uuid, include_system_accounts boolean, include_inactive_accounts boolean, force_complete_reset boolean, deletion_reason text) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_enhanced_accounts_deletion_preview(target_company_id uuid, force_delete_system boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION public.get_enhanced_accounts_deletion_preview(target_company_id uuid, force_delete_system boolean) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.process_overdue_invoices()
 RETURNS TABLE(invoice_id uuid, invoice_number text, days_overdue integer, fee_amount numeric, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_invoice RECORD;
    v_days_overdue INTEGER;
    v_fee_amount NUMERIC;
    v_late_fee_id UUID;
    v_existing_fee UUID;
BEGIN
    -- Process all overdue invoices
    FOR v_invoice IN
        SELECT i.* FROM invoices i
        WHERE i.status IN ('sent', 'overdue', 'unpaid')
        AND i.due_date < CURRENT_DATE
        AND (i.payment_status IS NULL OR i.payment_status != 'paid')
    LOOP
        -- Calculate days overdue
        v_days_overdue := CURRENT_DATE - v_invoice.due_date;
        
        -- Check if late fee already exists for today
        SELECT id INTO v_existing_fee
        FROM late_fees
        WHERE invoice_id = v_invoice.id
        AND DATE(created_at) = CURRENT_DATE;
        
        IF v_existing_fee IS NOT NULL THEN
            CONTINUE;
        END IF;
        
        -- Calculate fee amount
        v_fee_amount := calculate_late_fee(v_invoice.id, v_days_overdue);
        
        IF v_fee_amount > 0 THEN
            -- Create late fee record
            INSERT INTO late_fees (
                company_id, invoice_id, contract_id,
                original_amount, days_overdue, fee_amount, fee_type, status
            )
            VALUES (
                v_invoice.company_id, v_invoice.id, v_invoice.contract_id,
                v_invoice.total_amount, v_days_overdue, v_fee_amount,
                COALESCE((SELECT fee_type FROM late_fee_rules WHERE company_id = v_invoice.company_id AND is_active = true LIMIT 1), 'percentage'),
                'pending'
            )
            RETURNING id INTO v_late_fee_id;
            
            -- Update invoice status
            UPDATE invoices SET status = 'overdue' WHERE id = v_invoice.id;
            
            -- Return result
            invoice_id := v_invoice.id;
            invoice_number := v_invoice.invoice_number;
            days_overdue := v_days_overdue;
            fee_amount := v_fee_amount;
            status := 'created';
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.process_overdue_invoices() TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.process_vehicle_depreciation_monthly(company_id_param uuid, depreciation_date_param date DEFAULT CURRENT_DATE)
 RETURNS TABLE(vehicle_id uuid, vehicle_number text, monthly_depreciation numeric, accumulated_depreciation numeric, journal_entry_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    vehicle_record RECORD;
    monthly_depreciation_amount NUMERIC;
    new_accumulated_depreciation NUMERIC;
    depreciation_expense_account_id uuid;
    accumulated_depreciation_account_id uuid;
    journal_entry_id uuid;
    entry_number text;
    entry_count integer;
BEGIN
    -- Get depreciation accounts
    SELECT am.chart_of_accounts_id INTO depreciation_expense_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = 'DEPRECIATION_EXPENSE'
    AND am.is_active = true
    LIMIT 1;
    
    SELECT am.chart_of_accounts_id INTO accumulated_depreciation_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = 'ACCUMULATED_DEPRECIATION'
    AND am.is_active = true
    LIMIT 1;
    
    -- Loop through vehicles
    FOR vehicle_record IN 
        SELECT * FROM public.vehicles 
        WHERE company_id = company_id_param 
        AND is_active = true 
        AND purchase_price > 0
        AND depreciation_rate > 0
    LOOP
        -- Calculate monthly depreciation
        monthly_depreciation_amount := (vehicle_record.purchase_price * vehicle_record.depreciation_rate / 100) / 12;
        new_accumulated_depreciation := COALESCE(vehicle_record.accumulated_depreciation, 0) + monthly_depreciation_amount;
        
        -- Don't depreciate beyond purchase price
        IF new_accumulated_depreciation > vehicle_record.purchase_price THEN
            monthly_depreciation_amount := vehicle_record.purchase_price - COALESCE(vehicle_record.accumulated_depreciation, 0);
            new_accumulated_depreciation := vehicle_record.purchase_price;
        END IF;
        
        -- Skip if no depreciation needed
        IF monthly_depreciation_amount <= 0 THEN
            CONTINUE;
        END IF;
        
        -- Generate entry number
        SELECT COUNT(*) + 1 INTO entry_count
        FROM public.journal_entries
        WHERE company_id = company_id_param
        AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM depreciation_date_param);
        
        entry_number := 'DEP-' || EXTRACT(YEAR FROM depreciation_date_param) || '-' || LPAD(entry_count::text, 4, '0');
        
        -- Create journal entry
        INSERT INTO public.journal_entries (
            company_id,
            entry_number,
            entry_date,
            description,
            total_amount,
            status,
            entry_type
        ) VALUES (
            company_id_param,
            entry_number,
            depreciation_date_param,
            'Monthly Vehicle Depreciation - ' || vehicle_record.vehicle_number,
            monthly_depreciation_amount,
            'posted',
            'depreciation'
        ) RETURNING id INTO journal_entry_id;
        
        -- Create journal entry lines
        IF depreciation_expense_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                journal_entry_id,
                account_id,
                description,
                debit_amount,
                credit_amount
            ) VALUES (
                journal_entry_id,
                depreciation_expense_account_id,
                'Depreciation Expense - ' || vehicle_record.vehicle_number,
                monthly_depreciation_amount,
                0
            );
        END IF;
        
        IF accumulated_depreciation_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                journal_entry_id,
                account_id,
                description,
                debit_amount,
                credit_amount
            ) VALUES (
                journal_entry_id,
                accumulated_depreciation_account_id,
                'Accumulated Depreciation - ' || vehicle_record.vehicle_number,
                0,
                monthly_depreciation_amount
            );
        END IF;
        
        -- Update vehicle depreciation
        UPDATE public.vehicles
        SET 
            accumulated_depreciation = new_accumulated_depreciation,
            updated_at = now()
        WHERE id = vehicle_record.id;
        
        -- Return results
        RETURN QUERY SELECT 
            vehicle_record.id,
            vehicle_record.vehicle_number,
            monthly_depreciation_amount,
            new_accumulated_depreciation,
            journal_entry_id;
    END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.process_vehicle_depreciation_monthly(company_id_param uuid, depreciation_date_param date) TO PUBLIC,anon,authenticated,service_role;

DROP FUNCTION IF EXISTS public.safe_delete_company_accounts_v2(uuid,boolean,boolean,boolean,text);
DROP FUNCTION IF EXISTS public.account_has_references_v1(uuid);
DROP FUNCTION IF EXISTS public.jsonb_number_v1(jsonb,text,numeric);
