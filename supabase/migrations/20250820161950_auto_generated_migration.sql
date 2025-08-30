-- إسقاط الدالة الحالية وإنشاء دالة محسّنة جديدة
DROP FUNCTION IF EXISTS enhanced_cascade_delete_account;

CREATE OR REPLACE FUNCTION enhanced_cascade_delete_account(
    account_id_param UUID,
    force_delete BOOLEAN DEFAULT FALSE,
    transfer_to_account_id UUID DEFAULT NULL,
    analysis_only BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    account_record RECORD;
    child_accounts_count INTEGER := 0;
    linked_tables TEXT[] := ARRAY[]::TEXT[];
    table_counts JSONB := '{}'::JSONB;
    deletion_log_id UUID;
    total_affected INTEGER := 0;
    v_result JSONB;
    v_count INTEGER;
BEGIN
    -- التحقق من وجود الحساب
    SELECT * INTO account_record
    FROM chart_of_accounts
    WHERE id = account_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'error', 'الحساب غير موجود أو غير نشط'
        );
    END IF;
    
    -- فحص الحسابات الفرعية
    SELECT COUNT(*) INTO child_accounts_count
    FROM chart_of_accounts
    WHERE parent_account_id = account_id_param AND is_active = true;
    
    -- فحص جدول journal_entry_lines
    SELECT COUNT(*) INTO v_count FROM journal_entry_lines WHERE account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'journal_entry_lines');
        table_counts := jsonb_set(table_counts, '{journal_entry_lines}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول contracts
    SELECT COUNT(*) INTO v_count FROM contracts WHERE account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'contracts');
        table_counts := jsonb_set(table_counts, '{contracts}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول payments
    SELECT COUNT(*) INTO v_count FROM payments WHERE account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'payments');
        table_counts := jsonb_set(table_counts, '{payments}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول invoice_items
    SELECT COUNT(*) INTO v_count FROM invoice_items WHERE account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'invoice_items');
        table_counts := jsonb_set(table_counts, '{invoice_items}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول customer_accounts
    SELECT COUNT(*) INTO v_count FROM customer_accounts WHERE account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'customer_accounts');
        table_counts := jsonb_set(table_counts, '{customer_accounts}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول customer_balances
    SELECT COUNT(*) INTO v_count FROM customer_balances WHERE account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'customer_balances');
        table_counts := jsonb_set(table_counts, '{customer_balances}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول vendor_accounts
    SELECT COUNT(*) INTO v_count FROM vendor_accounts WHERE account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'vendor_accounts');
        table_counts := jsonb_set(table_counts, '{vendor_accounts}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول budget_items
    SELECT COUNT(*) INTO v_count FROM budget_items WHERE account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'budget_items');
        table_counts := jsonb_set(table_counts, '{budget_items}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول contract_templates
    SELECT COUNT(*) INTO v_count FROM contract_templates WHERE account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'contract_templates');
        table_counts := jsonb_set(table_counts, '{contract_templates}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول essential_account_mappings
    SELECT COUNT(*) INTO v_count FROM essential_account_mappings WHERE chart_of_accounts_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'essential_account_mappings');
        table_counts := jsonb_set(table_counts, '{essential_account_mappings}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول fixed_assets (asset_account_id و depreciation_account_id)
    SELECT COUNT(*) INTO v_count FROM fixed_assets WHERE asset_account_id = account_id_param OR depreciation_account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'fixed_assets');
        table_counts := jsonb_set(table_counts, '{fixed_assets}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص الجداول المرتبطة بـ legal_case_account_mappings
    SELECT COUNT(*) INTO v_count FROM legal_case_account_mappings 
    WHERE legal_fees_revenue_account_id = account_id_param 
       OR consultation_revenue_account_id = account_id_param
       OR legal_fees_receivable_account_id = account_id_param
       OR court_fees_expense_account_id = account_id_param
       OR legal_expenses_account_id = account_id_param
       OR expert_witness_expense_account_id = account_id_param
       OR legal_research_expense_account_id = account_id_param
       OR settlements_expense_account_id = account_id_param
       OR settlements_payable_account_id = account_id_param
       OR client_retainer_liability_account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'legal_case_account_mappings');
        table_counts := jsonb_set(table_counts, '{legal_case_account_mappings}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول maintenance_account_mappings
    SELECT COUNT(*) INTO v_count FROM maintenance_account_mappings 
    WHERE asset_account_id = account_id_param OR expense_account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'maintenance_account_mappings');
        table_counts := jsonb_set(table_counts, '{maintenance_account_mappings}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- فحص جدول vehicle_maintenance
    SELECT COUNT(*) INTO v_count FROM vehicle_maintenance WHERE expense_account_id = account_id_param;
    IF v_count > 0 THEN
        linked_tables := array_append(linked_tables, 'vehicle_maintenance');
        table_counts := jsonb_set(table_counts, '{vehicle_maintenance}', to_jsonb(v_count));
        total_affected := total_affected + v_count;
    END IF;
    
    -- تحديد إمكانية الحذف
    DECLARE
        can_delete_account BOOLEAN := false;
    BEGIN
        IF child_accounts_count = 0 AND array_length(linked_tables, 1) IS NULL THEN
            can_delete_account := true;
        ELSIF force_delete OR transfer_to_account_id IS NOT NULL THEN
            can_delete_account := true;
        END IF;
        
        -- إذا كان تحليل فقط، إرجاع النتائج
        IF analysis_only THEN
            RETURN jsonb_build_object(
                'success', true,
                'can_delete', can_delete_account,
                'account_info', jsonb_build_object(
                    'code', account_record.account_code,
                    'name', account_record.account_name,
                    'is_system', account_record.is_system
                ),
                'linked_tables', linked_tables,
                'table_counts', table_counts,
                'child_accounts_count', child_accounts_count,
                'total_affected_records', total_affected,
                'message', CASE 
                    WHEN can_delete_account THEN 'يمكن حذف الحساب'
                    ELSE 'لا يمكن حذف الحساب بسبب وجود بيانات مرتبطة'
                END
            );
        END IF;
        
        -- إذا لم يكن يمكن الحذف
        IF NOT can_delete_account THEN
            RETURN jsonb_build_object(
                'success', false,
                'can_delete', false,
                'error', 'لا يمكن حذف الحساب بسبب وجود بيانات مرتبطة أو حسابات فرعية'
            );
        END IF;
        
        -- إنشاء سجل في جدول الحذف
        INSERT INTO account_deletion_log (
            company_id,
            deleted_account_id,
            deleted_account_code,
            deleted_account_name,
            transfer_to_account_id,
            deletion_type,
            deletion_reason,
            affected_records,
            deleted_by
        ) VALUES (
            account_record.company_id,
            account_id_param,
            account_record.account_code,
            account_record.account_name,
            transfer_to_account_id,
            CASE 
                WHEN transfer_to_account_id IS NOT NULL THEN 'transferred'
                WHEN force_delete THEN 'force'
                ELSE 'normal'
            END,
            'حذف تلقائي من النظام',
            table_counts,
            auth.uid()
        ) RETURNING id INTO deletion_log_id;
        
        -- تنفيذ عمليات النقل أو الحذف
        IF transfer_to_account_id IS NOT NULL THEN
            -- نقل البيانات إلى حساب آخر
            UPDATE journal_entry_lines SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
            UPDATE contracts SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
            UPDATE payments SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
            UPDATE invoice_items SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
            UPDATE customer_accounts SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
            UPDATE customer_balances SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
            UPDATE vendor_accounts SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
            UPDATE budget_items SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
            UPDATE contract_templates SET account_id = transfer_to_account_id WHERE account_id = account_id_param;
            UPDATE essential_account_mappings SET chart_of_accounts_id = transfer_to_account_id WHERE chart_of_accounts_id = account_id_param;
            
            -- تحديث جدول fixed_assets
            UPDATE fixed_assets SET asset_account_id = transfer_to_account_id WHERE asset_account_id = account_id_param;
            UPDATE fixed_assets SET depreciation_account_id = transfer_to_account_id WHERE depreciation_account_id = account_id_param;
            
            -- تحديث legal_case_account_mappings
            UPDATE legal_case_account_mappings SET legal_fees_revenue_account_id = transfer_to_account_id WHERE legal_fees_revenue_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET consultation_revenue_account_id = transfer_to_account_id WHERE consultation_revenue_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET legal_fees_receivable_account_id = transfer_to_account_id WHERE legal_fees_receivable_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET court_fees_expense_account_id = transfer_to_account_id WHERE court_fees_expense_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET legal_expenses_account_id = transfer_to_account_id WHERE legal_expenses_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET expert_witness_expense_account_id = transfer_to_account_id WHERE expert_witness_expense_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET legal_research_expense_account_id = transfer_to_account_id WHERE legal_research_expense_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET settlements_expense_account_id = transfer_to_account_id WHERE settlements_expense_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET settlements_payable_account_id = transfer_to_account_id WHERE settlements_payable_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET client_retainer_liability_account_id = transfer_to_account_id WHERE client_retainer_liability_account_id = account_id_param;
            
            -- تحديث maintenance_account_mappings
            UPDATE maintenance_account_mappings SET asset_account_id = transfer_to_account_id WHERE asset_account_id = account_id_param;
            UPDATE maintenance_account_mappings SET expense_account_id = transfer_to_account_id WHERE expense_account_id = account_id_param;
            
            -- تحديث vehicle_maintenance
            UPDATE vehicle_maintenance SET expense_account_id = transfer_to_account_id WHERE expense_account_id = account_id_param;
            
        ELSIF force_delete THEN
            -- حذف قسري لجميع البيانات المرتبطة
            DELETE FROM journal_entry_lines WHERE account_id = account_id_param;
            DELETE FROM customer_accounts WHERE account_id = account_id_param;
            DELETE FROM customer_balances WHERE account_id = account_id_param;
            DELETE FROM vendor_accounts WHERE account_id = account_id_param;
            DELETE FROM budget_items WHERE account_id = account_id_param;
            DELETE FROM essential_account_mappings WHERE chart_of_accounts_id = account_id_param;
            
            -- إزالة الربط في الجداول الأخرى
            UPDATE contracts SET account_id = NULL WHERE account_id = account_id_param;
            UPDATE payments SET account_id = NULL WHERE account_id = account_id_param;
            UPDATE invoice_items SET account_id = NULL WHERE account_id = account_id_param;
            UPDATE contract_templates SET account_id = NULL WHERE account_id = account_id_param;
            UPDATE fixed_assets SET asset_account_id = NULL WHERE asset_account_id = account_id_param;
            UPDATE fixed_assets SET depreciation_account_id = NULL WHERE depreciation_account_id = account_id_param;
            UPDATE vehicle_maintenance SET expense_account_id = NULL WHERE expense_account_id = account_id_param;
            
            -- إزالة من جدول legal_case_account_mappings
            UPDATE legal_case_account_mappings SET legal_fees_revenue_account_id = NULL WHERE legal_fees_revenue_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET consultation_revenue_account_id = NULL WHERE consultation_revenue_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET legal_fees_receivable_account_id = NULL WHERE legal_fees_receivable_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET court_fees_expense_account_id = NULL WHERE court_fees_expense_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET legal_expenses_account_id = NULL WHERE legal_expenses_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET expert_witness_expense_account_id = NULL WHERE expert_witness_expense_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET legal_research_expense_account_id = NULL WHERE legal_research_expense_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET settlements_expense_account_id = NULL WHERE settlements_expense_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET settlements_payable_account_id = NULL WHERE settlements_payable_account_id = account_id_param;
            UPDATE legal_case_account_mappings SET client_retainer_liability_account_id = NULL WHERE client_retainer_liability_account_id = account_id_param;
            
            -- إزالة من جدول maintenance_account_mappings
            UPDATE maintenance_account_mappings SET asset_account_id = NULL WHERE asset_account_id = account_id_param;
            UPDATE maintenance_account_mappings SET expense_account_id = NULL WHERE expense_account_id = account_id_param;
            
            -- حذف الحسابات الفرعية
            DELETE FROM chart_of_accounts WHERE parent_account_id = account_id_param;
        END IF;
        
        -- حذف الحساب نفسه
        UPDATE chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE id = account_id_param;
        
        -- إرجاع النتيجة
        RETURN jsonb_build_object(
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
            'child_accounts_deleted', child_accounts_count,
            'transfer_to_account_id', transfer_to_account_id,
            'deletion_log_id', deletion_log_id,
            'total_affected_records', total_affected
        );
    END;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;