-- إنشاء الجداول المفقودة فقط
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

CREATE TABLE IF NOT EXISTS public.vehicle_activity_log (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    activity_type text NOT NULL,
    description text,
    activity_date date NOT NULL DEFAULT CURRENT_DATE,
    activity_time time DEFAULT CURRENT_TIME,
    mileage integer,
    location text,
    performed_by uuid REFERENCES auth.users(id),
    cost_amount numeric DEFAULT 0,
    cost_center_id uuid REFERENCES public.cost_centers(id),
    reference_document text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_odometer_readings_vehicle_date ON public.odometer_readings(vehicle_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle_date ON public.vehicle_inspections(vehicle_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_log_vehicle_date ON public.vehicle_activity_log(vehicle_id, activity_date DESC);

-- إضافة التريجرات
CREATE TRIGGER update_odometer_readings_updated_at
    BEFORE UPDATE ON public.odometer_readings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_inspections_updated_at
    BEFORE UPDATE ON public.vehicle_inspections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_activity_log_updated_at
    BEFORE UPDATE ON public.vehicle_activity_log
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- تفعيل RLS
ALTER TABLE public.odometer_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_activity_log ENABLE ROW LEVEL SECURITY;