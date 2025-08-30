-- Create user_notifications table
CREATE TABLE public.user_notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    notification_type text NOT NULL DEFAULT 'info',
    is_read boolean NOT NULL DEFAULT false,
    related_id uuid,
    related_type text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    read_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (true);

-- Create vehicle_return_forms table
CREATE TABLE public.vehicle_return_forms (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    dispatch_permit_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    returned_by uuid NOT NULL,
    return_date timestamp with time zone NOT NULL DEFAULT now(),
    return_odometer_reading integer,
    fuel_level_percentage integer DEFAULT 100,
    vehicle_condition text NOT NULL DEFAULT 'good',
    damages_reported text,
    notes text,
    return_location text,
    items_returned jsonb DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT 'pending',
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_return_forms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view return forms in their company" 
ON public.vehicle_return_forms 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can create return forms in their company" 
ON public.vehicle_return_forms 
FOR INSERT 
WITH CHECK (company_id = get_user_company(auth.uid()) AND returned_by = auth.uid());

CREATE POLICY "Users can update return forms in their company" 
ON public.vehicle_return_forms 
FOR UPDATE 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers can manage return forms in their company" 
ON public.vehicle_return_forms 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))));

-- Create function to handle permit notifications
CREATE OR REPLACE FUNCTION public.handle_permit_status_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- When permit is approved, notify the requester
    IF OLD.status != NEW.status AND NEW.status = 'approved' THEN
        INSERT INTO public.user_notifications (
            company_id,
            user_id,
            title,
            message,
            notification_type,
            related_id,
            related_type
        ) VALUES (
            NEW.company_id,
            NEW.requested_by,
            'Dispatch Permit Approved',
            'Your dispatch permit #' || NEW.permit_number || ' has been approved. Please proceed with your trip.',
            'success',
            NEW.id,
            'dispatch_permit'
        );
    END IF;
    
    -- When permit is completed, remind about return form
    IF OLD.status != NEW.status AND NEW.status = 'completed' THEN
        INSERT INTO public.user_notifications (
            company_id,
            user_id,
            title,
            message,
            notification_type,
            related_id,
            related_type
        ) VALUES (
            NEW.company_id,
            NEW.requested_by,
            'Vehicle Return Required',
            'Please complete the vehicle return form for permit #' || NEW.permit_number || '.',
            'warning',
            NEW.id,
            'dispatch_permit'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for permit status changes
CREATE TRIGGER permit_status_notification_trigger
    AFTER UPDATE ON public.vehicle_dispatch_permits
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_permit_status_notifications();

-- Create function to update return form timestamp
CREATE OR REPLACE FUNCTION public.update_return_form_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for return form updates
CREATE TRIGGER update_return_form_timestamp_trigger
    BEFORE UPDATE ON public.vehicle_return_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_return_form_timestamp();