-- Update copy_selected_accounts_to_company to handle deep hierarchies and ensure proper ordering
CREATE OR REPLACE FUNCTION public.copy_selected_accounts_to_company(
    target_company_id uuid, 
    selected_account_codes text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_record RECORD;
    new_account_id UUID;
    parent_account_uuid UUID;
    max_iterations INTEGER := 10; -- Prevent infinite loops
    iteration_count INTEGER := 0;
    remaining_accounts INTEGER;
    processed_count INTEGER := 0;
    total_accounts INTEGER;
BEGIN
    -- التحقق من وجود الشركة
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = target_company_id) THEN
        RAISE EXCEPTION 'الشركة غير موجودة';
    END IF;

    -- عد إجمالي الحسابات المطلوب نسخها
    SELECT COUNT(*) INTO total_accounts
    FROM default_chart_of_accounts 
    WHERE account_code = ANY(selected_account_codes);

    -- معالجة الحسابات بالتكرار لضمان معالجة العلاقات الأب/الفرع بشكل صحيح
    WHILE iteration_count < max_iterations LOOP
        iteration_count := iteration_count + 1;
        
        -- عد الحسابات المتبقية
        SELECT COUNT(*) INTO remaining_accounts
        FROM default_chart_of_accounts da
        WHERE da.account_code = ANY(selected_account_codes)
        AND NOT EXISTS (
            SELECT 1 FROM chart_of_accounts ca
            WHERE ca.company_id = target_company_id 
            AND ca.account_code = da.account_code
        );
        
        -- إذا لم تعد هناك حسابات متبقية، اخرج من الحلقة
        IF remaining_accounts = 0 THEN
            EXIT;
        END IF;
        
        -- معالجة الحسابات المحددة مع ترتيب دقيق
        FOR account_record IN 
            SELECT da.* 
            FROM default_chart_of_accounts da
            WHERE da.account_code = ANY(selected_account_codes)
            AND NOT EXISTS (
                SELECT 1 FROM chart_of_accounts ca
                WHERE ca.company_id = target_company_id 
                AND ca.account_code = da.account_code
            )
            ORDER BY 
                da.account_level ASC,          -- المستوى أولاً (1,2,3,4,5,6)
                LENGTH(da.account_code) ASC,   -- طول الكود ثانياً (أقصر أولاً)
                da.account_code ASC            -- الكود أبجدياً ثالثاً
        LOOP
            -- البحث عن الحساب الأب إذا كان موجوداً
            parent_account_uuid := NULL;
            IF account_record.parent_account_code IS NOT NULL THEN
                SELECT id INTO parent_account_uuid
                FROM chart_of_accounts 
                WHERE company_id = target_company_id 
                AND account_code = account_record.parent_account_code;
                
                -- إذا لم يتم العثور على الحساب الأب، تخطى هذا الحساب في هذا التكرار
                IF parent_account_uuid IS NULL THEN
                    CONTINUE;
                END IF;
            END IF;
            
            -- إدراج الحساب الجديد
            INSERT INTO chart_of_accounts (
                company_id,
                account_code,
                account_name,
                account_name_ar,
                account_type,
                account_subtype,
                balance_type,
                account_level,
                is_header,
                is_system,
                description,
                sort_order,
                parent_account_id,
                current_balance,
                is_active
            ) VALUES (
                target_company_id,
                account_record.account_code,
                account_record.account_name,
                account_record.account_name_ar,
                account_record.account_type,
                account_record.account_subtype,
                account_record.balance_type,
                account_record.account_level,
                account_record.is_header,
                account_record.is_system,
                account_record.description,
                account_record.sort_order,
                parent_account_uuid,
                0, -- رصيد ابتدائي صفر
                true -- نشط
            );
            
            processed_count := processed_count + 1;
        END LOOP;
        
        -- إذا لم تتم معالجة أي حسابات في هذا التكرار، توقف
        IF processed_count = 0 THEN
            EXIT;
        END IF;
        
        processed_count := 0; -- إعادة تعيين للتكرار التالي
    END LOOP;
    
    -- التحقق النهائي من المعالجة
    SELECT COUNT(*) INTO remaining_accounts
    FROM default_chart_of_accounts da
    WHERE da.account_code = ANY(selected_account_codes)
    AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts ca
        WHERE ca.company_id = target_company_id 
        AND ca.account_code = da.account_code
    );
    
    -- رفع استثناء إذا بقيت حسابات غير مُعالجة
    IF remaining_accounts > 0 THEN
        RAISE EXCEPTION 'فشل في معالجة % حساب من أصل %. تحقق من صحة علاقات الحسابات الأب/الفرع.', 
            remaining_accounts, total_accounts;
    END IF;
    
