-- إنشاء بيانات موازنة بسيطة فقط

DO $$
DECLARE
    company_uuid uuid;
    budget_id uuid;
    account_id uuid;
BEGIN
    -- الحصول على معرف الشركة الأولى المتاحة
    SELECT id INTO company_uuid FROM companies LIMIT 1;
    
    IF company_uuid IS NOT NULL THEN
        -- البحث عن حساب مصروفات موجود
        SELECT id INTO account_id 
        FROM chart_of_accounts 
        WHERE company_id = company_uuid 
        AND account_type = 'expenses' 
        AND is_active = true 
        LIMIT 1;

        IF account_id IS NOT NULL THEN
            -- إنشاء موازنة تجريبية
            INSERT INTO budgets (
                id, company_id, budget_name, budget_year, status, 
                total_expenses, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), company_uuid, 'موازنة 2024', 2024, 'approved', 
                100000, now(), now()
            ) ON CONFLICT DO NOTHING;

            -- الحصول على معرف الموازنة
            SELECT id INTO budget_id 
            FROM budgets 
            WHERE company_id = company_uuid 
            AND budget_year = 2024 
            LIMIT 1;

            IF budget_id IS NOT NULL THEN
                -- إضافة عنصر موازنة
                INSERT INTO budget_items (
                    id, budget_id, account_id, budgeted_amount, actual_amount,
                    variance_amount, variance_percentage, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), budget_id, account_id, 50000, 65000,
                    15000, 30, now(), now()
                ) ON CONFLICT DO NOTHING;

                -- إضافة تنبيهات الموازنة
                INSERT INTO budget_alerts (
                    id, company_id, budget_id, alert_type, current_percentage,
                    threshold_percentage, message, message_ar, amount_exceeded,
                    is_acknowledged, created_at
                ) VALUES 
                (gen_random_uuid(), company_uuid, budget_id, 'budget_exceeded', 130, 100, 'Budget exceeded by 30%', 'تم تجاوز الموازنة بنسبة 30%', 15000, false, now()),
                (gen_random_uuid(), company_uuid, budget_id, 'budget_warning', 85, 80, 'Budget usage at 85%', 'استخدام الموازنة وصل إلى 85%', 0, false, now())
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;

        RAISE NOTICE 'تم إنشاء بيانات تنبيهات الموازنة للشركة: %', company_uuid;
    ELSE
        RAISE NOTICE 'لم يتم العثور على شركات في النظام';
    END IF;
END
$$;