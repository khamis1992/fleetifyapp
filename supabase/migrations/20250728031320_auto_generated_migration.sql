-- إنشاء دالة للحصول على الحساب المرتبط
CREATE OR REPLACE FUNCTION public.get_mapped_account_id(company_id_param uuid, account_type_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    mapped_account_id uuid;
BEGIN
    SELECT am.chart_of_accounts_id INTO mapped_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON am.default_account_type_id = dat.id
    WHERE am.company_id = company_id_param
    AND dat.type_code = account_type_code
    AND am.is_active = true
    LIMIT 1;
    
    RETURN mapped_account_id;
END;
$function$;

-- تحديث دالة إنشاء قيد صيانة المركبات
CREATE OR REPLACE FUNCTION public.create_maintenance_journal_entry(maintenance_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    maintenance_record record;
    journal_entry_id uuid;
    expense_account_id uuid;
    cash_account_id uuid;
    maint_cost_center_id uuid;
BEGIN
    SELECT * INTO maintenance_record
    FROM public.vehicle_maintenance
    WHERE id = maintenance_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Maintenance record not found';
    END IF;
    
    -- الحصول على الحسابات المربوطة
    expense_account_id := public.get_mapped_account_id(
        (SELECT company_id FROM vehicles WHERE id = maintenance_record.vehicle_id),
        'MAINTENANCE_EXPENSE'
    );
    
    cash_account_id := public.get_mapped_account_id(
        (SELECT company_id FROM vehicles WHERE id = maintenance_record.vehicle_id),
        'CASH'
    );
    
    -- الحصول على مركز تكلفة الصيانة
    SELECT id INTO maint_cost_center_id
    FROM public.cost_centers
    WHERE company_id = (SELECT company_id FROM vehicles WHERE id = maintenance_record.vehicle_id)
    AND center_code = 'MAINT_OPS'
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء القيد المحاسبي
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit,
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        (SELECT company_id FROM vehicles WHERE id = maintenance_record.vehicle_id),
        public.generate_journal_entry_number((SELECT company_id FROM vehicles WHERE id = maintenance_record.vehicle_id)),
        maintenance_record.scheduled_date,
        'Vehicle Maintenance - ' || maintenance_record.maintenance_type,
        'maintenance',
        maintenance_record.id,
        COALESCE(maintenance_record.actual_cost, maintenance_record.estimated_cost),
        COALESCE(maintenance_record.actual_cost, maintenance_record.estimated_cost),
        'draft',
        maintenance_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- سطر المصروف
    IF expense_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            expense_account_id,
            maint_cost_center_id,
            1,
            'Maintenance Expense - ' || maintenance_record.maintenance_type,
            COALESCE(maintenance_record.actual_cost, maintenance_record.estimated_cost),
            0
        );
    END IF;
    
    -- سطر النقدية
    IF cash_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            cash_account_id,
            maint_cost_center_id,
            2,
            'Cash Payment - Maintenance',
            0,
            COALESCE(maintenance_record.actual_cost, maintenance_record.estimated_cost)
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- تحديث دالة إنشاء قيد شراء المركبة
CREATE OR REPLACE FUNCTION public.create_vehicle_purchase_journal_entry(vehicle_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    vehicle_record record;
    journal_entry_id uuid;
    asset_account_id uuid;
    cash_account_id uuid;
    fleet_cost_center_id uuid;
BEGIN
    SELECT * INTO vehicle_record
    FROM public.vehicles
    WHERE id = vehicle_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle not found';
    END IF;
    
    -- تخطي إذا لم يكن هناك تكلفة شراء
    IF COALESCE(vehicle_record.purchase_cost, 0) <= 0 THEN
        RETURN NULL;
    END IF;
    
    -- الحصول على الحسابات المربوطة
    asset_account_id := public.get_mapped_account_id(vehicle_record.company_id, 'VEHICLE_ASSETS');
    cash_account_id := public.get_mapped_account_id(vehicle_record.company_id, 'CASH');
    
    -- الحصول على مركز تكلفة الأسطول
    SELECT id INTO fleet_cost_center_id
    FROM public.cost_centers
    WHERE company_id = vehicle_record.company_id
    AND center_code = 'FLEET'
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء القيد المحاسبي
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit,
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        vehicle_record.company_id,
        public.generate_journal_entry_number(vehicle_record.company_id),
        COALESCE(vehicle_record.purchase_date, vehicle_record.created_at::date),
        'Vehicle Purchase - ' || vehicle_record.plate_number,
        'vehicle_purchase',
        vehicle_record.id,
        vehicle_record.purchase_cost,
        vehicle_record.purchase_cost,
        'draft',
        vehicle_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- سطر الأصول
    IF asset_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            asset_account_id,
            fleet_cost_center_id,
            1,
            'Vehicle Asset - ' || vehicle_record.plate_number,
            vehicle_record.purchase_cost,
            0
        );
    END IF;
    
    -- سطر النقدية
    IF cash_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            cash_account_id,
            fleet_cost_center_id,
            2,
            'Cash Payment - Vehicle Purchase',
            0,
            vehicle_record.purchase_cost
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- دالة إنشاء قيد الإهلاك
CREATE OR REPLACE FUNCTION public.create_depreciation_journal_entry(
    asset_id_param uuid, 
    depreciation_amount_param numeric, 
    depreciation_date_param date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    asset_record record;
    journal_entry_id uuid;
    depreciation_expense_account_id uuid;
    accumulated_depreciation_account_id uuid;
    asset_cost_center_id uuid;
BEGIN
    SELECT * INTO asset_record
    FROM public.fixed_assets
    WHERE id = asset_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fixed asset not found';
    END IF;
    
    -- الحصول على الحسابات المربوطة
    depreciation_expense_account_id := public.get_mapped_account_id(asset_record.company_id, 'DEPRECIATION_EXPENSE');
    accumulated_depreciation_account_id := public.get_mapped_account_id(asset_record.company_id, 'ACCUMULATED_DEPRECIATION');
    
    -- الحصول على مركز التكلفة المناسب حسب فئة الأصل
    SELECT id INTO asset_cost_center_id
    FROM public.cost_centers
    WHERE company_id = asset_record.company_id
    AND center_code = CASE 
        WHEN asset_record.category = 'Vehicles' THEN 'FLEET'
        ELSE 'ADMIN'
    END
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء القيد المحاسبي
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit,
        status
    ) VALUES (
        gen_random_uuid(),
        asset_record.company_id,
        public.generate_journal_entry_number(asset_record.company_id),
        depreciation_date_param,
        'Depreciation - ' || asset_record.asset_name,
        'depreciation',
        asset_record.id,
        depreciation_amount_param,
        depreciation_amount_param,
        'posted'
    ) RETURNING id INTO journal_entry_id;
    
    -- سطر مصروف الإهلاك
    IF depreciation_expense_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            depreciation_expense_account_id,
            asset_cost_center_id,
            1,
            'Depreciation Expense - ' || asset_record.asset_name,
            depreciation_amount_param,
            0
        );
    END IF;
    
    -- سطر الإهلاك المتراكم
    IF accumulated_depreciation_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            accumulated_depreciation_account_id,
            asset_cost_center_id,
            2,
            'Accumulated Depreciation - ' || asset_record.asset_name,
            0,
            depreciation_amount_param
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- دالة إنشاء قيد مصروف التأمين
CREATE OR REPLACE FUNCTION public.create_insurance_journal_entry(policy_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    policy_record record;
    journal_entry_id uuid;
    insurance_expense_account_id uuid;
    cash_account_id uuid;
    fleet_cost_center_id uuid;
BEGIN
    SELECT vip.*, v.company_id, v.plate_number 
    INTO policy_record
    FROM public.vehicle_insurance_policies vip
    JOIN public.vehicles v ON vip.vehicle_id = v.id
    WHERE vip.id = policy_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insurance policy not found';
    END IF;
    
    -- الحصول على الحسابات المربوطة
    insurance_expense_account_id := public.get_mapped_account_id(policy_record.company_id, 'INSURANCE_EXPENSE');
    cash_account_id := public.get_mapped_account_id(policy_record.company_id, 'CASH');
    
    -- الحصول على مركز تكلفة الأسطول
    SELECT id INTO fleet_cost_center_id
    FROM public.cost_centers
    WHERE company_id = policy_record.company_id
    AND center_code = 'FLEET'
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء القيد المحاسبي
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit,
        status
    ) VALUES (
        gen_random_uuid(),
        policy_record.company_id,
        public.generate_journal_entry_number(policy_record.company_id),
        policy_record.start_date,
        'Insurance Premium - ' || policy_record.plate_number,
        'insurance',
        policy_record.id,
        policy_record.premium_amount,
        policy_record.premium_amount,
        'draft'
    ) RETURNING id INTO journal_entry_id;
    
    -- سطر مصروف التأمين
    IF insurance_expense_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            insurance_expense_account_id,
            fleet_cost_center_id,
            1,
            'Insurance Expense - ' || policy_record.plate_number,
            policy_record.premium_amount,
            0
        );
    END IF;
    
    -- سطر النقدية
    IF cash_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            cash_account_id,
            fleet_cost_center_id,
            2,
            'Cash Payment - Insurance Premium',
            0,
            policy_record.premium_amount
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- إنشاء trigger للصيانة
CREATE OR REPLACE FUNCTION public.handle_maintenance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- إنشاء قيد محاسبي عند اكتمال الصيانة
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_maintenance_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- إنشاء trigger للتأمين
CREATE OR REPLACE FUNCTION public.handle_insurance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- إنشاء قيد محاسبي عند تفعيل البوليصة
    IF (TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active AND NEW.is_active = true AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_insurance_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.is_active = true AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_insurance_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- تطبيق triggers على الجداول
DROP TRIGGER IF EXISTS maintenance_journal_trigger ON public.vehicle_maintenance;
CREATE TRIGGER maintenance_journal_trigger
    BEFORE UPDATE ON public.vehicle_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_maintenance_changes();

DROP TRIGGER IF EXISTS insurance_journal_trigger ON public.vehicle_insurance_policies;
CREATE TRIGGER insurance_journal_trigger
    BEFORE INSERT OR UPDATE ON public.vehicle_insurance_policies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_insurance_changes();

-- إضافة عمود journal_entry_id للجداول المطلوبة
ALTER TABLE public.vehicle_maintenance 
ADD COLUMN IF NOT EXISTS journal_entry_id uuid;

ALTER TABLE public.vehicle_insurance_policies 
ADD COLUMN IF NOT EXISTS journal_entry_id uuid;