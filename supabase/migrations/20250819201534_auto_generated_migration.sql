-- إصلاح التحذير الأمني للدالة الجديدة
CREATE OR REPLACE FUNCTION public.log_account_deletion(
    p_company_id uuid,
    p_deleted_account_id uuid,
    p_deleted_account_code varchar,
    p_deleted_account_name text,
    p_deletion_type text,
    p_transfer_to_account_id uuid DEFAULT NULL,
    p_affected_records jsonb DEFAULT '{}',
    p_deletion_reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO public.account_deletion_log (
        company_id,
        deleted_account_id,
        deleted_account_code,
        deleted_account_name,
        deletion_type,
        transfer_to_account_id,
        affected_records,
        deleted_by,
        deletion_reason
    ) VALUES (
        p_company_id,
        p_deleted_account_id,
        p_deleted_account_code,
        p_deleted_account_name,
        p_deletion_type,
        p_transfer_to_account_id,
        p_affected_records,
        auth.uid(),
        p_deletion_reason
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- المرحلة الثانية: دالة الحذف المحسنة والشاملة
CREATE OR REPLACE FUNCTION public.enhanced_cascade_delete_account(
    account_id_param uuid,
    force_delete boolean DEFAULT false,
    transfer_to_account_id uuid DEFAULT NULL
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
    
    -- إذا لم يكن حذف قسري وهناك قيود
    IF NOT force_delete AND (journal_entries_count > 0) THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_delete', false,
            'linked_tables', ARRAY['journal_entry_lines'],
            'table_counts', jsonb_build_object(
                'journal_entry_lines', journal_entries_count,
                'budget_items', budget_items_count,
                'child_accounts', child_count
            ),
            'account_info', jsonb_build_object(
                'code', account_record.account_code,
                'name', account_record.account_name,
                'is_system', account_record.is_system
            ),
            'child_accounts_count', child_count,
            'message', 'يحتوي الحساب على قيود محاسبية. استخدم خيار النقل أو الحذف القسري.'
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
            ELSE 'cascade'
        END,
        transfer_to_account_id,
        affected_records,
        CASE 
            WHEN transfer_to_account_id IS NOT NULL THEN 'نقل البيانات إلى حساب آخر'
            WHEN force_delete THEN 'حذف قسري مع جميع البيانات المرتبطة'
            ELSE 'حذف عادي'
        END
    );
    
    -- تنفيذ العمليات
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
            
        ELSIF force_delete THEN
            -- حذف البيانات المرتبطة قسرياً
            -- سيتم تعيين NULL تلقائياً في budget_items بسبب ON DELETE SET NULL
            NULL; -- القيود المحاسبية ستبقى مع RESTRICT لحماية التكامل
        END IF;
        
        -- حذف الحسابات الفرعية (سيتم حذفها تلقائياً بسبب CASCADE)
        -- حذف الحساب الرئيسي
        DELETE FROM public.chart_of_accounts
        WHERE id = account_id_param;
        
        result := jsonb_build_object(
            'success', true,
            'action', CASE 
                WHEN transfer_to_account_id IS NOT NULL THEN 'transferred'
                WHEN force_delete THEN 'deleted'
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