END;
$function$;

-- Now add all missing Level 6 accounts from the car rental template to default_chart_of_accounts
-- Individual Customer Accounts (Level 6)
INSERT INTO default_chart_of_accounts (
    account_code, account_name, account_name_ar, account_type, account_subtype,
    balance_type, parent_account_code, account_level, is_header, is_system, description, sort_order
) VALUES
-- Individual customers under أحمد محمد علي (112101)
('112101001', 'Ahmed Mohammed Ali - Account 1', 'أحمد محمد علي - حساب 1', 'asset', 'accounts_receivable', 'debit', '112101', 6, false, false, 'Individual customer account', 1),
('112101002', 'Ahmed Mohammed Ali - Account 2', 'أحمد محمد علي - حساب 2', 'asset', 'accounts_receivable', 'debit', '112101', 6, false, false, 'Individual customer account', 2),
('112101003', 'Ahmed Mohammed Ali - Account 3', 'أحمد محمد علي - حساب 3', 'asset', 'accounts_receivable', 'debit', '112101', 6, false, false, 'Individual customer account', 3),
('112101004', 'Ahmed Mohammed Ali - Account 4', 'أحمد محمد علي - حساب 4', 'asset', 'accounts_receivable', 'debit', '112101', 6, false, false, 'Individual customer account', 4),
('112101005', 'Ahmed Mohammed Ali - Account 5', 'أحمد محمد علي - حساب 5', 'asset', 'accounts_receivable', 'debit', '112101', 6, false, false, 'Individual customer account', 5),

-- Individual customers under فاطمة سالم حسن (112102)
('112102001', 'Fatma Salem Hassan - Account 1', 'فاطمة سالم حسن - حساب 1', 'asset', 'accounts_receivable', 'debit', '112102', 6, false, false, 'Individual customer account', 1),
('112102002', 'Fatma Salem Hassan - Account 2', 'فاطمة سالم حسن - حساب 2', 'asset', 'accounts_receivable', 'debit', '112102', 6, false, false, 'Individual customer account', 2),
('112102003', 'Fatma Salem Hassan - Account 3', 'فاطمة سالم حسن - حساب 3', 'asset', 'accounts_receivable', 'debit', '112102', 6, false, false, 'Individual customer account', 3),
('112102004', 'Fatma Salem Hassan - Account 4', 'فاطمة سالم حسن - حساب 4', 'asset', 'accounts_receivable', 'debit', '112102', 6, false, false, 'Individual customer account', 4),
('112102005', 'Fatma Salem Hassan - Account 5', 'فاطمة سالم حسن - حساب 5', 'asset', 'accounts_receivable', 'debit', '112102', 6, false, false, 'Individual customer account', 5),

-- Individual customers under خالد عبدالله أحمد (112103)
('112103001', 'Khalid Abdullah Ahmed - Account 1', 'خالد عبدالله أحمد - حساب 1', 'asset', 'accounts_receivable', 'debit', '112103', 6, false, false, 'Individual customer account', 1),
('112103002', 'Khalid Abdullah Ahmed - Account 2', 'خالد عبدالله أحمد - حساب 2', 'asset', 'accounts_receivable', 'debit', '112103', 6, false, false, 'Individual customer account', 2),
('112103003', 'Khalid Abdullah Ahmed - Account 3', 'خالد عبدالله أحمد - حساب 3', 'asset', 'accounts_receivable', 'debit', '112103', 6, false, false, 'Individual customer account', 3),
('112103004', 'Khalid Abdullah Ahmed - Account 4', 'خالد عبدالله أحمد - حساب 4', 'asset', 'accounts_receivable', 'debit', '112103', 6, false, false, 'Individual customer account', 4),
('112103005', 'Khalid Abdullah Ahmed - Account 5', 'خالد عبدالله أحمد - حساب 5', 'asset', 'accounts_receivable', 'debit', '112103', 6, false, false, 'Individual customer account', 5),

