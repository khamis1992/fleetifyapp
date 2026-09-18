
-- Function to generate payment schedules for all contracts missing them
CREATE OR REPLACE FUNCTION public.generate_missing_payment_schedules()
RETURNS TABLE(
    contract_id uuid,
    contract_number text,
    schedules_created integer,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    rec RECORD;
    schedule_count INTEGER;
    v_error_message TEXT;
BEGIN
    -- Loop through all active contracts without payment schedules
    FOR rec IN 
        SELECT 
            c.id,
            c.contract_number,
            c.company_id,
            c.start_date,
            c.end_date,
            c.contract_amount
        FROM contracts c
        WHERE c.status IN ('active', 'pending')
          AND c.contract_amount > 0
          AND c.start_date IS NOT NULL
          AND c.end_date IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM contract_payment_schedules cps 
              WHERE cps.contract_id = c.id
          )
        ORDER BY c.created_at
    LOOP
        BEGIN
            -- Create payment schedules for this contract (monthly plan)
            SELECT COUNT(*) INTO schedule_count
            FROM public.create_payment_schedule_invoices(
                rec.id,
                'monthly',
                NULL,
                rec.start_date
            );
            
            contract_id := rec.id;
            contract_number := rec.contract_number;
            schedules_created := schedule_count;
            status := 'success';
            RETURN NEXT;
            
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            
            contract_id := rec.id;
            contract_number := rec.contract_number;
            schedules_created := 0;
            status := 'error: ' || v_error_message;
            RETURN NEXT;
        END;
    END LOOP;
    
    RETURN;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_missing_payment_schedules() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_missing_payment_schedules() TO service_role;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job to run daily at 2 AM Qatar time (UTC+3, so 11 PM UTC)
SELECT cron.schedule(
    'generate-missing-payment-schedules',
    '0 23 * * *',  -- Run at 23:00 UTC (2 AM Qatar time)
    $$SELECT * FROM public.generate_missing_payment_schedules()$$
);

-- Add comment for documentation
COMMENT ON FUNCTION public.generate_missing_payment_schedules() IS 
'Automatically generates payment schedules for all active contracts that are missing them. 
Runs daily via cron job at 2 AM Qatar time.';
;
