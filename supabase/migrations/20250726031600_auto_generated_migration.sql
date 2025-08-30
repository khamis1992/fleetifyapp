-- إصلاح مشكلة السجلات المكررة للموظف خميس الجابر
-- سنحذف السجلات غير النشطة ونحتفظ بالسجل النشط الأخير فقط

-- حذف السجلات المكررة غير النشطة للموظف خميس الجابر
DELETE FROM public.employees 
WHERE email = 'khamis-1992@hotmail.com' 
AND is_active = false;

-- التأكد من عدم وجود سجلات مكررة نشطة للموظف
-- (يجب أن يكون هناك سجل واحد نشط فقط)

-- إضافة قيد فريد لمنع تكرار البريد الإلكتروني في المستقبل
-- (إذا لم يكن موجوداً بالفعل)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'employees_email_unique' 
        AND table_name = 'employees'
    ) THEN
        ALTER TABLE public.employees 
        ADD CONSTRAINT employees_email_unique UNIQUE (email);
    END IF;
END $$;

-- إضافة قيد فريد لمنع تكرار رقم الموظف في نفس الشركة
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'employees_number_company_unique' 
        AND table_name = 'employees'
    ) THEN
        ALTER TABLE public.employees 
        ADD CONSTRAINT employees_number_company_unique UNIQUE (employee_number, company_id);
    END IF;
END $$;