-- إصلاح دالة إعادة حساب مستويات الحسابات
CREATE OR REPLACE FUNCTION public.recalculate_account_levels(target_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    updated_count INTEGER := 0;
    max_iterations INTEGER := 10;
    current_iteration INTEGER := 0;
    changes_made BOOLEAN := true;
    account_record RECORD;
    calculated_level INTEGER;
BEGIN
    -- تكرار حتى لا توجد تغييرات أو الوصول للحد الأقصى من التكرارات
    WHILE changes_made AND current_iteration < max_iterations LOOP
        changes_made := false;
        current_iteration := current_iteration + 1;
        
        -- معالجة جميع الحسابات
        FOR account_record IN 
            SELECT id, account_code, parent_account_id, account_level
            FROM chart_of_accounts 
            WHERE company_id = target_company_id 
            AND is_active = true
            ORDER BY account_code
        LOOP
            -- حساب المستوى الصحيح
            IF account_record.parent_account_id IS NULL THEN
                calculated_level := 1;
            ELSE
                -- الحصول على مستوى الحساب الأب وإضافة 1
                SELECT COALESCE(account_level, 1) + 1 
                INTO calculated_level
                FROM chart_of_accounts 
                WHERE id = account_record.parent_account_id 
                AND company_id = target_company_id
                AND is_active = true;
                
                -- إذا لم نجد الحساب الأب، اجعل المستوى 1
                IF calculated_level IS NULL THEN
                    calculated_level := 1;
                END IF;
            END IF;
            
            -- تحديث المستوى إذا كان مختلفاً
            IF account_record.account_level != calculated_level THEN
                UPDATE chart_of_accounts 
                SET account_level = calculated_level,
                    updated_at = now()
                WHERE id = account_record.id;
                
                updated_count := updated_count + 1;
                changes_made := true;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN updated_count;
END;
$function$;

-- تحسين دالة إصلاح هرمية الحسابات
CREATE OR REPLACE FUNCTION public.fix_chart_hierarchy(target_company_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    orphaned_count INTEGER := 0;
    level_corrections INTEGER := 0;
    circular_refs_fixed INTEGER := 0;
    result json;
BEGIN
    -- 1. إصلاح الحسابات اليتيمة
    UPDATE chart_of_accounts 
    SET parent_account_id = NULL
    WHERE company_id = target_company_id
    AND parent_account_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts parent
        WHERE parent.id = chart_of_accounts.parent_account_id
        AND parent.company_id = target_company_id
        AND parent.is_active = true
    );
    
    GET DIAGNOSTICS orphaned_count = ROW_COUNT;
    
    -- 2. إصلاح المراجع الدائرية
    WITH RECURSIVE circular_check AS (
        SELECT id, parent_account_id, account_code, 1 as depth, ARRAY[id] as path
        FROM chart_of_accounts 
        WHERE company_id = target_company_id AND is_active = true
        
        UNION ALL
        
        SELECT c.id, p.parent_account_id, c.account_code, cc.depth + 1, cc.path || p.id
        FROM circular_check cc
        JOIN chart_of_accounts c ON c.id = cc.id
        JOIN chart_of_accounts p ON p.id = c.parent_account_id
        WHERE p.company_id = target_company_id 
        AND p.is_active = true
        AND cc.depth < 10
        AND NOT (p.id = ANY(cc.path))
    )
    UPDATE chart_of_accounts 
    SET parent_account_id = NULL
    WHERE id IN (
        SELECT DISTINCT id 
        FROM circular_check cc
        JOIN chart_of_accounts child ON child.parent_account_id = cc.id
        WHERE child.id = ANY(cc.path)
    );
    
    GET DIAGNOSTICS circular_refs_fixed = ROW_COUNT;
    
    -- 3. إعادة حساب مستويات الحسابات
    SELECT recalculate_account_levels(target_company_id) INTO level_corrections;
    
    -- إنشاء النتيجة
    result := json_build_object(
        'success', true,
        'orphaned_accounts_fixed', orphaned_count,
        'level_corrections', level_corrections,
        'circular_references_fixed', circular_refs_fixed,
        'total_fixes', orphaned_count + level_corrections + circular_refs_fixed,
        'message', CASE 
            WHEN (orphaned_count + level_corrections + circular_refs_fixed) = 0 THEN 
                'لا توجد مشاكل في هرمية الحسابات'
            ELSE 
                format('تم إصلاح %s مشكلة: %s حساب يتيم، %s تصحيح مستوى، %s مرجع دائري', 
                       orphaned_count + level_corrections + circular_refs_fixed,
                       orphaned_count, 
                       level_corrections, 
                       circular_refs_fixed)
        END
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'فشل في إصلاح هرمية الحسابات'
        );
END;
$function$;

-- إضافة دالة للفحص الشامل للهرمية
CREATE OR REPLACE FUNCTION public.comprehensive_hierarchy_check(target_company_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    total_accounts INTEGER := 0;
    problematic_accounts json[] := ARRAY[]::json[];
    account_record RECORD;
    expected_level INTEGER;
    issues_found INTEGER := 0;
BEGIN
    -- عد إجمالي الحسابات
    SELECT COUNT(*) INTO total_accounts
    FROM chart_of_accounts
    WHERE company_id = target_company_id AND is_active = true;
    
    -- فحص كل حساب
    FOR account_record IN 
        SELECT id, account_code, account_name, account_level, parent_account_id
        FROM chart_of_accounts 
        WHERE company_id = target_company_id 
        AND is_active = true
        ORDER BY account_code
    LOOP
        -- حساب المستوى المتوقع
        IF account_record.parent_account_id IS NULL THEN
            expected_level := 1;
        ELSE
            SELECT COALESCE(account_level, 1) + 1 
            INTO expected_level
            FROM chart_of_accounts 
            WHERE id = account_record.parent_account_id 
            AND company_id = target_company_id
            AND is_active = true;
            
            IF expected_level IS NULL THEN
                expected_level := 1;
            END IF;
        END IF;
        
        -- إضافة الحسابات المشكوك فيها
        IF account_record.account_level != expected_level THEN
            issues_found := issues_found + 1;
            problematic_accounts := problematic_accounts || json_build_object(
                'account_code', account_record.account_code,
                'account_name', account_record.account_name,
                'current_level', account_record.account_level,
                'expected_level', expected_level,
                'issue_type', 'incorrect_level'
            );
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'total_accounts', total_accounts,
        'issues_found', issues_found,
        'problematic_accounts', problematic_accounts,
        'status', CASE WHEN issues_found = 0 THEN 'healthy' ELSE 'needs_attention' END
    );
END;
$function$;

-- إصلاح الحساب 11101 مباشرة للشركة البشائر
UPDATE chart_of_accounts 
SET account_level = 4, updated_at = now()
WHERE account_code = '11101' 
AND company_id IN (
    SELECT id FROM companies WHERE name LIKE '%البشائر%' OR name LIKE '%بشائر%'
)
AND account_level = 5;