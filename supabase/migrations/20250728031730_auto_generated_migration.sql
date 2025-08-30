-- إضافة أنواع الحسابات المفقودة لنظام ربط الحسابات
INSERT INTO public.default_account_types (
    type_code,
    type_name,
    type_name_ar,
    account_category,
    description
) VALUES 
(
    'INSURANCE_EXPENSE',
    'Insurance Expenses',
    'مصاريف التأمين',
    'Fleet & Vehicle Management',
    'Vehicle insurance premiums and related insurance costs'
),
(
    'VEHICLE_ASSETS',
    'Vehicle Assets',
    'أصول المركبات',
    'Fleet & Vehicle Management', 
    'Vehicle asset accounts for fleet management'
),
(
    'ACCUMULATED_DEPRECIATION_VEHICLES',
    'Accumulated Depreciation - Vehicles',
    'مجمع إهلاك المركبات',
    'Fleet & Vehicle Management',
    'Accumulated depreciation for vehicle assets'
),
(
    'DEPRECIATION_EXPENSE_VEHICLES',
    'Depreciation Expense - Vehicles', 
    'مصروف إهلاك المركبات',
    'Fleet & Vehicle Management',
    'Monthly depreciation expense for vehicles'
)
ON CONFLICT (type_code) DO UPDATE SET
    type_name = EXCLUDED.type_name,
    type_name_ar = EXCLUDED.type_name_ar,
    account_category = EXCLUDED.account_category,
    description = EXCLUDED.description,
    updated_at = now();

-- تحديث دالة get_mapped_account_id للتأكد من دعم جميع أنواع الحسابات الجديدة
CREATE OR REPLACE FUNCTION public.get_mapped_account_id(company_id_param uuid, account_type_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_id uuid;
BEGIN
    -- البحث عن الحساب المربوط بنوع الحساب المطلوب
    SELECT am.chart_of_accounts_id INTO account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = account_type_code
    AND am.is_active = true
    LIMIT 1;
    
    -- إذا لم يتم العثور على ربط، محاولة العثور على حساب بنفس الاسم أو الكود
    IF account_id IS NULL THEN
        -- البحث بناءً على نوع الحساب والاسم
        CASE account_type_code
            WHEN 'MAINTENANCE_EXPENSE' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'expenses'
                AND (account_name ILIKE '%maintenance%' OR account_name ILIKE '%صيانة%')
                AND is_active = true
                LIMIT 1;
                
            WHEN 'INSURANCE_EXPENSE' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'expenses'
                AND (account_name ILIKE '%insurance%' OR account_name ILIKE '%تأمين%')
                AND is_active = true
                LIMIT 1;
                
            WHEN 'FUEL_EXPENSE' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'expenses'
                AND (account_name ILIKE '%fuel%' OR account_name ILIKE '%وقود%' OR account_name ILIKE '%benzin%')
                AND is_active = true
                LIMIT 1;
                
            WHEN 'PENALTY_EXPENSE' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'expenses'
                AND (account_name ILIKE '%penalty%' OR account_name ILIKE '%fine%' OR account_name ILIKE '%مخالفة%' OR account_name ILIKE '%غرامة%')
                AND is_active = true
                LIMIT 1;
                
            WHEN 'VEHICLE_ASSETS' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'assets'
                AND (account_name ILIKE '%vehicle%' OR account_name ILIKE '%مركبة%' OR account_name ILIKE '%equipment%')
                AND is_active = true
                LIMIT 1;
                
            WHEN 'ACCUMULATED_DEPRECIATION_VEHICLES' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'assets'
                AND (account_name ILIKE '%accumulated%depreciation%' OR account_name ILIKE '%مجمع%إهلاك%')
                AND is_active = true
                LIMIT 1;
                
            WHEN 'DEPRECIATION_EXPENSE_VEHICLES' THEN
                SELECT id INTO account_id
                FROM public.chart_of_accounts
                WHERE company_id = company_id_param
                AND account_type = 'expenses'
                AND (account_name ILIKE '%depreciation%' OR account_name ILIKE '%إهلاك%')
                AND is_active = true
                LIMIT 1;
                
            ELSE
                -- البحث العام لأنواع الحسابات الأخرى
                NULL;
        END CASE;
    END IF;
    
    RETURN account_id;
END;
$function$;