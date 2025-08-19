-- إصلاح دالة الحذف لدعم وضع التحليل بدون حذف فعلي
CREATE OR REPLACE FUNCTION public.enhanced_cascade_delete_account(
    account_id_param uuid,
    force_delete boolean DEFAULT false,
    transfer_to_account_id uuid DEFAULT NULL,
    analysis_only boolean DEFAULT false  -- معامل جديد للتحليل فقط
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_record record;
    child_count integer;
    journal_entries_count integer;
    budget_items_count integer;
    payments_count integer;
    affected_records jsonb := '{}';
    result jsonb;
    transfer_account_record record;
    deletion_log_id uuid;
BEGIN
    -- الحصول على بيانات الحساب
    SELECT * INTO account_record
    FROM public.chart_of_accounts
    WHERE id = account_id_param
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'error', 'الحساب غير موجود أو غير نشط'
        );
    END IF;
    
    -- التحقق من الحسابات الفرعية
    SELECT COUNT(*) INTO child_count
    FROM public.chart_of_accounts
    WHERE parent_account_id = account_id_param
    AND is_active = true;
    
    -- التحقق من القيود المحاسبية
    SELECT COUNT(*) INTO journal_entries_count
    FROM public.journal_entry_lines
    WHERE account_id = account_id_param;
    
    -- التحقق من عناصر الميزانية
    SELECT COUNT(*) INTO budget_items_count
    FROM public.budget_items
    WHERE account_id = account_id_param;
    
    -- التحقق من المدفوعات
    SELECT COUNT(*) INTO payments_count
    FROM public.payments
    WHERE account_id = account_id_param;
    
    -- إذا كان هذا تحليل فقط، إرجاع النتائج بدون حذف
    IF analysis_only THEN
        -- تحديد ما إذا كان يمكن الحذف
        RETURN jsonb_build_object(
            'success', true,
            'can_delete', (journal_entries_count = 0 AND payments_count = 0),
            'linked_tables', CASE 
                WHEN journal_entries_count > 0 OR payments_count > 0 THEN 
                    ARRAY(
                        SELECT unnest(ARRAY['journal_entry_lines', 'payments', 'budget_items'])
                        WHERE unnest IN (
                            CASE WHEN journal_entries_count > 0 THEN 'journal_entry_lines' END,
                            CASE WHEN payments_count > 0 THEN 'payments' END,
                            CASE WHEN budget_items_count > 0 THEN 'budget_items' END
                        )
                    )
                ELSE ARRAY[]::text[]
            END,
            'table_counts', jsonb_build_object(
                'journal_entry_lines', journal_entries_count,
                'budget_items', budget_items_count,
                'payments', payments_count,
                'child_accounts', child_count
            ),
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', account_record.is_system
            ),
            'child_accounts_count', child_count,
            'message', CASE 
                WHEN journal_entries_count > 0 OR payments_count > 0 THEN
                    'يحتوي الحساب على بيانات مرتبطة. استخدم خيار النقل أو الحذف القسري.'
                ELSE 
                    'الحساب آمن للحذف - لا توجد بيانات مرتبطة به.'
            END
        );
    END IF;
    
    -- إذا لم يكن حذف قسري وهناك قيود
    IF NOT force_delete AND (journal_entries_count > 0 OR payments_count > 0) THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'linked_tables', ARRAY['journal_entry_lines', 'payments'],
            'table_counts', jsonb_build_object(
                'journal_entry_lines', journal_entries_count,
                'budget_items', budget_items_count,
                'payments', payments_count,
                'child_accounts', child_count
            ),
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', account_record.is_system
            ),
            'child_accounts_count', child_count,
            'message', 'يحتوي الحساب على قيود محاسبية أو مدفوعات. استخدم خيار النقل أو الحذف القسري.'
        );
    END IF;
    
    -- إذا كان هناك حساب للنقل، التحقق من صحته
    IF transfer_to_account_id IS NOT NULL THEN
        SELECT * INTO transfer_account_record
        FROM public.chart_of_accounts
        WHERE id = transfer_to_account_id
        AND is_active = true
        AND company_id = account_record.company_id;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'حساب النقل غير صحيح أو غير موجود في نفس الشركة'
            );
        END IF;
    END IF;
    
    -- تسجيل العملية في اللوگ
    affected_records := jsonb_build_object(
        'journal_entries', journal_entries_count,
        'budget_items', budget_items_count,
        'payments', payments_count,
        'child_accounts', child_count
    );
    
    deletion_log_id := public.log_account_deletion(
        account_record.company_id,
        account_id_param,
        account_record.account_code,
        account_record.account_name,
        CASE 
            WHEN transfer_to_account_id IS NOT NULL THEN 'transfer'
            WHEN force_delete THEN 'force'
            ELSE 'normal'
        END,
        transfer_to_account_id,
        affected_records,
        CASE 
            WHEN transfer_to_account_id IS NOT NULL THEN 'نقل البيانات إلى حساب آخر'
            WHEN force_delete THEN 'حذف قسري مع جميع البيانات المرتبطة'
            ELSE 'حذف عادي'
        END
    );
    
    -- تنفيذ العمليات (الحذف الفعلي)
    BEGIN
        -- إذا كان هناك نقل للبيانات
        IF transfer_to_account_id IS NOT NULL THEN
            -- نقل القيود المحاسبية
            UPDATE public.journal_entry_lines
            SET account_id = transfer_to_account_id
            WHERE account_id = account_id_param;
            
            -- نقل عناصر الميزانية
            UPDATE public.budget_items
            SET account_id = transfer_to_account_id
            WHERE account_id = account_id_param;
            
            -- نقل المدفوعات
            UPDATE public.payments
            SET account_id = transfer_to_account_id
            WHERE account_id = account_id_param;
        END IF;
        
        -- حذف الحسابات الفرعية (سيتم حذفها تلقائياً بسبب CASCADE)
        -- حذف الحساب الرئيسي
        DELETE FROM public.chart_of_accounts
        WHERE id = account_id_param;
        
        result := jsonb_build_object(
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
            'child_accounts_deleted', child_count,
            'transfer_to_account_id', transfer_to_account_id,
            'deletion_log_id', deletion_log_id
        );
        
        RETURN result;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'فشل في حذف الحساب: ' || SQLERRM
            );
    END;
END;
$$;