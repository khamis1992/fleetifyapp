-- Update enhanced_cascade_delete_account function to handle foreign key constraints
CREATE OR REPLACE FUNCTION public.enhanced_cascade_delete_account(
    account_id_param uuid,
    force_delete boolean DEFAULT false,
    transfer_to_account_id uuid DEFAULT NULL,
    analysis_only boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    account_record RECORD;
    child_count INTEGER;
    journal_entries_count INTEGER;
    bank_transactions_count INTEGER;
    budget_items_count INTEGER;
    customers_count INTEGER;
    contracts_count INTEGER;
    invoices_count INTEGER;
    payments_count INTEGER;
    affected_records_data jsonb := '{}';
    deletion_log_id uuid;
    transfer_account_record RECORD;
BEGIN
    -- Get account details
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
    
    -- Validate transfer account if provided
    IF transfer_to_account_id IS NOT NULL THEN
        -- Check if it's the same account
        IF transfer_to_account_id = account_id_param THEN
            RETURN jsonb_build_object(
                'success', false,
                'can_delete', false,
                'error', 'لا يمكن نقل البيانات إلى نفس الحساب المراد حذفه'
            );
        END IF;
        
        -- Validate transfer account exists and is active
        SELECT * INTO transfer_account_record
        FROM chart_of_accounts
        WHERE id = transfer_to_account_id 
        AND is_active = true 
        AND company_id = account_record.company_id;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'can_delete', false,
                'error', 'الحساب المحدد للنقل غير موجود أو غير نشط'
            );
        END IF;
        
        -- Check if transfer account can accept entries (level 5 or 6, not header)
        IF NOT validate_account_level_for_entries(transfer_to_account_id) THEN
            RETURN jsonb_build_object(
                'success', false,
                'can_delete', false,
                'error', 'الحساب المحدد للنقل لا يقبل القيود المحاسبية. يجب أن يكون حساب فرعي (المستوى 5 أو 6)'
            );
        END IF;
    END IF;
    
    -- Count child accounts
    SELECT COUNT(*) INTO child_count
    FROM chart_of_accounts
    WHERE parent_account_id = account_id_param AND is_active = true;
    
    -- Count related records
    SELECT COUNT(*) INTO journal_entries_count
    FROM journal_entry_lines
    WHERE account_id = account_id_param;
    
    SELECT COUNT(*) INTO bank_transactions_count
    FROM bank_transactions bt
    JOIN banks b ON bt.bank_id = b.id
    WHERE b.id IN (
        SELECT id FROM banks WHERE company_id = account_record.company_id
    );
    
    SELECT COUNT(*) INTO budget_items_count
    FROM budget_items
    WHERE account_id = account_id_param;
    
    SELECT COUNT(*) INTO customers_count
    FROM customers
    WHERE account_id = account_id_param;
    
    SELECT COUNT(*) INTO contracts_count
    FROM contracts
    WHERE account_id = account_id_param;
    
    SELECT COUNT(*) INTO invoices_count
    FROM invoices
    WHERE account_id = account_id_param;
    
    SELECT COUNT(*) INTO payments_count
    FROM payments
    WHERE account_id = account_id_param;
    
    -- Build affected records summary
    affected_records_data := jsonb_build_object(
        'child_accounts', child_count,
        'journal_entries', journal_entries_count,
        'bank_transactions', bank_transactions_count,
        'budget_items', budget_items_count,
        'customers', customers_count,
        'contracts', contracts_count,
        'invoices', invoices_count,
        'payments', payments_count
    );
    
    -- Return analysis if requested
    IF analysis_only THEN
        RETURN jsonb_build_object(
            'success', true,
            'can_delete', (child_count = 0 AND (journal_entries_count = 0 OR transfer_to_account_id IS NOT NULL OR force_delete)),
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', account_record.is_system
            ),
            'child_accounts_count', child_count,
            'table_counts', affected_records_data,
            'linked_tables', CASE 
                WHEN journal_entries_count > 0 THEN ARRAY['journal_entry_lines']
                ELSE ARRAY[]::text[]
            END,
            'message', CASE
                WHEN child_count > 0 THEN 'الحساب يحتوي على حسابات فرعية ولا يمكن حذفه'
                WHEN journal_entries_count > 0 AND transfer_to_account_id IS NULL AND NOT force_delete THEN 
                    'الحساب يحتوي على ' || journal_entries_count || ' قيد محاسبي. يمكنك نقل القيود إلى حساب آخر أو استخدام الحذف القسري'
                WHEN journal_entries_count > 0 AND transfer_to_account_id IS NOT NULL THEN
                    'سيتم نقل ' || journal_entries_count || ' قيد محاسبي إلى الحساب المحدد'
                WHEN journal_entries_count > 0 AND force_delete THEN
                    'تحذير: سيتم حذف ' || journal_entries_count || ' قيد محاسبي نهائياً'
                ELSE 'يمكن حذف الحساب بأمان'
            END
        );
    END IF;
    
    -- Check if deletion is allowed
    IF child_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'لا يمكن حذف الحساب لأنه يحتوي على حسابات فرعية'
        );
    END IF;
    
    IF journal_entries_count > 0 AND transfer_to_account_id IS NULL AND NOT force_delete THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'لا يمكن حذف الحساب لأنه يحتوي على قيود محاسبية. يجب نقل القيود أو استخدام الحذف القسري'
        );
    END IF;
    
    -- Create deletion log
    INSERT INTO account_deletion_log (
        company_id,
        deleted_account_id,
        deleted_account_code,
        deleted_account_name,
        deletion_type,
        transfer_to_account_id,
        affected_records,
        deletion_reason,
        deleted_by
    ) VALUES (
        account_record.company_id,
        account_record.id,
        account_record.account_code,
        account_record.account_name,
        CASE 
            WHEN transfer_to_account_id IS NOT NULL THEN 'transfer'
            WHEN force_delete THEN 'force'
            ELSE 'normal'
        END,
        transfer_to_account_id,
        affected_records_data,
        CASE 
            WHEN transfer_to_account_id IS NOT NULL THEN 'نقل البيانات إلى حساب آخر'
            WHEN force_delete THEN 'حذف قسري مع جميع البيانات المرتبطة'
            ELSE 'حذف عادي'
        END,
        auth.uid()
    ) RETURNING id INTO deletion_log_id;
    
    -- Handle journal entries
    IF journal_entries_count > 0 THEN
        IF transfer_to_account_id IS NOT NULL THEN
            -- Transfer journal entries to new account
            UPDATE journal_entry_lines
            SET account_id = transfer_to_account_id,
                updated_at = now()
            WHERE account_id = account_id_param;
            
            -- Update account balances
            UPDATE chart_of_accounts
            SET current_balance = current_balance + account_record.current_balance,
                updated_at = now()
            WHERE id = transfer_to_account_id;
            
        ELSIF force_delete THEN
            -- Delete journal entries (this will cascade to related data)
            DELETE FROM journal_entry_lines WHERE account_id = account_id_param;
        END IF;
    END IF;
    
    -- Handle other related records if force delete
    IF force_delete THEN
        -- Update related records to remove account reference
        UPDATE budget_items SET account_id = NULL WHERE account_id = account_id_param;
        UPDATE customers SET account_id = NULL WHERE account_id = account_id_param;
        UPDATE contracts SET account_id = NULL WHERE account_id = account_id_param;
        UPDATE invoices SET account_id = NULL WHERE account_id = account_id_param;
        UPDATE payments SET account_id = NULL WHERE account_id = account_id_param;
    END IF;
    
    -- Finally delete the account
    UPDATE chart_of_accounts
    SET is_active = false,
        updated_at = now()
    WHERE id = account_id_param;
    
    -- Return success result
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
        'transfer_to_account_id', transfer_to_account_id,
        'deletion_log_id', deletion_log_id,
        'child_accounts_deleted', 0
    );
    
EXCEPTION
    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'لا يمكن حذف الحساب بسبب ارتباطه ببيانات أخرى. استخدم خيار النقل أو الحذف القسري'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'حدث خطأ أثناء حذف الحساب: ' || SQLERRM
        );
END;
$$;