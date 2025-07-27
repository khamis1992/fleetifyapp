-- إضافة الجداول المفقودة فقط لإدارة الأسطول المتقدمة

-- التحقق من وجود الجداول وإضافة المفقود منها
DO $$
BEGIN
    -- جدول إدارة الوقود
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fuel_records') THEN
        CREATE TABLE public.fuel_records (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            company_id UUID NOT NULL,
            vehicle_id UUID NOT NULL,
            fuel_date DATE NOT NULL DEFAULT CURRENT_DATE,
            fuel_station TEXT,
            fuel_type TEXT NOT NULL DEFAULT 'gasoline',
            quantity_liters NUMERIC NOT NULL,
            cost_per_liter NUMERIC NOT NULL,
            total_cost NUMERIC NOT NULL,
            odometer_reading INTEGER,
            receipt_number TEXT,
            notes TEXT,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        
        ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "المديرون يمكنهم إدارة سجلات الوقود في شركتهم" 
        ON public.fuel_records 
        FOR ALL 
        USING (
            has_role(auth.uid(), 'super_admin'::user_role) OR 
            (company_id = get_user_company(auth.uid()) AND 
             (has_role(auth.uid(), 'company_admin'::user_role) OR 
              has_role(auth.uid(), 'manager'::user_role) OR 
              has_role(auth.uid(), 'sales_agent'::user_role)))
        );

        CREATE POLICY "المستخدمون يمكنهم عرض سجلات الوقود في شركتهم" 
        ON public.fuel_records 
        FOR SELECT 
        USING (company_id = get_user_company(auth.uid()));
        
        CREATE INDEX idx_fuel_records_vehicle_date ON public.fuel_records(vehicle_id, fuel_date);
        CREATE INDEX idx_fuel_records_company_date ON public.fuel_records(company_id, fuel_date);
        
        CREATE TRIGGER update_fuel_records_updated_at
            BEFORE UPDATE ON public.fuel_records
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- جدول سجلات الكيلومترات
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'odometer_readings') THEN
        CREATE TABLE public.odometer_readings (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            company_id UUID NOT NULL,
            vehicle_id UUID NOT NULL,
            reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
            odometer_reading INTEGER NOT NULL,
            reading_type TEXT NOT NULL DEFAULT 'manual',
            recorded_by UUID,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        
        ALTER TABLE public.odometer_readings ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "الموظفون يمكنهم إدارة قراءات العداد" 
        ON public.odometer_readings 
        FOR ALL 
        USING (
            has_role(auth.uid(), 'super_admin'::user_role) OR 
            (company_id = get_user_company(auth.uid()) AND 
             (has_role(auth.uid(), 'company_admin'::user_role) OR 
              has_role(auth.uid(), 'manager'::user_role) OR 
              has_role(auth.uid(), 'sales_agent'::user_role)))
        );

        CREATE POLICY "المستخدمون يمكنهم عرض قراءات العداد" 
        ON public.odometer_readings 
        FOR SELECT 
        USING (company_id = get_user_company(auth.uid()));
        
        CREATE INDEX idx_odometer_readings_vehicle_date ON public.odometer_readings(vehicle_id, reading_date);
    END IF;

    -- جدول تكاليف التشغيل الإضافية
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_operating_costs') THEN
        CREATE TABLE public.vehicle_operating_costs (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            company_id UUID NOT NULL,
            vehicle_id UUID NOT NULL,
            cost_type TEXT NOT NULL,
            cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
            amount NUMERIC NOT NULL,
            description TEXT,
            receipt_number TEXT,
            cost_center_id UUID,
            journal_entry_id UUID,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        
        ALTER TABLE public.vehicle_operating_costs ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "المديرون يمكنهم إدارة التكاليف التشغيلية" 
        ON public.vehicle_operating_costs 
        FOR ALL 
        USING (
            has_role(auth.uid(), 'super_admin'::user_role) OR 
            (company_id = get_user_company(auth.uid()) AND 
             (has_role(auth.uid(), 'company_admin'::user_role) OR 
              has_role(auth.uid(), 'manager'::user_role) OR 
              has_role(auth.uid(), 'sales_agent'::user_role)))
        );

        CREATE POLICY "المستخدمون يمكنهم عرض التكاليف التشغيلية" 
        ON public.vehicle_operating_costs 
        FOR SELECT 
        USING (company_id = get_user_company(auth.uid()));
        
        CREATE INDEX idx_operating_costs_vehicle_date ON public.vehicle_operating_costs(vehicle_id, cost_date);
        
        CREATE TRIGGER update_vehicle_operating_costs_updated_at
            BEFORE UPDATE ON public.vehicle_operating_costs
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    -- جدول تقارير الأسطول المخصصة
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fleet_reports') THEN
        CREATE TABLE public.fleet_reports (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            company_id UUID NOT NULL,
            report_name TEXT NOT NULL,
            report_name_ar TEXT,
            report_type TEXT NOT NULL,
            report_config JSONB NOT NULL DEFAULT '{}',
            schedule_config JSONB,
            is_scheduled BOOLEAN DEFAULT false,
            last_generated_at TIMESTAMP WITH TIME ZONE,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
        
        ALTER TABLE public.fleet_reports ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "المديرون يمكنهم إدارة تقارير الأسطول" 
        ON public.fleet_reports 
        FOR ALL 
        USING (
            has_role(auth.uid(), 'super_admin'::user_role) OR 
            (company_id = get_user_company(auth.uid()) AND 
             (has_role(auth.uid(), 'company_admin'::user_role) OR 
              has_role(auth.uid(), 'manager'::user_role)))
        );

        CREATE POLICY "المستخدمون يمكنهم عرض تقارير الأسطول" 
        ON public.fleet_reports 
        FOR SELECT 
        USING (company_id = get_user_company(auth.uid()));
        
        CREATE TRIGGER update_fleet_reports_updated_at
            BEFORE UPDATE ON public.fleet_reports
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- دالة لحساب استهلاك الوقود
CREATE OR REPLACE FUNCTION public.calculate_fuel_efficiency(vehicle_id_param UUID, start_date DATE DEFAULT NULL, end_date DATE DEFAULT NULL)
RETURNS TABLE(
    total_fuel_liters NUMERIC,
    total_distance_km INTEGER,
    fuel_efficiency_km_per_liter NUMERIC,
    average_cost_per_liter NUMERIC,
    total_fuel_cost NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    start_odometer INTEGER;
    end_odometer INTEGER;
    total_distance INTEGER;
BEGIN
    -- تحديد التواريخ الافتراضية
    IF start_date IS NULL THEN
        start_date := CURRENT_DATE - INTERVAL '30 days';
    END IF;
    
    IF end_date IS NULL THEN
        end_date := CURRENT_DATE;
    END IF;
    
    -- الحصول على قراءات العداد
    SELECT MIN(o.odometer_reading) INTO start_odometer
    FROM public.odometer_readings o
    WHERE o.vehicle_id = vehicle_id_param 
    AND o.reading_date >= start_date;
    
    SELECT MAX(o.odometer_reading) INTO end_odometer
    FROM public.odometer_readings o
    WHERE o.vehicle_id = vehicle_id_param 
    AND o.reading_date <= end_date;
    
    -- حساب المسافة الإجمالية
    total_distance := COALESCE(end_odometer - start_odometer, 0);
    
    RETURN QUERY
    SELECT 
        COALESCE(SUM(f.quantity_liters), 0) as total_fuel_liters,
        total_distance as total_distance_km,
        CASE 
            WHEN COALESCE(SUM(f.quantity_liters), 0) > 0 THEN 
                total_distance::NUMERIC / SUM(f.quantity_liters)
            ELSE 0 
        END as fuel_efficiency_km_per_liter,
        CASE 
            WHEN COUNT(f.id) > 0 THEN 
                AVG(f.cost_per_liter) 
            ELSE 0 
        END as average_cost_per_liter,
        COALESCE(SUM(f.total_cost), 0) as total_fuel_cost
    FROM public.fuel_records f
    WHERE f.vehicle_id = vehicle_id_param 
    AND f.fuel_date BETWEEN start_date AND end_date;
END;
$$;