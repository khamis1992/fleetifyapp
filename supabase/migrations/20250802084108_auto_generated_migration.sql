-- Fix the log_contract_creation_step function to use the correct column name
CREATE OR REPLACE FUNCTION public.log_contract_creation_step(
    company_id_param uuid,
    contract_id_param uuid,
    step_name text,
    status_param text,
    attempt_num integer DEFAULT 1,
    error_msg text DEFAULT NULL,
    exec_time integer DEFAULT NULL,
    meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.contract_creation_log (
        company_id,
        contract_id,
        operation_step,  -- Changed from step_name to operation_step
        status,
        attempt_number,
        error_message,
        execution_time_ms,
        metadata
    ) VALUES (
        company_id_param,
        contract_id_param,
        step_name,       -- This maps to operation_step column
        status_param,
        attempt_num,
        error_msg,
        exec_time,
        meta
    );
END;
$function$;