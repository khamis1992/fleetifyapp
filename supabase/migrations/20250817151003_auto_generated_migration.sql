-- إصلاح مشاكل دليل الحسابات وتصحيح المستويات

-- 1. حذف الحسابات المكررة والاحتفاظ بالأقدم
WITH duplicate_accounts AS (
    SELECT account_code, 
           MIN(created_at) as oldest_created_at,
           COUNT(*) as duplicate_count
    FROM public.chart_of_accounts 
    WHERE company_id IS NOT NULL
    GROUP BY account_code, company_id
    HAVING COUNT(*) > 1
)
DELETE FROM public.chart_of_accounts coa
WHERE EXISTS (
    SELECT 1 FROM duplicate_accounts da 
    WHERE da.account_code = coa.account_code 
    AND coa.created_at > da.oldest_created_at
);

-- 2. تحديث العلاقات الهرمية بناءً على أكواد الحسابات
-- تصحيح parent_account_id لجميع الحسابات بناءً على طول كود الحساب

-- حسابات المستوى الثاني (طول الكود = 2)
UPDATE public.chart_of_accounts 
SET parent_account_id = (
    SELECT id FROM public.chart_of_accounts parent 
    WHERE parent.account_code = LEFT(chart_of_accounts.account_code, 1)
    AND parent.company_id = chart_of_accounts.company_id
    AND parent.id != chart_of_accounts.id
    LIMIT 1
)
WHERE LENGTH(account_code) = 2 AND company_id IS NOT NULL;

-- حسابات المستوى الثالث (طول الكود = 3)
UPDATE public.chart_of_accounts 
SET parent_account_id = (
    SELECT id FROM public.chart_of_accounts parent 
    WHERE parent.account_code = LEFT(chart_of_accounts.account_code, 2)
    AND parent.company_id = chart_of_accounts.company_id
    AND parent.id != chart_of_accounts.id
    LIMIT 1
)
WHERE LENGTH(account_code) = 3 AND company_id IS NOT NULL;

-- حسابات المستوى الرابع (طول الكود = 4)
UPDATE public.chart_of_accounts 
SET parent_account_id = (
    SELECT id FROM public.chart_of_accounts parent 
    WHERE parent.account_code = LEFT(chart_of_accounts.account_code, 3)
    AND parent.company_id = chart_of_accounts.company_id
    AND parent.id != chart_of_accounts.id
    LIMIT 1
)
WHERE LENGTH(account_code) = 4 AND company_id IS NOT NULL;

-- حسابات المستوى الخامس (طول الكود = 5)
UPDATE public.chart_of_accounts 
SET parent_account_id = (
    SELECT id FROM public.chart_of_accounts parent 
    WHERE parent.account_code = LEFT(chart_of_accounts.account_code, 4)
    AND parent.company_id = chart_of_accounts.company_id
    AND parent.id != chart_of_accounts.id
    LIMIT 1
)
WHERE LENGTH(account_code) = 5 AND company_id IS NOT NULL;

-- حسابات المستوى السادس (طول الكود = 6)
UPDATE public.chart_of_accounts 
SET parent_account_id = (
    SELECT id FROM public.chart_of_accounts parent 
    WHERE parent.account_code = LEFT(chart_of_accounts.account_code, 5)
    AND parent.company_id = chart_of_accounts.company_id
    AND parent.id != chart_of_accounts.id
    LIMIT 1
)
WHERE LENGTH(account_code) = 6 AND company_id IS NOT NULL;

-- حسابات المستوى السابع (طول الكود = 7)
UPDATE public.chart_of_accounts 
SET parent_account_id = (
    SELECT id FROM public.chart_of_accounts parent 
    WHERE parent.account_code = LEFT(chart_of_accounts.account_code, 6)
    AND parent.company_id = chart_of_accounts.company_id
    AND parent.id != chart_of_accounts.id
    LIMIT 1
)
WHERE LENGTH(account_code) = 7 AND company_id IS NOT NULL;

-- 3. حذف الدالة الموجودة وإعادة إنشائها
DROP FUNCTION IF EXISTS public.calculate_account_level(uuid);

CREATE OR REPLACE FUNCTION public.calculate_account_level(account_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    level_count integer := 1;
    current_parent_id uuid;
BEGIN
    -- الحصول على معرف الحساب الأب
    SELECT parent_account_id INTO current_parent_id
    FROM public.chart_of_accounts
    WHERE id = account_id_param;
    
    -- إذا لم يكن هناك حساب أب، فهو في المستوى الأول
    IF current_parent_id IS NULL THEN
        RETURN 1;
    END IF;
    
    -- حساب المستوى بالتنقل عبر الهيكل الهرمي
    WHILE current_parent_id IS NOT NULL LOOP
        level_count := level_count + 1;
        
        SELECT parent_account_id INTO current_parent_id
        FROM public.chart_of_accounts
        WHERE id = current_parent_id;
        
        -- حماية من الحلقات اللانهائية
        IF level_count > 10 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN level_count;
END;
$$;

-- 4. تحديث مستويات جميع الحسابات
UPDATE public.chart_of_accounts 
SET account_level = public.calculate_account_level(id)
WHERE company_id IS NOT NULL;

-- 5. تحديد الحسابات الرئيسية بناءً على المستوى
UPDATE public.chart_of_accounts 
SET is_header = CASE 
    WHEN account_level < 5 THEN true 
    ELSE false 
END
WHERE company_id IS NOT NULL;

-- 6. إضافة قيود لمنع تكرار أكواد الحسابات في نفس الشركة (مع تجاهل الخطأ إذا كان موجود)
DO $$ 
BEGIN
    ALTER TABLE public.chart_of_accounts 
    ADD CONSTRAINT unique_account_code_per_company 
    UNIQUE (company_id, account_code);
EXCEPTION 
    WHEN duplicate_table THEN NULL;
END $$;

-- 7. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent_company 
ON public.chart_of_accounts (parent_account_id, company_id);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code_company 
ON public.chart_of_accounts (account_code, company_id);

-- 8. إنشاء دالة للتحقق من صحة الهيكل الهرمي
CREATE OR REPLACE FUNCTION public.validate_account_hierarchy()
RETURNS TABLE(
    account_id uuid,
    account_code varchar,
    account_name text,
    issue_type text,
    issue_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- البحث عن الحسابات التي لها parent_account_id خاطئ
    RETURN QUERY
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        'invalid_parent'::text,
        'الحساب الأب غير صحيح أو غير موجود'::text
    FROM public.chart_of_accounts coa
    WHERE coa.parent_account_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.chart_of_accounts parent
        WHERE parent.id = coa.parent_account_id
        AND parent.company_id = coa.company_id
    );
    
    -- البحث عن الحسابات التي لها مستوى خاطئ
    RETURN QUERY
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        'wrong_level'::text,
        'مستوى الحساب لا يتطابق مع الهيكل الهرمي'::text
    FROM public.chart_of_accounts coa
    WHERE coa.account_level != public.calculate_account_level(coa.id);
    
    RETURN;
END;
$$;