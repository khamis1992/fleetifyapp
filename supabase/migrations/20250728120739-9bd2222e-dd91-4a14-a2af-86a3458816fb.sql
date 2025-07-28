-- Create dispatch permits table
CREATE TABLE public.vehicle_dispatch_permits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    permit_number VARCHAR NOT NULL,
    vehicle_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    approved_by UUID,
    request_type TEXT NOT NULL CHECK (request_type IN ('maintenance', 'employee_use', 'delivery', 'inspection', 'other')),
    purpose TEXT NOT NULL,
    purpose_ar TEXT,
    destination TEXT NOT NULL,
    destination_ar TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    estimated_km INTEGER,
    actual_km INTEGER,
    fuel_allowance NUMERIC(10,2),
    driver_name TEXT,
    driver_phone TEXT,
    driver_license TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    notes TEXT,
    rejection_reason TEXT,
    approval_signature TEXT,
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create permits attachments table
CREATE TABLE public.dispatch_permit_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    permit_id UUID NOT NULL REFERENCES public.vehicle_dispatch_permits(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permits tracking table for real-time updates
CREATE TABLE public.dispatch_permit_tracking (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    permit_id UUID NOT NULL REFERENCES public.vehicle_dispatch_permits(id) ON DELETE CASCADE,
    status_changed_from TEXT,
    status_changed_to TEXT NOT NULL,
    changed_by UUID NOT NULL,
    change_reason TEXT,
    location TEXT,
    odometer_reading INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.vehicle_dispatch_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_permit_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_permit_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicle_dispatch_permits
CREATE POLICY "Users can view permits in their company" 
ON public.vehicle_dispatch_permits 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage permits in their company" 
ON public.vehicle_dispatch_permits 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- Create RLS policies for dispatch_permit_attachments
CREATE POLICY "Users can view attachments in their company" 
ON public.dispatch_permit_attachments 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.vehicle_dispatch_permits vdp 
    WHERE vdp.id = permit_id AND vdp.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Staff can manage attachments in their company" 
ON public.dispatch_permit_attachments 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (EXISTS (
        SELECT 1 FROM public.vehicle_dispatch_permits vdp 
        WHERE vdp.id = permit_id AND vdp.company_id = get_user_company(auth.uid()) AND
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role) OR 
         has_role(auth.uid(), 'sales_agent'::user_role))
    ))
);

-- Create RLS policies for dispatch_permit_tracking
CREATE POLICY "Users can view tracking in their company" 
ON public.dispatch_permit_tracking 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.vehicle_dispatch_permits vdp 
    WHERE vdp.id = permit_id AND vdp.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Staff can manage tracking in their company" 
ON public.dispatch_permit_tracking 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (EXISTS (
        SELECT 1 FROM public.vehicle_dispatch_permits vdp 
        WHERE vdp.id = permit_id AND vdp.company_id = get_user_company(auth.uid()) AND
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role) OR 
         has_role(auth.uid(), 'sales_agent'::user_role))
    ))
);

-- Create function to generate permit numbers
CREATE OR REPLACE FUNCTION public.generate_dispatch_permit_number(company_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    permit_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- Get current year
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Count existing permits for this company in current year
    SELECT COUNT(*) + 1 INTO permit_count
    FROM public.vehicle_dispatch_permits 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Return formatted permit number
    RETURN 'DP-' || year_suffix || '-' || LPAD(permit_count::TEXT, 4, '0');
END;
$$;

-- Create function to update permit status and create tracking record
CREATE OR REPLACE FUNCTION public.update_dispatch_permit_status(
    permit_id_param UUID,
    new_status TEXT,
    change_reason TEXT DEFAULT NULL,
    location TEXT DEFAULT NULL,
    odometer_reading INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_status TEXT;
BEGIN
    -- Get current status
    SELECT status INTO current_status 
    FROM public.vehicle_dispatch_permits 
    WHERE id = permit_id_param;
    
    -- Update permit status
    UPDATE public.vehicle_dispatch_permits 
    SET 
        status = new_status,
        updated_at = now(),
        approved_at = CASE WHEN new_status = 'approved' THEN now() ELSE approved_at END,
        completed_at = CASE WHEN new_status = 'completed' THEN now() ELSE completed_at END,
        approved_by = CASE WHEN new_status = 'approved' THEN auth.uid() ELSE approved_by END
    WHERE id = permit_id_param;
    
    -- Create tracking record
    INSERT INTO public.dispatch_permit_tracking (
        permit_id,
        status_changed_from,
        status_changed_to,
        changed_by,
        change_reason,
        location,
        odometer_reading
    ) VALUES (
        permit_id_param,
        current_status,
        new_status,
        auth.uid(),
        change_reason,
        location,
        odometer_reading
    );
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_dispatch_permits_updated_at
    BEFORE UPDATE ON public.vehicle_dispatch_permits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_dispatch_permits_company_id ON public.vehicle_dispatch_permits(company_id);
CREATE INDEX idx_dispatch_permits_vehicle_id ON public.vehicle_dispatch_permits(vehicle_id);
CREATE INDEX idx_dispatch_permits_status ON public.vehicle_dispatch_permits(status);
CREATE INDEX idx_dispatch_permits_start_date ON public.vehicle_dispatch_permits(start_date);
CREATE INDEX idx_dispatch_permit_tracking_permit_id ON public.dispatch_permit_tracking(permit_id);