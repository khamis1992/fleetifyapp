-- Create contract creation logging table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.contract_creation_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL,
    attempt_num INTEGER DEFAULT 1,
    error_msg TEXT,
    exec_time INTEGER, -- execution time in milliseconds
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_creation_log ENABLE ROW LEVEL SECURITY;

-- Create policies using profiles table (which is the correct table name)
CREATE POLICY "Users can view their company's contract creation logs" 
ON public.contract_creation_log 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND company_id = contract_creation_log.company_id
    )
);

CREATE POLICY "Users can insert contract creation logs for their company" 
ON public.contract_creation_log 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND company_id = contract_creation_log.company_id
    )
);

-- Create the logging function
CREATE OR REPLACE FUNCTION public.log_contract_creation_step(
    company_id_param UUID,
    contract_id_param UUID,
    step_name TEXT,
    status_param TEXT,
    attempt_num INTEGER DEFAULT 1,
    error_msg TEXT DEFAULT NULL,
    exec_time INTEGER DEFAULT NULL,
    meta JSONB DEFAULT '{}'::jsonb
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
        step_name,
        status,
        attempt_num,
        error_msg,
        exec_time,
        meta
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
END;
$function$;