-- Individual customers under نورا عبدالعزيز محمد (112104)
('112104001', 'Nora Abdulaziz Mohammed - Account 1', 'نورا عبدالعزيز محمد - حساب 1', 'asset', 'accounts_receivable', 'debit', '112104', 6, false, false, 'Individual customer account', 1),
('112104002', 'Nora Abdulaziz Mohammed - Account 2', 'نورا عبدالعزيز محمد - حساب 2', 'asset', 'accounts_receivable', 'debit', '112104', 6, false, false, 'Individual customer account', 2),
('112104003', 'Nora Abdulaziz Mohammed - Account 3', 'نورا عبدالعزيز محمد - حساب 3', 'asset', 'accounts_receivable', 'debit', '112104', 6, false, false, 'Individual customer account', 3),
('112104004', 'Nora Abdulaziz Mohammed - Account 4', 'نورا عبدالعزيز محمد - حساب 4', 'asset', 'accounts_receivable', 'debit', '112104', 6, false, false, 'Individual customer account', 4),
('112104005', 'Nora Abdulaziz Mohammed - Account 5', 'نورا عبدالعزيز محمد - حساب 5', 'asset', 'accounts_receivable', 'debit', '112104', 6, false, false, 'Individual customer account', 5),

-- Individual customers under عبدالرحمن يوسف سالم (112105)
('112105001', 'Abdulrahman Youssef Salem - Account 1', 'عبدالرحمن يوسف سالم - حساب 1', 'asset', 'accounts_receivable', 'debit', '112105', 6, false, false, 'Individual customer account', 1),
('112105002', 'Abdulrahman Youssef Salem - Account 2', 'عبدالرحمن يوسف سالم - حساب 2', 'asset', 'accounts_receivable', 'debit', '112105', 6, false, false, 'Individual customer account', 2),
('112105003', 'Abdulrahman Youssef Salem - Account 3', 'عبدالرحمن يوسف سالم - حساب 3', 'asset', 'accounts_receivable', 'debit', '112105', 6, false, false, 'Individual customer account', 3),
('112105004', 'Abdulrahman Youssef Salem - Account 4', 'عبدالرحمن يوسف سالم - حساب 4', 'asset', 'accounts_receivable', 'debit', '112105', 6, false, false, 'Individual customer account', 4),
('112105005', 'Abdulrahman Youssef Salem - Account 5', 'عبدالرحمن يوسف سالم - حساب 5', 'asset', 'accounts_receivable', 'debit', '112105', 6, false, false, 'Individual customer account', 5),

-- Individual customers under سارة حسام الدين علي (112106)
('112106001', 'Sara Hussamuddin Ali - Account 1', 'سارة حسام الدين علي - حساب 1', 'asset', 'accounts_receivable', 'debit', '112106', 6, false, false, 'Individual customer account', 1),
('112106002', 'Sara Hussamuddin Ali - Account 2', 'سارة حسام الدين علي - حساب 2', 'asset', 'accounts_receivable', 'debit', '112106', 6, false, false, 'Individual customer account', 2),
('112106003', 'Sara Hussamuddin Ali - Account 3', 'سارة حسام الدين علي - حساب 3', 'asset', 'accounts_receivable', 'debit', '112106', 6, false, false, 'Individual customer account', 3),
('112106004', 'Sara Hussamuddin Ali - Account 4', 'سارة حسام الدين علي - حساب 4', 'asset', 'accounts_receivable', 'debit', '112106', 6, false, false, 'Individual customer account', 4),
('112106005', 'Sara Hussamuddin Ali - Account 5', 'سارة حسام الدين علي - حساب 5', 'asset', 'accounts_receivable', 'debit', '112106', 6, false, false, 'Individual customer account', 5),

