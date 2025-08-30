-- إنشاء بيانات اختبار للتنبيهات بقيم مقبولة

DO $$
DECLARE
    company_uuid uuid;
    vehicle_id uuid;
    budget_id uuid;
    account_id uuid;
BEGIN
    -- الحصول على معرف الشركة الأولى المتاحة
    SELECT id INTO company_uuid FROM companies LIMIT 1;
    
    IF company_uuid IS NOT NULL THEN
        -- إضافة مركبات تجريبية
        INSERT INTO vehicles (
            id, company_id, plate_number, make, model, year, status, 
            purchase_cost, registration_expiry, insurance_expiry,
            created_at, updated_at
        ) VALUES 
        (gen_random_uuid(), company_uuid, 'A-123-45', 'تويوتا', 'كامري', 2020, 'available', 15000, CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '10 days', now(), now()),
        (gen_random_uuid(), company_uuid, 'B-678-90', 'نيسان', 'التيما', 2019, 'available', 18000, CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '30 days', now(), now()),
        (gen_random_uuid(), company_uuid, 'C-111-22', 'هوندا', 'أكورد', 2021, 'maintenance', 20000, CURRENT_DATE + INTERVAL '60 days', CURRENT_DATE + INTERVAL '45 days', now(), now())
        ON CONFLICT (plate_number, company_id) DO NOTHING;

        -- الحصول على معرف مركبة للتنبيهات
        SELECT id INTO vehicle_id FROM vehicles WHERE company_id = company_uuid LIMIT 1;

        -- إضافة تنبيهات المركبات بقيم مقبولة
        IF vehicle_id IS NOT NULL THEN
            INSERT INTO vehicle_alerts (
                id, company_id, vehicle_id, alert_type, alert_title, alert_message,
                priority, due_date, is_acknowledged, created_at
            ) VALUES 
            (gen_random_uuid(), company_uuid, vehicle_id, 'maintenance', 'صيانة مستحقة', 'صيانة دورية مطلوبة للمركبة A-123-45', 'high', CURRENT_DATE + INTERVAL '3 days', false, now()),
            (gen_random_uuid(), company_uuid, vehicle_id, 'insurance', 'انتهاء التأمين', 'تأمين المركبة B-678-90 ينتهي خلال 10 أيام', 'high', CURRENT_DATE + INTERVAL '10 days', false, now()),
            (gen_random_uuid(), company_uuid, vehicle_id, 'license', 'انتهاء التسجيل', 'تسجيل المركبة A-123-45 ينتهي خلال 15 يوم', 'medium', CURRENT_DATE + INTERVAL '15 days', false, now())
            ON CONFLICT DO NOTHING;
        END IF;

        -- إنشاء موازنة تجريبية وتنبيهات الموازنة
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

        RAISE NOTICE 'تم إنشاء بيانات اختبار التنبيهات للشركة: %', company_uuid;
    ELSE
        RAISE NOTICE 'لم يتم العثور على شركات في النظام';
    END IF;
END
$$;