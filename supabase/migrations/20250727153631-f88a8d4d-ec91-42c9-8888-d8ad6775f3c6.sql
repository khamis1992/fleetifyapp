-- المرحلة الأولى: إضافة الحقول المفقودة في جدول المركبات
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS engine_number text,
ADD COLUMN IF NOT EXISTS chassis_number text,
ADD COLUMN IF NOT EXISTS fuel_capacity numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS seating_capacity integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS transmission_type text DEFAULT 'automatic',
ADD COLUMN IF NOT EXISTS drive_type text DEFAULT 'front_wheel',
ADD COLUMN IF NOT EXISTS vehicle_category text DEFAULT 'sedan',
ADD COLUMN IF NOT EXISTS registration_date date,
ADD COLUMN IF NOT EXISTS registration_expiry date,
ADD COLUMN IF NOT EXISTS inspection_due_date date,
ADD COLUMN IF NOT EXISTS warranty_start_date date,
ADD COLUMN IF NOT EXISTS warranty_end_date date,
ADD COLUMN IF NOT EXISTS current_location text,
ADD COLUMN IF NOT EXISTS gps_tracking_device text,
ADD COLUMN IF NOT EXISTS safety_features jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS entertainment_features jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS comfort_features jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS vehicle_condition text DEFAULT 'excellent',
ADD COLUMN IF NOT EXISTS fuel_type text DEFAULT 'gasoline',
ADD COLUMN IF NOT EXISTS ownership_status text DEFAULT 'owned',
ADD COLUMN IF NOT EXISTS lease_start_date date,
ADD COLUMN IF NOT EXISTS lease_end_date date,
ADD COLUMN IF NOT EXISTS monthly_lease_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS lease_company text,
ADD COLUMN IF NOT EXISTS expected_depreciation_rate numeric DEFAULT 15.0,
ADD COLUMN IF NOT EXISTS total_fuel_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_fuel_consumption numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_distance_km integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS vehicle_documents jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS emergency_contact_info jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS maintenance_schedule jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS performance_metrics jsonb DEFAULT '{}'::jsonb;

-- إنشاء جدول قراءات العداد
CREATE TABLE IF NOT EXISTS public.odometer_readings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    reading_date date NOT NULL DEFAULT CURRENT_DATE,
    odometer_reading integer NOT NULL,
    fuel_level_percentage numeric DEFAULT 0,
    notes text,
    recorded_by uuid REFERENCES auth.users(id),
    location text,
    photo_url text,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- إنشاء جدول تقييم المركبات
CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    inspection_date date NOT NULL,
    inspector_name text NOT NULL,
    inspection_type text NOT NULL DEFAULT 'routine',
    overall_condition text NOT NULL DEFAULT 'good',
    mileage_at_inspection integer,
    engine_condition text DEFAULT 'good',
    transmission_condition text DEFAULT 'good',
    brake_condition text DEFAULT 'good',
    tire_condition text DEFAULT 'good',
    battery_condition text DEFAULT 'good',
    lights_condition text DEFAULT 'good',
    ac_condition text DEFAULT 'good',
    interior_condition text DEFAULT 'good',
    exterior_condition text DEFAULT 'good',
    safety_equipment_status text DEFAULT 'good',
    identified_issues text[],
    repair_recommendations text[],
    estimated_repair_cost numeric DEFAULT 0,
    next_inspection_due date,
    inspection_certificate_url text,
    photos jsonb DEFAULT '[]'::jsonb,
    is_passed boolean DEFAULT true,
    notes text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- إنشاء جدول الغرامات المرورية
CREATE TABLE IF NOT EXISTS public.traffic_violations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    violation_number text NOT NULL,
    violation_date date NOT NULL,
    violation_time time,
    violation_type text NOT NULL,
    violation_description text,
    location text,
    fine_amount numeric NOT NULL DEFAULT 0,
    late_fee numeric DEFAULT 0,
    total_amount numeric NOT NULL DEFAULT 0,
    currency text DEFAULT 'KWD',
    issuing_authority text,
    officer_name text,
    status text NOT NULL DEFAULT 'pending',
    due_date date,
    paid_date date,
    payment_method text,
    payment_reference text,
    discount_applied numeric DEFAULT 0,
    driver_name text,
    driver_license text,
    driver_phone text,
    court_date date,
    court_status text,
    appeal_date date,
    appeal_status text,
    vehicle_impounded boolean DEFAULT false,
    impound_location text,
    impound_release_date date,
    photos jsonb DEFAULT '[]'::jsonb,
    documents jsonb DEFAULT '[]'::jsonb,
    notes text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(company_id, violation_number)
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_odometer_readings_vehicle_date ON public.odometer_readings(vehicle_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle_date ON public.vehicle_inspections(vehicle_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_vehicle_date ON public.traffic_violations(vehicle_id, violation_date DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_status ON public.traffic_violations(status);

-- إضافة تريجر لتحديث updated_at
CREATE TRIGGER update_odometer_readings_updated_at
    BEFORE UPDATE ON public.odometer_readings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_inspections_updated_at
    BEFORE UPDATE ON public.vehicle_inspections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_traffic_violations_updated_at
    BEFORE UPDATE ON public.traffic_violations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- إضافة سياسات الأمان (RLS)
ALTER TABLE public.odometer_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_violations ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لقراءات العداد
CREATE POLICY "المديرون يمكنهم إدارة قراءات العداد" 
ON public.odometer_readings 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (company_id = get_user_company(auth.uid()) 
        AND (has_role(auth.uid(), 'company_admin'::user_role) 
             OR has_role(auth.uid(), 'manager'::user_role) 
             OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض قراءات العداد" 
ON public.odometer_readings 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- سياسات الأمان لتقييم المركبات
CREATE POLICY "المديرون يمكنهم إدارة تقييم المركبات" 
ON public.vehicle_inspections 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (company_id = get_user_company(auth.uid()) 
        AND (has_role(auth.uid(), 'company_admin'::user_role) 
             OR has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض تقييم المركبات" 
ON public.vehicle_inspections 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- سياسات الأمان للغرامات المرورية
CREATE POLICY "المديرون يمكنهم إدارة الغرامات المرورية" 
ON public.traffic_violations 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) 
    OR (company_id = get_user_company(auth.uid()) 
        AND (has_role(auth.uid(), 'company_admin'::user_role) 
             OR has_role(auth.uid(), 'manager'::user_role) 
             OR has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض الغرامات المرورية" 
ON public.traffic_violations 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- دالة لتوليد رقم المخالفة
CREATE OR REPLACE FUNCTION public.generate_violation_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    next_number integer;
    number_with_padding text;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(violation_number FROM '[0-9]+') AS integer)), 0) + 1
    INTO next_number
    FROM public.traffic_violations
    WHERE company_id = company_id_param;
    
    number_with_padding := LPAD(next_number::text, 6, '0');
    
    RETURN 'TV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || number_with_padding;
END;
$$;