-- Individual customers under محمد فهد الأحمد (112107)
('112107001', 'Mohammed Fahd Al-Ahmad - Account 1', 'محمد فهد الأحمد - حساب 1', 'asset', 'accounts_receivable', 'debit', '112107', 6, false, false, 'Individual customer account', 1),
('112107002', 'Mohammed Fahd Al-Ahmad - Account 2', 'محمد فهد الأحمد - حساب 2', 'asset', 'accounts_receivable', 'debit', '112107', 6, false, false, 'Individual customer account', 2),
('112107003', 'Mohammed Fahd Al-Ahmad - Account 3', 'محمد فهد الأحمد - حساب 3', 'asset', 'accounts_receivable', 'debit', '112107', 6, false, false, 'Individual customer account', 3),
('112107004', 'Mohammed Fahd Al-Ahmad - Account 4', 'محمد فهد الأحمد - حساب 4', 'asset', 'accounts_receivable', 'debit', '112107', 6, false, false, 'Individual customer account', 4),
('112107005', 'Mohammed Fahd Al-Ahmad - Account 5', 'محمد فهد الأحمد - حساب 5', 'asset', 'accounts_receivable', 'debit', '112107', 6, false, false, 'Individual customer account', 5),

-- Individual customers under لينا عادل ناصر (112108)
('112108001', 'Lina Adel Nasser - Account 1', 'لينا عادل ناصر - حساب 1', 'asset', 'accounts_receivable', 'debit', '112108', 6, false, false, 'Individual customer account', 1),
('112108002', 'Lina Adel Nasser - Account 2', 'لينا عادل ناصر - حساب 2', 'asset', 'accounts_receivable', 'debit', '112108', 6, false, false, 'Individual customer account', 2),
('112108003', 'Lina Adel Nasser - Account 3', 'لينا عادل ناصر - حساب 3', 'asset', 'accounts_receivable', 'debit', '112108', 6, false, false, 'Individual customer account', 3),
('112108004', 'Lina Adel Nasser - Account 4', 'لينا عادل ناصر - حساب 4', 'asset', 'accounts_receivable', 'debit', '112108', 6, false, false, 'Individual customer account', 4),
('112108005', 'Lina Adel Nasser - Account 5', 'لينا عادل ناصر - حساب 5', 'asset', 'accounts_receivable', 'debit', '112108', 6, false, false, 'Individual customer account', 5),

-- Individual customers under ياسر محمد الغانم (112109)
('112109001', 'Yasser Mohammed Al-Ghanem - Account 1', 'ياسر محمد الغانم - حساب 1', 'asset', 'accounts_receivable', 'debit', '112109', 6, false, false, 'Individual customer account', 1),
('112109002', 'Yasser Mohammed Al-Ghanem - Account 2', 'ياسر محمد الغانم - حساب 2', 'asset', 'accounts_receivable', 'debit', '112109', 6, false, false, 'Individual customer account', 2),
('112109003', 'Yasser Mohammed Al-Ghanem - Account 3', 'ياسر محمد الغانم - حساب 3', 'asset', 'accounts_receivable', 'debit', '112109', 6, false, false, 'Individual customer account', 3),
('112109004', 'Yasser Mohammed Al-Ghanem - Account 4', 'ياسر محمد الغانم - حساب 4', 'asset', 'accounts_receivable', 'debit', '112109', 6, false, false, 'Individual customer account', 4),
('112109005', 'Yasser Mohammed Al-Ghanem - Account 5', 'ياسر محمد الغانم - حساب 5', 'asset', 'accounts_receivable', 'debit', '112109', 6, false, false, 'Individual customer account', 5),

-- Individual customers under هند صالح العتيبي (112110)
('112110001', 'Hind Saleh Al-Otaibi - Account 1', 'هند صالح العتيبي - حساب 1', 'asset', 'accounts_receivable', 'debit', '112110', 6, false, false, 'Individual customer account', 1),
('112110002', 'Hind Saleh Al-Otaibi - Account 2', 'هند صالح العتيبي - حساب 2', 'asset', 'accounts_receivable', 'debit', '112110', 6, false, false, 'Individual customer account', 2),
('112110003', 'Hind Saleh Al-Otaibi - Account 3', 'هند صالح العتيبي - حساب 3', 'asset', 'accounts_receivable', 'debit', '112110', 6, false, false, 'Individual customer account', 3),
('112110004', 'Hind Saleh Al-Otaibi - Account 4', 'هند صالح العتيبي - حساب 4', 'asset', 'accounts_receivable', 'debit', '112110', 6, false, false, 'Individual customer account', 4),
('112110005', 'Hind Saleh Al-Otaibi - Account 5', 'هند صالح العتيبي - حساب 5', 'asset', 'accounts_receivable', 'debit', '112110', 6, false, false, 'Individual customer account', 5),

