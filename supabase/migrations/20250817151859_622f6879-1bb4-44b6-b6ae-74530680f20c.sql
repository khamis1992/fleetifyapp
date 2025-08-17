-- إضافة وظائف للتحقق من صحة الهيكل الهرمي وإصلاح المشاكل

-- 1. وظيفة للتحقق من صحة الهيكل الهرمي
CREATE OR REPLACE FUNCTION public.validate_chart_hierarchy(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    orphaned_accounts integer;
    circular_references integer;
    incorrect_levels integer;
    duplicate_codes integer;
    missing_parents integer;
    result jsonb;
BEGIN
    -- عد الحسابات اليتيمة (لها أب غير موجود)
    SELECT COUNT(*) INTO orphaned_accounts
    FROM chart_of_accounts c1
    WHERE c1.company_id = company_id_param
    AND c1.parent_account_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts c2 
        WHERE c2.id = c1.parent_account_id 
        AND c2.company_id = company_id_param
        AND c2.is_active = true
    );
    
    -- عد المراجع الدائرية (الحسابات التي تشير لنفسها في السلسلة)
    WITH RECURSIVE account_path AS (
        SELECT id, parent_account_id, account_code, 1 as depth, ARRAY[id] as path
        FROM chart_of_accounts
        WHERE company_id = company_id_param AND is_active = true
        
        UNION ALL
        
        SELECT c.id, c.parent_account_id, c.account_code, ap.depth + 1, ap.path || c.id
        FROM chart_of_accounts c
        JOIN account_path ap ON c.parent_account_id = ap.id
        WHERE c.company_id = company_id_param 
        AND c.is_active = true
        AND c.id = ANY(ap.path) = false
        AND ap.depth < 10
    )
    SELECT COUNT(DISTINCT id) INTO circular_references
    FROM account_path
    WHERE id = ANY(path[1:array_length(path,1)-1]);
    
    -- عد المستويات الخاطئة
    SELECT COUNT(*) INTO incorrect_levels
    FROM chart_of_accounts c1
    LEFT JOIN chart_of_accounts c2 ON c1.parent_account_id = c2.id
    WHERE c1.company_id = company_id_param
    AND c1.is_active = true
    AND (
        (c1.parent_account_id IS NULL AND c1.account_level != 1) OR
        (c1.parent_account_id IS NOT NULL AND c2.account_level IS NOT NULL AND c1.account_level != c2.account_level + 1)
    );
    
    -- عد الأكواد المكررة
    SELECT COUNT(*) - COUNT(DISTINCT account_code) INTO duplicate_codes
    FROM chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true;
    
    -- عد الحسابات التي تحتاج أب ولكن لا تملك واحد
    SELECT COUNT(*) INTO missing_parents
    FROM chart_of_accounts
    WHERE company_id = company_id_param
    AND is_active = true
    AND parent_account_id IS NULL
    AND account_level > 1;
    
    result := jsonb_build_object(
        'is_valid', (orphaned_accounts + circular_references + incorrect_levels + duplicate_codes + missing_parents) = 0,
        'issues', jsonb_build_object(
            'orphaned_accounts', orphaned_accounts,
            'circular_references', circular_references,
            'incorrect_levels', incorrect_levels,
            'duplicate_codes', duplicate_codes,
            'missing_parents', missing_parents
        ),
        'total_issues', orphaned_accounts + circular_references + incorrect_levels + duplicate_codes + missing_parents
    );
    
    RETURN result;
END;
$$;

-- 2. وظيفة لإصلاح المشاكل الهرمية
CREATE OR REPLACE FUNCTION public.fix_chart_hierarchy(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    fixed_count integer := 0;
    result jsonb;
BEGIN
    -- إصلاح الحسابات اليتيمة (نقلها للمستوى الأول)
    UPDATE chart_of_accounts 
    SET parent_account_id = NULL, account_level = 1
    WHERE company_id = company_id_param
    AND parent_account_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts c2 
        WHERE c2.id = chart_of_accounts.parent_account_id 
        AND c2.company_id = company_id_param
        AND c2.is_active = true
    );
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    -- إعادة حساب المستويات
    PERFORM public.recalculate_account_levels(company_id_param);
    
    result := jsonb_build_object(
        'success', true,
        'fixed_orphaned', fixed_count,
        'levels_recalculated', true
    );
    
    RETURN result;
END;
$$;

