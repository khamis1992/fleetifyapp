-- Drop triggers first to avoid dependency issues
DROP TRIGGER IF EXISTS permit_status_notification_trigger ON public.vehicle_dispatch_permits;
DROP TRIGGER IF EXISTS update_return_form_timestamp_trigger ON public.vehicle_return_forms;

-- Now drop the functions
DROP FUNCTION IF EXISTS public.handle_permit_status_notifications();
DROP FUNCTION IF EXISTS public.update_return_form_timestamp();

-- Recreate with proper search path security
CREATE OR REPLACE FUNCTION public.handle_permit_status_notifications()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_return_form_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER permit_status_notification_trigger
    AFTER UPDATE ON public.vehicle_dispatch_permits
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_permit_status_notifications();

CREATE TRIGGER update_return_form_timestamp_trigger
    BEFORE UPDATE ON public.vehicle_return_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_return_form_timestamp();