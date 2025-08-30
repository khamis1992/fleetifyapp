-- Update delete_all_accounts RPC to accept force_delete_system parameter
CREATE OR REPLACE FUNCTION public.delete_all_accounts(
    target_company_id uuid,
    force_delete_system boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    affected_count integer := 0;
    error_count integer := 0;
    success_count integer := 0;
    system_deactivated_count integer := 0;
    current_account record;
    error_details jsonb := '[]'::jsonb;
    success_details jsonb := '[]'::jsonb;
    deactivated_details jsonb := '[]'::jsonb;
    result jsonb;
BEGIN
    -- التحقق من صلاحيات المستخدم
    IF NOT (
        has_role(auth.uid(), 'super_admin'::user_role) OR 
        (
            get_user_company(auth.uid()) = target_company_id AND 
            (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
        )
    ) THEN
        RAISE EXCEPTION 'غير مصرح لك بحذف الحسابات في هذه الشركة' USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Step 1: إزالة المراجع الخارجية في fixed_assets أولاً
    BEGIN
        UPDATE public.fixed_assets 
        SET 
            depreciation_account_id = NULL,
            accumulated_depreciation_account_id = NULL,
            disposal_account_id = NULL
        WHERE depreciation_account_id IN (
            SELECT id FROM public.chart_of_accounts WHERE company_id = target_company_id
        ) OR accumulated_depreciation_account_id IN (
            SELECT id FROM public.chart_of_accounts WHERE company_id = target_company_id
        ) OR disposal_account_id IN (
            SELECT id FROM public.chart_of_accounts WHERE company_id = target_company_id
        );
        
        RAISE NOTICE 'تم إزالة مراجع الأصول الثابتة بنجاح';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في إزالة مراجع الأصول الثابتة: %', SQLERRM;
    END;

    -- Step 2: معالجة الحسابات
    FOR current_account IN 
        SELECT * FROM public.chart_of_accounts 
        WHERE company_id = target_company_id 
        ORDER BY account_level DESC, account_code
    LOOP
        affected_count := affected_count + 1;
        
        BEGIN
            -- التحقق من كون الحساب نظامي
            IF current_account.is_system = true THEN
                IF force_delete_system = true THEN
                    -- حذف الحسابات النظامية قسرياً إذا كان مسموحاً
                    DELETE FROM public.chart_of_accounts WHERE id = current_account.id;
                    success_count := success_count + 1;
                    success_details := success_details || jsonb_build_object(
                        'account_code', current_account.account_code,
                        'account_name', current_account.account_name,
                        'is_system', current_account.is_system,
                        'action', 'force_deleted'
                    );
                    RAISE NOTICE 'تم حذف الحساب النظامي قسرياً: % - %', current_account.account_code, current_account.account_name;
                ELSE
                    -- إلغاء تفعيل الحسابات النظامية بدلاً من حذفها
                    UPDATE public.chart_of_accounts 
                    SET is_active = false 
                    WHERE id = current_account.id;
                    system_deactivated_count := system_deactivated_count + 1;
                    deactivated_details := deactivated_details || jsonb_build_object(
                        'account_code', current_account.account_code,
                        'account_name', current_account.account_name,
                        'is_system', current_account.is_system,
                        'action', 'deactivated'
                    );
                    RAISE NOTICE 'تم إلغاء تفعيل الحساب النظامي: % - %', current_account.account_code, current_account.account_name;
                END IF;
            ELSE
                -- حذف الحسابات العادية
                DELETE FROM public.chart_of_accounts WHERE id = current_account.id;
                success_count := success_count + 1;
                success_details := success_details || jsonb_build_object(
                    'account_code', current_account.account_code,
                    'account_name', current_account.account_name,
                    'is_system', current_account.is_system,
                    'action', 'deleted'
                );
                RAISE NOTICE 'تم حذف الحساب: % - %', current_account.account_code, current_account.account_name;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            error_details := error_details || jsonb_build_object(
                'account_code', current_account.account_code,
                'account_name', current_account.account_name,
                'error', SQLERRM,
                'is_system', current_account.is_system
            );
            RAISE NOTICE 'خطأ في معالجة الحساب % - %: %', current_account.account_code, current_account.account_name, SQLERRM;
        END;
    END LOOP;

    -- إنشاء النتيجة النهائية
    result := jsonb_build_object(
        'success', true,
        'affected_count', affected_count,
        'success_count', success_count,
        'error_count', error_count,
        'system_deactivated_count', system_deactivated_count,
        'force_delete_system', force_delete_system,
        'success_details', success_details,
        'error_details', error_details,
        'deactivated_details', deactivated_details,
        'message', format('تمت معالجة %s حساب: %s تم حذفها، %s فشل، %s حسابات نظامية تم إلغاء تفعيلها', 
                         affected_count, success_count, error_count, system_deactivated_count)
    );

    RETURN result;
END;
$function$;

-- Update get_all_accounts_deletion_preview RPC to show system accounts handling
CREATE OR REPLACE FUNCTION public.get_all_accounts_deletion_preview(
    target_company_id uuid,
    force_delete_system boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_accounts integer;
    system_accounts integer;
    regular_accounts integer;
    will_be_deleted integer;
    will_be_deactivated integer;
    sample_accounts jsonb := '[]'::jsonb;
    system_accounts_sample jsonb := '[]'::jsonb;
    result jsonb;
BEGIN
    -- التحقق من صلاحيات المستخدم
    IF NOT (
        has_role(auth.uid(), 'super_admin'::user_role) OR 
        (
            get_user_company(auth.uid()) = target_company_id AND 
            (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
        )
    ) THEN
        RAISE EXCEPTION 'غير مصرح لك بمعاينة حذف الحسابات في هذه الشركة' USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- عد الحسابات
    SELECT COUNT(*) INTO total_accounts
    FROM public.chart_of_accounts
    WHERE company_id = target_company_id;
    
    SELECT COUNT(*) INTO system_accounts
    FROM public.chart_of_accounts
    WHERE company_id = target_company_id AND is_system = true;
    
    SELECT COUNT(*) INTO regular_accounts
    FROM public.chart_of_accounts
    WHERE company_id = target_company_id AND is_system = false;

    -- حساب ما سيتم حذفه أو إلغاء تفعيله
    IF force_delete_system = true THEN
        will_be_deleted := total_accounts;
        will_be_deactivated := 0;
    ELSE
        will_be_deleted := regular_accounts;
        will_be_deactivated := system_accounts;
    END IF;

    -- جمع عينة من الحسابات العادية
    SELECT jsonb_agg(
        jsonb_build_object(
            'account_code', account_code,
            'account_name', account_name,
            'account_type', account_type,
            'is_system', is_system,
            'action', 'will_be_deleted'
        )
    ) INTO sample_accounts
    FROM (
        SELECT account_code, account_name, account_type, is_system
        FROM public.chart_of_accounts
        WHERE company_id = target_company_id AND is_system = false
        ORDER BY account_code
        LIMIT 10
    ) sample;

    -- جمع عينة من الحسابات النظامية
    SELECT jsonb_agg(
        jsonb_build_object(
            'account_code', account_code,
            'account_name', account_name,
            'account_type', account_type,
            'is_system', is_system,
            'action', CASE WHEN force_delete_system THEN 'will_be_force_deleted' ELSE 'will_be_deactivated' END
        )
    ) INTO system_accounts_sample
    FROM (
        SELECT account_code, account_name, account_type, is_system
        FROM public.chart_of_accounts
        WHERE company_id = target_company_id AND is_system = true
        ORDER BY account_code
        LIMIT 5
    ) system_sample;

    result := jsonb_build_object(
        'total_accounts', total_accounts,
        'regular_accounts', regular_accounts,
        'system_accounts', system_accounts,
        'will_be_deleted', will_be_deleted,
        'will_be_deactivated', will_be_deactivated,
        'force_delete_system', force_delete_system,
        'sample_accounts', COALESCE(sample_accounts, '[]'::jsonb),
        'system_accounts_sample', COALESCE(system_accounts_sample, '[]'::jsonb),
        'warning_message', CASE 
            WHEN force_delete_system THEN 'تحذير: سيتم حذف جميع الحسابات بما في ذلك الحسابات النظامية. هذا الإجراء لا يمكن التراجع عنه!'
            ELSE 'سيتم حذف الحسابات العادية وإلغاء تفعيل الحسابات النظامية لحماية النظام.'
        END
    );

    RETURN result;
END;
$function$;