-- Individual customers under عبدالله راشد المطيري (112111)
('112111001', 'Abdullah Rashid Al-Mutairi - Account 1', 'عبدالله راشد المطيري - حساب 1', 'asset', 'accounts_receivable', 'debit', '112111', 6, false, false, 'Individual customer account', 1),
('112111002', 'Abdullah Rashid Al-Mutairi - Account 2', 'عبدالله راشد المطيري - حساب 2', 'asset', 'accounts_receivable', 'debit', '112111', 6, false, false, 'Individual customer account', 2),
('112111003', 'Abdullah Rashid Al-Mutairi - Account 3', 'عبدالله راشد المطيري - حساب 3', 'asset', 'accounts_receivable', 'debit', '112111', 6, false, false, 'Individual customer account', 3),
('112111004', 'Abdullah Rashid Al-Mutairi - Account 4', 'عبدالله راشد المطيري - حساب 4', 'asset', 'accounts_receivable', 'debit', '112111', 6, false, false, 'Individual customer account', 4),
('112111005', 'Abdullah Rashid Al-Mutairi - Account 5', 'عبدالله راشد المطيري - حساب 5', 'asset', 'accounts_receivable', 'debit', '112111', 6, false, false, 'Individual customer account', 5),

-- Individual customers under رنا خالد الشمري (112112)
('112112001', 'Rana Khalid Al-Shamari - Account 1', 'رنا خالد الشمري - حساب 1', 'asset', 'accounts_receivable', 'debit', '112112', 6, false, false, 'Individual customer account', 1),
('112112002', 'Rana Khalid Al-Shamari - Account 2', 'رنا خالد الشمري - حساب 2', 'asset', 'accounts_receivable', 'debit', '112112', 6, false, false, 'Individual customer account', 2),
('112112003', 'Rana Khalid Al-Shamari - Account 3', 'رنا خالد الشمري - حساب 3', 'asset', 'accounts_receivable', 'debit', '112112', 6, false, false, 'Individual customer account', 3),
('112112004', 'Rana Khalid Al-Shamari - Account 4', 'رنا خالد الشمري - حساب 4', 'asset', 'accounts_receivable', 'debit', '112112', 6, false, false, 'Individual customer account', 4),
('112112005', 'Rana Khalid Al-Shamari - Account 5', 'رنا خالد الشمري - حساب 5', 'asset', 'accounts_receivable', 'debit', '112112', 6, false, false, 'Individual customer account', 5),

-- Individual customers under طارق نواف الرشيد (112113)
('112113001', 'Tarek Nawaf Al-Rashid - Account 1', 'طارق نواف الرشيد - حساب 1', 'asset', 'accounts_receivable', 'debit', '112113', 6, false, false, 'Individual customer account', 1),
('112113002', 'Tarek Nawaf Al-Rashid - Account 2', 'طارق نواف الرشيد - حساب 2', 'asset', 'accounts_receivable', 'debit', '112113', 6, false, false, 'Individual customer account', 2),
('112113003', 'Tarek Nawaf Al-Rashid - Account 3', 'طارق نواف الرشيد - حساب 3', 'asset', 'accounts_receivable', 'debit', '112113', 6, false, false, 'Individual customer account', 3),
('112113004', 'Tarek Nawaf Al-Rashid - Account 4', 'طارق نواف الرشيد - حساب 4', 'asset', 'accounts_receivable', 'debit', '112113', 6, false, false, 'Individual customer account', 4),
('112113005', 'Tarek Nawaf Al-Rashid - Account 5', 'طارق نواف الرشيد - حساب 5', 'asset', 'accounts_receivable', 'debit', '112113', 6, false, false, 'Individual customer account', 5),

