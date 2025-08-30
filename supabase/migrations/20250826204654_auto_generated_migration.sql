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
    fine_amount decimal(10,2) NOT NULL DEFAULT 0,
    total_amount decimal(10,2) NOT NULL DEFAULT 0,
    issuing_authority text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'disputed', 'cancelled')),
    payment_date date,
    payment_method text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_traffic_violations_vehicle_date ON public.traffic_violations(vehicle_id, violation_date DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_status ON public.traffic_violations(status);
CREATE INDEX IF NOT EXISTS idx_traffic_violations_company ON public.traffic_violations(company_id);

-- إضافة تريجر لتحديث updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_traffic_violations_updated_at
    BEFORE UPDATE ON public.traffic_violations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- إضافة سياسات الأمان (RLS)
ALTER TABLE public.traffic_violations ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للغرامات المرورية
CREATE POLICY "Users can manage traffic violations in their company" 
ON public.traffic_violations 
FOR ALL 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can view traffic violations in their company" 
ON public.traffic_violations 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));