-- إضافة الحقول المالية الجديدة لجدول المركبات
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_premium_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_start_date DATE,
ADD COLUMN IF NOT EXISTS insurance_end_date DATE,
ADD COLUMN IF NOT EXISTS registration_fees NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS registration_date DATE,
ADD COLUMN IF NOT EXISTS registration_expiry DATE,
ADD COLUMN IF NOT EXISTS purchase_invoice_number TEXT,
ADD COLUMN IF NOT EXISTS vendor_id UUID,
ADD COLUMN IF NOT EXISTS warranty_start_date DATE,
ADD COLUMN IF NOT EXISTS warranty_end_date DATE,
ADD COLUMN IF NOT EXISTS warranty_provider TEXT,
ADD COLUMN IF NOT EXISTS depreciation_rate NUMERIC DEFAULT 20,
ADD COLUMN IF NOT EXISTS residual_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_maintenance_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_insurance_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_operating_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vehicle_group_id UUID,
ADD COLUMN IF NOT EXISTS fuel_type TEXT DEFAULT 'gasoline',
ADD COLUMN IF NOT EXISTS fuel_capacity NUMERIC,
ADD COLUMN IF NOT EXISTS engine_size TEXT,
ADD COLUMN IF NOT EXISTS transmission_type TEXT DEFAULT 'automatic',
ADD COLUMN IF NOT EXISTS seating_capacity INTEGER,
ADD COLUMN IF NOT EXISTS cargo_capacity NUMERIC,
ADD COLUMN IF NOT EXISTS vehicle_weight NUMERIC,
ADD COLUMN IF NOT EXISTS safety_features TEXT[],
ADD COLUMN IF NOT EXISTS additional_features TEXT[];

-- إنشاء جدول مجموعات المركبات
CREATE TABLE IF NOT EXISTS public.vehicle_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    group_name TEXT NOT NULL,
    group_name_ar TEXT,
    description TEXT,
    default_cost_center_id UUID,
    default_depreciation_rate NUMERIC DEFAULT 20,
    default_useful_life_years INTEGER DEFAULT 5,
    group_color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين RLS للجدول الجديد
ALTER TABLE public.vehicle_groups ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان لمجموعات المركبات
CREATE POLICY "المديرون يمكنهم إدارة مجموعات المركبات في شركتهم"
    ON public.vehicle_groups FOR ALL
    USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR 
        (company_id = get_user_company(auth.uid()) AND 
         (has_role(auth.uid(), 'company_admin'::user_role) OR 
          has_role(auth.uid(), 'manager'::user_role)))
    );

CREATE POLICY "المستخدمون يمكنهم عرض مجموعات المركبات في شركتهم"
    ON public.vehicle_groups FOR SELECT
    USING (company_id = get_user_company(auth.uid()));

-- إنشاء مجموعات المركبات الافتراضية
INSERT INTO public.vehicle_groups (company_id, group_name, group_name_ar, description, group_color)
SELECT 
    c.id as company_id,
    'Passenger Cars' as group_name,
    'سيارات الركوب' as group_name_ar,
    'Standard passenger vehicles for daily use' as description,
    '#3B82F6' as group_color
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.vehicle_groups vg 
    WHERE vg.company_id = c.id AND vg.group_name = 'Passenger Cars'
);

INSERT INTO public.vehicle_groups (company_id, group_name, group_name_ar, description, group_color)
SELECT 
    c.id as company_id,
    'Commercial Vehicles' as group_name,
    'المركبات التجارية' as group_name_ar,
    'Trucks, vans and commercial vehicles' as description,
    '#10B981' as group_color
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.vehicle_groups vg 
    WHERE vg.company_id = c.id AND vg.group_name = 'Commercial Vehicles'
);

