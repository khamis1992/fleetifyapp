-- Create vehicle condition reports table
CREATE TABLE public.vehicle_condition_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    dispatch_permit_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    inspector_id UUID NOT NULL,
    inspection_type TEXT NOT NULL DEFAULT 'pre_dispatch' CHECK (inspection_type IN ('pre_dispatch', 'post_dispatch')),
    overall_condition TEXT NOT NULL DEFAULT 'good' CHECK (overall_condition IN ('excellent', 'good', 'fair', 'poor')),
    mileage_reading INTEGER,
    fuel_level INTEGER CHECK (fuel_level >= 0 AND fuel_level <= 100),
    inspection_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT,
    photos JSONB DEFAULT '[]',
    condition_items JSONB NOT NULL DEFAULT '{}',
    damage_items JSONB DEFAULT '[]',
    inspector_signature TEXT,
    customer_signature TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'requires_attention')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_vehicle_condition_reports_company_id ON public.vehicle_condition_reports(company_id);
CREATE INDEX idx_vehicle_condition_reports_vehicle_id ON public.vehicle_condition_reports(vehicle_id);
CREATE INDEX idx_vehicle_condition_reports_dispatch_permit_id ON public.vehicle_condition_reports(dispatch_permit_id);
CREATE INDEX idx_vehicle_condition_reports_inspection_date ON public.vehicle_condition_reports(inspection_date);

-- Enable RLS
ALTER TABLE public.vehicle_condition_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view condition reports in their company"
ON public.vehicle_condition_reports
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage condition reports in their company"
ON public.vehicle_condition_reports
FOR ALL
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (
        company_id = get_user_company(auth.uid()) AND 
        (
            has_role(auth.uid(), 'company_admin'::user_role) OR 
            has_role(auth.uid(), 'manager'::user_role) OR 
            has_role(auth.uid(), 'sales_agent'::user_role)
        )
    )
);

-- Create function to automatically create condition reports for dispatch permits
CREATE OR REPLACE FUNCTION public.create_condition_report_for_permit(
    permit_id_param UUID,
    inspection_type_param TEXT DEFAULT 'pre_dispatch'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    permit_record RECORD;
    condition_report_id UUID;
    default_condition_items JSONB;
BEGIN
    -- Get permit details
    SELECT * INTO permit_record
    FROM public.vehicle_dispatch_permits
    WHERE id = permit_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Dispatch permit not found';
    END IF;
    
    -- Default condition items based on the inspection form
    default_condition_items := '{
        "exterior": {
            "body_damage": false,
            "scratches": false,
            "dents": false,
            "paint_condition": "good",
            "bumpers": "good",
            "mirrors": "good",
            "windows": "good",
            "lights": "good",
            "tires": "good",
            "wheels": "good"
        },
        "interior": {
            "seats": "good",
            "dashboard": "good",
            "steering_wheel": "good",
            "seatbelts": "good",
            "floor_mats": "good",
            "air_conditioning": "working",
            "radio": "working",
            "cigarette_lighter": "working"
        },
        "mechanical": {
            "engine": "good",
            "brakes": "good",
            "transmission": "good",
            "steering": "good",
            "suspension": "good",
            "exhaust": "good",
            "cooling_system": "good",
            "electrical": "good"
        },
        "fluids": {
            "engine_oil": "good",
            "brake_fluid": "good",
            "coolant": "good",
            "windshield_washer": "good"
        },
        "documents": {
            "registration": true,
            "insurance": true,
            "manual": true,
            "spare_key": true,
            "tools": true,
            "spare_tire": true
        }
    }'::jsonb;
    
    -- Create condition report
    INSERT INTO public.vehicle_condition_reports (
        company_id,
        dispatch_permit_id,
        vehicle_id,
        inspector_id,
        inspection_type,
        condition_items
    ) VALUES (
        permit_record.company_id,
        permit_id_param,
        permit_record.vehicle_id,
        auth.uid(),
        inspection_type_param,
        default_condition_items
    ) RETURNING id INTO condition_report_id;
    
    RETURN condition_report_id;
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_vehicle_condition_reports_updated_at
    BEFORE UPDATE ON public.vehicle_condition_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();