-- 3. وظيفة لاقتراح كود الحساب التالي
CREATE OR REPLACE FUNCTION public.suggest_next_account_code(
    company_id_param uuid,
    parent_account_id_param uuid DEFAULT NULL,
    account_type_param text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    base_code text;
    parent_code text;
    next_sequence integer;
    suggested_code text;
    account_level_val integer;
BEGIN
    -- إذا كان هناك حساب أب، احصل على كوده ومستواه
    IF parent_account_id_param IS NOT NULL THEN
        SELECT account_code, account_level INTO parent_code, account_level_val
        FROM chart_of_accounts
        WHERE id = parent_account_id_param AND company_id = company_id_param;
        
        IF parent_code IS NOT NULL THEN
            base_code := parent_code;
            account_level_val := account_level_val + 1;
        END IF;
    ELSE
        -- حساب جذر، ابدأ بكود أساسي حسب نوع الحساب
        CASE account_type_param
            WHEN 'assets' THEN base_code := '1';
            WHEN 'liabilities' THEN base_code := '2';
            WHEN 'equity' THEN base_code := '3';
            WHEN 'revenue' THEN base_code := '4';
            WHEN 'expenses' THEN base_code := '5';
            ELSE base_code := '9';
        END CASE;
        account_level_val := 1;
    END IF;
    
    -- ابحث عن التسلسل التالي المتاح
    SELECT COALESCE(MAX(
        CASE 
            WHEN account_code ~ ('^' || base_code || '[0-9]+$') THEN
                substring(account_code from length(base_code) + 1)::integer
            ELSE 0
        END
    ), 0) + 1 INTO next_sequence
    FROM chart_of_accounts
    WHERE company_id = company_id_param
    AND account_code LIKE base_code || '%'
    AND is_active = true;
    
    -- اقترح الكود
    suggested_code := base_code || LPAD(next_sequence::text, account_level_val, '0');
    
    RETURN suggested_code;
END;
$$;

-- 4. وظيفة لإنشاء حساب ذكي مع التحقق
CREATE OR REPLACE FUNCTION public.create_smart_account(
    company_id_param uuid,
    account_name_param text,
    account_name_ar_param text DEFAULT NULL,
    account_type_param text DEFAULT 'assets',
    parent_account_id_param uuid DEFAULT NULL,
    auto_generate_code boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_id uuid;
    account_code_val text;
    account_level_val integer := 1;
    balance_type_val text;
    parent_level integer;
BEGIN
    -- تحديد نوع الرصيد تلقائياً
    CASE account_type_param
        WHEN 'assets', 'expenses' THEN balance_type_val := 'debit';
        WHEN 'liabilities', 'equity', 'revenue' THEN balance_type_val := 'credit';
        ELSE balance_type_val := 'debit';
    END CASE;
    
    -- تحديد المستوى
    IF parent_account_id_param IS NOT NULL THEN
        SELECT account_level INTO parent_level
        FROM chart_of_accounts
        WHERE id = parent_account_id_param AND company_id = company_id_param;
        
        IF parent_level IS NOT NULL THEN
            account_level_val := parent_level + 1;
        END IF;
    END IF;
    
    -- توليد كود الحساب
    IF auto_generate_code THEN
        account_code_val := public.suggest_next_account_code(
            company_id_param, 
            parent_account_id_param, 
            account_type_param
        );
    ELSE
        RAISE EXCEPTION 'يجب توفير كود الحساب';
    END IF;
    
    -- إنشاء الحساب
    INSERT INTO chart_of_accounts (
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        balance_type,
        parent_account_id,
        account_level,
        is_header,
        is_active,
        current_balance
    ) VALUES (
        company_id_param,
        account_code_val,
        account_name_param,
        account_name_ar_param,
        account_type_param,
        balance_type_val,
        parent_account_id_param,
        account_level_val,
        false,
        true,
        0
    ) RETURNING id INTO account_id;
    
    RETURN account_id;
END;
$$;

-- 5. وظيفة لإحصائيات دليل الحسابات
CREATE OR REPLACE FUNCTION public.get_chart_statistics(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    stats jsonb;
    total_accounts integer;
    active_accounts integer;
    accounts_by_type jsonb;
    accounts_by_level jsonb;
    header_accounts integer;
    detail_accounts integer;
    max_depth integer;
    avg_depth numeric;
BEGIN
    -- إجمالي الحسابات
    SELECT COUNT(*) INTO total_accounts
    FROM chart_of_accounts
    WHERE company_id = company_id_param;
    
    -- الحسابات النشطة
    SELECT COUNT(*) INTO active_accounts
    FROM chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true;
    
    -- الحسابات حسب النوع
    SELECT jsonb_object_agg(account_type, count) INTO accounts_by_type
    FROM (
        SELECT account_type, COUNT(*) as count
        FROM chart_of_accounts
        WHERE company_id = company_id_param AND is_active = true
        GROUP BY account_type
    ) t;
    
    -- الحسابات حسب المستوى
    SELECT jsonb_object_agg(account_level::text, count) INTO accounts_by_level
    FROM (
        SELECT account_level, COUNT(*) as count
        FROM chart_of_accounts
        WHERE company_id = company_id_param AND is_active = true
        GROUP BY account_level
        ORDER BY account_level
    ) t;
    
    -- الحسابات الإجمالية والتفصيلية
    SELECT 
        COUNT(*) FILTER (WHERE is_header = true),
        COUNT(*) FILTER (WHERE is_header = false)
    INTO header_accounts, detail_accounts
    FROM chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true;
    
    -- أعمق مستوى
    SELECT COALESCE(MAX(account_level), 0) INTO max_depth
    FROM chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true;
    
    -- متوسط العمق
    SELECT COALESCE(AVG(account_level), 0) INTO avg_depth
    FROM chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true;
    
    stats := jsonb_build_object(
        'total_accounts', total_accounts,
        'active_accounts', active_accounts,
        'inactive_accounts', total_accounts - active_accounts,
        'accounts_by_type', COALESCE(accounts_by_type, '{}'::jsonb),
        'accounts_by_level', COALESCE(accounts_by_level, '{}'::jsonb),
        'header_accounts', header_accounts,
        'detail_accounts', detail_accounts,
        'max_depth', max_depth,
        'avg_depth', ROUND(avg_depth, 2)
    );
    
    RETURN stats;
END;
$$;