-- Individual customers under مريم أحمد الفارس (112114)
('112114001', 'Maryam Ahmed Al-Fares - Account 1', 'مريم أحمد الفارس - حساب 1', 'asset', 'accounts_receivable', 'debit', '112114', 6, false, false, 'Individual customer account', 1),
('112114002', 'Maryam Ahmed Al-Fares - Account 2', 'مريم أحمد الفارس - حساب 2', 'asset', 'accounts_receivable', 'debit', '112114', 6, false, false, 'Individual customer account', 2),
('112114003', 'Maryam Ahmed Al-Fares - Account 3', 'مريم أحمد الفارس - حساب 3', 'asset', 'accounts_receivable', 'debit', '112114', 6, false, false, 'Individual customer account', 3),
('112114004', 'Maryam Ahmed Al-Fares - Account 4', 'مريم أحمد الفارس - حساب 4', 'asset', 'accounts_receivable', 'debit', '112114', 6, false, false, 'Individual customer account', 4),
('112114005', 'Maryam Ahmed Al-Fares - Account 5', 'مريم أحمد الفارس - حساب 5', 'asset', 'accounts_receivable', 'debit', '112114', 6, false, false, 'Individual customer account', 5),

-- Individual Vehicle Accounts (Level 6) - 15 accounts under vehicle subcategories
-- Toyota vehicles under تويوتا (115101)
('115101001', 'Toyota Camry 2023 - ABC123', 'تويوتا كامري 2023 - ABC123', 'asset', 'fixed_asset', 'debit', '115101', 6, false, false, 'Individual vehicle asset account', 1),
('115101002', 'Toyota Corolla 2023 - ABC124', 'تويوتا كورولا 2023 - ABC124', 'asset', 'fixed_asset', 'debit', '115101', 6, false, false, 'Individual vehicle asset account', 2),
('115101003', 'Toyota Prius 2023 - ABC125', 'تويوتا بريوس 2023 - ABC125', 'asset', 'fixed_asset', 'debit', '115101', 6, false, false, 'Individual vehicle asset account', 3),
('115101004', 'Toyota RAV4 2023 - ABC126', 'تويوتا راف 4 2023 - ABC126', 'asset', 'fixed_asset', 'debit', '115101', 6, false, false, 'Individual vehicle asset account', 4),
('115101005', 'Toyota Highlander 2023 - ABC127', 'تويوتا هايلاندر 2023 - ABC127', 'asset', 'fixed_asset', 'debit', '115101', 6, false, false, 'Individual vehicle asset account', 5),

-- Nissan vehicles under نيسان (115102)
('115102001', 'Nissan Altima 2023 - DEF123', 'نيسان التيما 2023 - DEF123', 'asset', 'fixed_asset', 'debit', '115102', 6, false, false, 'Individual vehicle asset account', 1),
('115102002', 'Nissan Sentra 2023 - DEF124', 'نيسان سنترا 2023 - DEF124', 'asset', 'fixed_asset', 'debit', '115102', 6, false, false, 'Individual vehicle asset account', 2),
('115102003', 'Nissan Maxima 2023 - DEF125', 'نيسان ماكسيما 2023 - DEF125', 'asset', 'fixed_asset', 'debit', '115102', 6, false, false, 'Individual vehicle asset account', 3),

-- Honda vehicles under هوندا (115103)
('115103001', 'Honda Civic 2023 - GHI123', 'هوندا سيفيك 2023 - GHI123', 'asset', 'fixed_asset', 'debit', '115103', 6, false, false, 'Individual vehicle asset account', 1),
('115103002', 'Honda Accord 2023 - GHI124', 'هوندا أكورد 2023 - GHI124', 'asset', 'fixed_asset', 'debit', '115103', 6, false, false, 'Individual vehicle asset account', 2),

-- Hyundai vehicles under هيونداي (115104)
('115104001', 'Hyundai Elantra 2023 - JKL123', 'هيونداي إلانترا 2023 - JKL123', 'asset', 'fixed_asset', 'debit', '115104', 6, false, false, 'Individual vehicle asset account', 1),
('115104002', 'Hyundai Sonata 2023 - JKL124', 'هيونداي سوناتا 2023 - JKL124', 'asset', 'fixed_asset', 'debit', '115104', 6, false, false, 'Individual vehicle asset account', 2),

-- Ford vehicles under فورد (115105)
('115105001', 'Ford Focus 2023 - MNO123', 'فورد فوكس 2023 - MNO123', 'asset', 'fixed_asset', 'debit', '115105', 6, false, false, 'Individual vehicle asset account', 1),
('115105002', 'Ford Escape 2023 - MNO124', 'فورد إسكيب 2023 - MNO124', 'asset', 'fixed_asset', 'debit', '115105', 6, false, false, 'Individual vehicle asset account', 2),

