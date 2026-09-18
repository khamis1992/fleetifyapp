-- Update contracts table to support new status flow
-- Add new status types and update default
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS last_payment_check_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;

-- Create function to check contract payment status
CREATE OR REPLACE FUNCTION public.check_contract_payment_status(contract_id_param uuid)
RETURNS TABLE(
    is_overdue boolean,
    overdue_amount numeric,
    days_overdue integer,
    last_payment_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    contract_record record;
    total_paid numeric := 0;
    expected_paid numeric := 0;
    months_elapsed integer;
    last_payment date;
BEGIN
    -- Get contract details
    SELECT * INTO contract_record
    FROM public.contracts
    WHERE id = contract_id_param
    AND status IN ('active', 'suspended');
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::numeric, 0, null::date;
        RETURN;
    END IF;
    
    -- Calculate total payments made
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.payments
    WHERE contract_id = contract_id_param
    AND payment_status = 'completed'
    AND payment_type = 'receipt';
    
    -- Get last payment date
    SELECT MAX(payment_date) INTO last_payment
    FROM public.payments
    WHERE contract_id = contract_id_param
    AND payment_status = 'completed'
    AND payment_type = 'receipt';
    
    -- Calculate expected payment based on months elapsed
    months_elapsed := EXTRACT(MONTH FROM AGE(CURRENT_DATE, contract_record.start_date));
    IF months_elapsed < 0 THEN
        months_elapsed := 0;
    END IF;
    
    expected_paid := contract_record.monthly_amount * months_elapsed;
    
    -- Check if overdue
    IF total_paid < expected_paid THEN
        RETURN QUERY SELECT 
            true,
            expected_paid - total_paid,
            CASE 
                WHEN last_payment IS NULL THEN 
                    EXTRACT(DAY FROM AGE(CURRENT_DATE, contract_record.start_date))::integer
                ELSE 
                    EXTRACT(DAY FROM AGE(CURRENT_DATE, last_payment + INTERVAL '30 days'))::integer
            END,
            last_payment;
    ELSE
        RETURN QUERY SELECT false, 0::numeric, 0, last_payment;
    END IF;
END;
$$;

-- Create function to update contract statuses based on conditions
CREATE OR REPLACE FUNCTION public.update_contract_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    contract_rec record;
    payment_status record;
BEGIN
    -- Update expired contracts
    UPDATE public.contracts 
    SET 
        status = 'expired',
        expired_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE status IN ('active', 'suspended')
    AND end_date < CURRENT_DATE
    AND status != 'expired';
    
    -- Check each active contract for payment issues
    FOR contract_rec IN 
        SELECT id, company_id, contract_number, monthly_amount
        FROM public.contracts 
        WHERE status = 'active'
        AND start_date <= CURRENT_DATE
        AND end_date >= CURRENT_DATE
    LOOP
        -- Check payment status
        SELECT * INTO payment_status
        FROM public.check_contract_payment_status(contract_rec.id);
        
        -- Suspend contract if overdue for more than 30 days
        IF payment_status.is_overdue AND payment_status.days_overdue > 30 THEN
            UPDATE public.contracts
            SET 
                status = 'suspended',
                suspension_reason = 'Outstanding payment: ' || payment_status.overdue_amount::text || ' KWD overdue for ' || payment_status.days_overdue::text || ' days',
                last_payment_check_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = contract_rec.id;
            
            -- Log the suspension
            INSERT INTO public.contract_operations_log (
                contract_id,
                company_id,
                operation_type,
                operation_details,
                performed_by
            ) VALUES (
                contract_rec.id,
                contract_rec.company_id,
                'suspended',
                jsonb_build_object(
                    'reason', 'automatic_suspension',
                    'overdue_amount', payment_status.overdue_amount,
                    'days_overdue', payment_status.days_overdue,
                    'contract_number', contract_rec.contract_number
                ),
                null -- System operation
            );
        END IF;
    END LOOP;
    
    -- Update last payment check date for all checked contracts
    UPDATE public.contracts 
    SET last_payment_check_date = CURRENT_TIMESTAMP
    WHERE status IN ('active', 'suspended')
    AND (last_payment_check_date IS NULL OR last_payment_check_date < CURRENT_DATE);
END;
$$;

-- Create trigger to set contracts as active by default when created
CREATE OR REPLACE FUNCTION public.set_contract_default_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Set default status to active if not specified
    IF NEW.status IS NULL OR NEW.status = 'draft' THEN
        NEW.status := 'active';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for new contracts
DROP TRIGGER IF EXISTS set_contract_default_status_trigger ON public.contracts;
CREATE TRIGGER set_contract_default_status_trigger
    BEFORE INSERT ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_contract_default_status();

-- Schedule automatic status updates (requires pg_cron extension)
-- This will run every hour to check contract statuses
SELECT cron.schedule(
    'update-contract-statuses',
    '0 * * * *', -- Every hour
    $$
    SELECT public.update_contract_statuses();
    $$
) WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');;
