-- Fix security issues for the new functions we created

-- Update the generate_dispatch_permit_number function with proper search_path
CREATE OR REPLACE FUNCTION public.generate_dispatch_permit_number(company_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Update the update_dispatch_permit_status function with proper search_path
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
SET search_path TO 'public'
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