-- Kia vehicles under كيا (115106)
('115106001', 'Kia Optima 2023 - PQR123', 'كيا أوبتيما 2023 - PQR123', 'asset', 'fixed_asset', 'debit', '115106', 6, false, false, 'Individual vehicle asset account', 1),

-- Individual Supplier Accounts (Level 6) - 15 accounts under supplier subcategories
-- Auto dealerships under وكلاء السيارات (217101)
('217101001', 'Toyota Kuwait Co. - Account 1', 'شركة تويوتا الكويت - حساب 1', 'liability', 'accounts_payable', 'credit', '217101', 6, false, false, 'Individual supplier account', 1),
('217101002', 'Nissan Al-Babtain Co. - Account 1', 'شركة نيسان البابطين - حساب 1', 'liability', 'accounts_payable', 'credit', '217101', 6, false, false, 'Individual supplier account', 2),
('217101003', 'Honda Trading Co. - Account 1', 'شركة هوندا التجارية - حساب 1', 'liability', 'accounts_payable', 'credit', '217101', 6, false, false, 'Individual supplier account', 3),

-- Spare parts suppliers under قطع الغيار (217102)
('217102001', 'Al-Salam Auto Parts - Account 1', 'السلام لقطع غيار السيارات - حساب 1', 'liability', 'accounts_payable', 'credit', '217102', 6, false, false, 'Individual supplier account', 1),
('217102002', 'Gulf Auto Parts Co. - Account 1', 'شركة الخليج لقطع الغيار - حساب 1', 'liability', 'accounts_payable', 'credit', '217102', 6, false, false, 'Individual supplier account', 2),
('217102003', 'Modern Auto Parts - Account 1', 'قطع الغيار الحديثة - حساب 1', 'liability', 'accounts_payable', 'credit', '217102', 6, false, false, 'Individual supplier account', 3),

-- Maintenance & repair under الصيانة والإصلاح (217103)
('217103001', 'Al-Watani Auto Service - Account 1', 'خدمة السيارات الوطنية - حساب 1', 'liability', 'accounts_payable', 'credit', '217103', 6, false, false, 'Individual supplier account', 1),
('217103002', 'Kuwait Auto Repair - Account 1', 'إصلاح السيارات الكويتية - حساب 1', 'liability', 'accounts_payable', 'credit', '217103', 6, false, false, 'Individual supplier account', 2),
('217103003', 'Expert Car Service - Account 1', 'خدمة السيارات الخبيرة - حساب 1', 'liability', 'accounts_payable', 'credit', '217103', 6, false, false, 'Individual supplier account', 3),

-- Insurance companies under شركات التأمين (217104)
('217104001', 'Kuwait Insurance Co. - Account 1', 'شركة الكويت للتأمين - حساب 1', 'liability', 'accounts_payable', 'credit', '217104', 6, false, false, 'Individual supplier account', 1),
('217104002', 'Gulf Insurance Group - Account 1', 'مجموعة الخليج للتأمين - حساب 1', 'liability', 'accounts_payable', 'credit', '217104', 6, false, false, 'Individual supplier account', 2),
('217104003', 'Al-Ahleia Insurance Co. - Account 1', 'شركة الأهلية للتأمين - حساب 1', 'liability', 'accounts_payable', 'credit', '217104', 6, false, false, 'Individual supplier account', 3),

-- Office suppliers under موردين المكاتب (217105)
('217105001', 'Kuwait Office Supplies - Account 1', 'المكتبة الكويتية - حساب 1', 'liability', 'accounts_payable', 'credit', '217105', 6, false, false, 'Individual supplier account', 1),
('217105002', 'Modern Office Equipment - Account 1', 'معدات المكاتب الحديثة - حساب 1', 'liability', 'accounts_payable', 'credit', '217105', 6, false, false, 'Individual supplier account', 2),
('217105003', 'Gulf Business Solutions - Account 1', 'حلول الأعمال الخليجية - حساب 1', 'liability', 'accounts_payable', 'credit', '217105', 6, false, false, 'Individual supplier account', 3)

ON CONFLICT (account_code) DO NOTHING;