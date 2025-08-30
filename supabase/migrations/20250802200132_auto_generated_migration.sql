-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.log_contract_creation_step(uuid, uuid, text, text, text, jsonb);

-- Create the log_contract_creation_step function with proper parameter handling
CREATE OR REPLACE FUNCTION public.log_contract_creation_step(
    company_id_param uuid,
    contract_id_param uuid DEFAULT NULL,
    operation_step_param text DEFAULT 'unknown',
    status_param text DEFAULT 'pending',
    error_message_param text DEFAULT NULL,
    metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    log_id uuid;
BEGIN
    -- Insert the log entry
    INSERT INTO public.contract_creation_log (
        company_id,
        contract_id,
        operation_step,
        status,
        error_message,
        metadata,
        attempt_number,
        execution_time_ms
    ) VALUES (
        company_id_param,
        contract_id_param,
        COALESCE(operation_step_param, 'unknown'),
        COALESCE(status_param, 'pending'),
        error_message_param,
        COALESCE(metadata_param, '{}'::jsonb),
        1,
        NULL
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the calling function
    RAISE WARNING 'Failed to log contract creation step: %', SQLERRM;
    RETURN NULL;
END;
$function$;