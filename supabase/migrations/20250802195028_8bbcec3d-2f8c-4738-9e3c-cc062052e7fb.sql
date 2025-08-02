-- Create the corrected log_contract_creation_step function
CREATE OR REPLACE FUNCTION public.log_contract_creation_step(
    company_id_param UUID,
    contract_id_param UUID DEFAULT NULL,
    step_name TEXT,
    status_param TEXT,
    attempt_num INTEGER DEFAULT 1,
    error_msg TEXT DEFAULT NULL,
    exec_time INTEGER DEFAULT NULL,
    meta JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.contract_creation_log (
        company_id,
        contract_id,
        operation_step,
        status,
        attempt_number,
        error_message,
        execution_time_ms,
        metadata
    ) VALUES (
        company_id_param,
        contract_id_param,
        step_name,
        status_param,
        attempt_num,
        error_msg,
        exec_time,
        meta
    );
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the main operation
    RAISE WARNING 'Failed to log contract creation step: %', SQLERRM;
END;
$$;