INSERT INTO public.vehicle_groups (company_id, group_name, group_name_ar, description, group_color)
SELECT 
    c.id as company_id,
    'Luxury Vehicles' as group_name,
    'المركبات الفاخرة' as group_name_ar,
    'Premium and luxury vehicles' as description,
    '#F59E0B' as group_color
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1 FROM public.vehicle_groups vg 
    WHERE vg.company_id = c.id AND vg.group_name = 'Luxury Vehicles'
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_vehicles_group_id ON public.vehicles(vehicle_group_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vendor_id ON public.vehicles(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_insurance_dates ON public.vehicles(insurance_start_date, insurance_end_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration_expiry ON public.vehicles(registration_expiry);
CREATE INDEX IF NOT EXISTS idx_vehicle_groups_company_id ON public.vehicle_groups(company_id);

-- إنشاء ترايجر لتحديث updated_at
CREATE TRIGGER update_vehicle_groups_updated_at
    BEFORE UPDATE ON public.vehicle_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- إنشاء دالة لحساب التكاليف الإجمالية للمركبة
CREATE OR REPLACE FUNCTION public.calculate_vehicle_total_costs(vehicle_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    maintenance_total NUMERIC;
    insurance_total NUMERIC;
    operating_total NUMERIC;
BEGIN
    -- حساب إجمالي تكاليف الصيانة
    SELECT COALESCE(SUM(actual_cost), 0) INTO maintenance_total
    FROM public.vehicle_maintenance
    WHERE vehicle_id = vehicle_id_param AND status = 'completed';
    
    -- حساب إجمالي تكاليف التأمين
    SELECT COALESCE(SUM(insurance_premium_amount), 0) INTO insurance_total
    FROM public.vehicles
    WHERE id = vehicle_id_param;
    
    -- حساب إجمالي التكاليف التشغيلية
    operating_total := maintenance_total + insurance_total;
    
    -- تحديث المركبة بالتكاليف المحدثة
    UPDATE public.vehicles
    SET 
        total_maintenance_cost = maintenance_total,
        total_insurance_cost = insurance_total,
        total_operating_cost = operating_total,
        updated_at = now()
    WHERE id = vehicle_id_param;
END;
$function$;

-- إنشاء دالة لإنشاء قيد شراء المركبة
CREATE OR REPLACE FUNCTION public.create_vehicle_purchase_journal_entry(vehicle_id_param UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    vehicle_record RECORD;
    journal_entry_id UUID;
    asset_account_id UUID;
    cash_account_id UUID;
    fleet_cost_center_id UUID;
    entry_number TEXT;
BEGIN
    -- الحصول على تفاصيل المركبة
    SELECT * INTO vehicle_record
    FROM public.vehicles
    WHERE id = vehicle_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle not found';
    END IF;
    
    -- التحقق من وجود تكلفة شراء
    IF COALESCE(vehicle_record.purchase_cost, 0) <= 0 THEN
        RETURN NULL;
    END IF;
    
    -- الحصول على مركز تكلفة الأسطول
    SELECT id INTO fleet_cost_center_id
    FROM public.cost_centers
    WHERE company_id = vehicle_record.company_id
    AND center_code = 'FLEET'
    AND is_active = true
    LIMIT 1;
    
    -- إذا لم يوجد مركز أسطول، استخدم الإداري
    IF fleet_cost_center_id IS NULL THEN
        SELECT id INTO fleet_cost_center_id
        FROM public.cost_centers
        WHERE company_id = vehicle_record.company_id
        AND center_code = 'ADMIN'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- العثور على حساب الأصول الثابتة
    SELECT id INTO asset_account_id
    FROM public.chart_of_accounts
    WHERE company_id = vehicle_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%vehicle%' OR account_name ILIKE '%equipment%' OR account_name ILIKE '%مركبة%')
    AND is_active = true
    LIMIT 1;
    
    -- العثور على حساب النقدية
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = vehicle_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%نقدية%')
    AND is_active = true
    LIMIT 1;
    
    -- توليد رقم القيد
    SELECT 'VEH-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(
        (COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+$') AS INTEGER)), 0) + 1)::TEXT, 
        6, '0'
    ) INTO entry_number
    FROM public.journal_entries
    WHERE company_id = vehicle_record.company_id
    AND entry_number LIKE 'VEH-%';
    
    -- إنشاء القيد اليومي
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
        entry_number,
        COALESCE(vehicle_record.purchase_date, vehicle_record.created_at::date),
        'Vehicle Purchase - ' || COALESCE(vehicle_record.plate_number, 'Unknown') || 
        ' (' || COALESCE(vehicle_record.make, '') || ' ' || COALESCE(vehicle_record.model, '') || ')',
        'vehicle_purchase',
        vehicle_record.id,
        vehicle_record.purchase_cost,
        vehicle_record.purchase_cost,
        'draft',
        vehicle_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد
    -- مدين: الأصول الثابتة (المركبات)
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
            'Vehicle Asset - ' || COALESCE(vehicle_record.plate_number, 'Unknown'),
            vehicle_record.purchase_cost,
            0
        );
    END IF;
    
    -- دائن: النقدية
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

-- إنشاء ترايجر لإنشاء القيود المالية التلقائية للمركبات
CREATE OR REPLACE FUNCTION public.handle_vehicle_financial_integration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    purchase_journal_id UUID;
BEGIN
    -- إنشاء قيد الشراء عند إضافة مركبة جديدة بتكلفة
    IF TG_OP = 'INSERT' AND COALESCE(NEW.purchase_cost, 0) > 0 THEN
        purchase_journal_id := public.create_vehicle_purchase_journal_entry(NEW.id);
        NEW.journal_entry_id = purchase_journal_id;
    END IF;
    
    -- حساب التكاليف الإجمالية
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM public.calculate_vehicle_total_costs(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- ربط الترايجر بجدول المركبات
DROP TRIGGER IF EXISTS vehicle_financial_integration_trigger ON public.vehicles;
CREATE TRIGGER vehicle_financial_integration_trigger
    BEFORE INSERT OR UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_vehicle_financial_integration();