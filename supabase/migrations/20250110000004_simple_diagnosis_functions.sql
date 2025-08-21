-- دوال تشخيص مبسطة تعمل فوراً
-- حل مشكلة "خطأ في تشخيص الحسابات: فشل التشخيص"

-- دالة تشخيص مبسطة وآمنة
CREATE OR REPLACE FUNCTION public.simple_account_diagnosis(target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_accounts integer := 0;
    system_accounts integer := 0;
    accounts_with_transactions integer := 0;
    accounts_with_children integer := 0;
    problematic_accounts jsonb := '[]'::jsonb;
    account_rec record;
    problem_count integer := 0;
BEGIN
    -- التحقق من صحة المعاملات
    IF target_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف الشركة مطلوب'
        );
    END IF;
    
    -- عد إجمالي الحسابات
    SELECT COUNT(*) INTO total_accounts
    FROM public.chart_of_accounts
    WHERE company_id = target_company_id;
    
    -- عد الحسابات النظامية
    SELECT COUNT(*) INTO system_accounts
    FROM public.chart_of_accounts
    WHERE company_id = target_company_id AND is_system = true;
    
    -- عد الحسابات التي لها معاملات
    SELECT COUNT(DISTINCT coa.id) INTO accounts_with_transactions
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = target_company_id
    AND EXISTS (
        SELECT 1 FROM public.journal_entry_lines jel 
        WHERE jel.account_id = coa.id
    );
    
    -- عد الحسابات التي لها حسابات فرعية
    SELECT COUNT(DISTINCT parent.id) INTO accounts_with_children
    FROM public.chart_of_accounts parent
    WHERE parent.company_id = target_company_id
    AND EXISTS (
        SELECT 1 FROM public.chart_of_accounts child 
        WHERE child.parent_account_id = parent.id AND child.is_active = true
    );
    
    -- فحص الحسابات المشكلة (عينة من 10)
    FOR account_rec IN (
        SELECT id, account_code, account_name, is_system,
               EXISTS (SELECT 1 FROM public.journal_entry_lines WHERE account_id = chart_of_accounts.id) as has_transactions,
               EXISTS (SELECT 1 FROM public.chart_of_accounts child WHERE child.parent_account_id = chart_of_accounts.id AND child.is_active = true) as has_children
        FROM public.chart_of_accounts
        WHERE company_id = target_company_id
        AND (
            is_system = true 
            OR EXISTS (SELECT 1 FROM public.journal_entry_lines WHERE account_id = chart_of_accounts.id)
            OR EXISTS (SELECT 1 FROM public.chart_of_accounts child WHERE child.parent_account_id = chart_of_accounts.id AND child.is_active = true)
        )
        ORDER BY is_system DESC, account_code
        LIMIT 10
    ) LOOP
        problematic_accounts := problematic_accounts || jsonb_build_object(
            'account_code', account_rec.account_code,
            'account_name', account_rec.account_name,
            'is_system', account_rec.is_system,
            'has_transactions', account_rec.has_transactions,
            'has_children', account_rec.has_children,
            'deletion_strategy', CASE 
                WHEN account_rec.is_system THEN 'deactivate_only'
                WHEN account_rec.has_transactions OR account_rec.has_children THEN 'deactivate_or_transfer'
                ELSE 'safe_to_delete'
            END
        );
        problem_count := problem_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_accounts', total_accounts,
        'system_accounts', system_accounts,
        'accounts_with_transactions', accounts_with_transactions,
        'accounts_with_children', accounts_with_children,
        'safe_to_delete', total_accounts - system_accounts - accounts_with_transactions - accounts_with_children,
        'problematic_accounts', problematic_accounts,
        'analysis_summary', jsonb_build_object(
            'system_account_issues', system_accounts,
            'transaction_issues', accounts_with_transactions,
            'child_account_issues', accounts_with_children,
            'total_issues', system_accounts + accounts_with_transactions + accounts_with_children
        ),
        'recommendations', jsonb_build_array(
            'استخدم "تنظيف المراجع المعلقة" أولاً',
            'الحسابات النظامية ستُلغى تفعيلها فقط',
            'الحسابات التي لها معاملات ستُلغى تفعيلها أو تنقل',
            'الحسابات الفارغة ستُحذف نهائياً'
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في التشخيص: ' || SQLERRM
        );
END;
$$;

-- دالة تنظيف مبسطة وآمنة
CREATE OR REPLACE FUNCTION public.simple_cleanup_references(target_company_id uuid)
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
    -- التحقق من صحة المعاملات
    IF target_company_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف الشركة مطلوب'
        );
    END IF;
    
    -- 1. تنظيف vendor_accounts (إذا كان الجدول موجود)
    BEGIN
        DELETE FROM public.vendor_accounts 
        WHERE account_id IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id
        );
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        cleanup_results := cleanup_results || jsonb_build_object('vendor_accounts', temp_count);
        total_cleaned := total_cleaned + temp_count;
    EXCEPTION
        WHEN undefined_table THEN
            cleanup_results := cleanup_results || jsonb_build_object('vendor_accounts', 'table_not_found');
        WHEN OTHERS THEN
            cleanup_results := cleanup_results || jsonb_build_object('vendor_accounts_error', SQLERRM);
    END;
    
    -- 2. تنظيف customer_accounts (إذا كان الجدول موجود)
    BEGIN
        DELETE FROM public.customer_accounts 
        WHERE account_id IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id
        );
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        cleanup_results := cleanup_results || jsonb_build_object('customer_accounts', temp_count);
        total_cleaned := total_cleaned + temp_count;
    EXCEPTION
        WHEN undefined_table THEN
            cleanup_results := cleanup_results || jsonb_build_object('customer_accounts', 'table_not_found');
        WHEN OTHERS THEN
            cleanup_results := cleanup_results || jsonb_build_object('customer_accounts_error', SQLERRM);
    END;
    
    -- 3. تنظيف account_mappings (إذا كان الجدول موجود)
    BEGIN
        DELETE FROM public.account_mappings 
        WHERE chart_of_accounts_id IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id
        );
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        cleanup_results := cleanup_results || jsonb_build_object('account_mappings', temp_count);
        total_cleaned := total_cleaned + temp_count;
    EXCEPTION
        WHEN undefined_table THEN
            cleanup_results := cleanup_results || jsonb_build_object('account_mappings', 'table_not_found');
        WHEN OTHERS THEN
            cleanup_results := cleanup_results || jsonb_build_object('account_mappings_error', SQLERRM);
    END;
    
    -- 4. تنظيف essential_account_mappings (إذا كان الجدول موجود)
    BEGIN
        DELETE FROM public.essential_account_mappings 
        WHERE account_id IN (
            SELECT id FROM public.chart_of_accounts 
            WHERE company_id = target_company_id
        );
        GET DIAGNOSTICS temp_count = ROW_COUNT;
        cleanup_results := cleanup_results || jsonb_build_object('essential_mappings', temp_count);
        total_cleaned := total_cleaned + temp_count;
    EXCEPTION
        WHEN undefined_table THEN
            cleanup_results := cleanup_results || jsonb_build_object('essential_mappings', 'table_not_found');
        WHEN OTHERS THEN
            cleanup_results := cleanup_results || jsonb_build_object('essential_mappings_error', SQLERRM);
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', format('تم تنظيف %s مرجع من الجداول المرتبطة', total_cleaned),
        'total_cleaned', total_cleaned,
        'cleanup_details', cleanup_results
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في التنظيف: ' || SQLERRM
        );
END;
$$;
