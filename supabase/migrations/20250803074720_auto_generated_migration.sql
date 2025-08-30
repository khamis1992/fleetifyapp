-- Fix the generate_approval_token function to use proper encoding
CREATE OR REPLACE FUNCTION public.generate_approval_token()
RETURNS text
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$function$;

-- Update quotations table to ensure approval fields are properly set
UPDATE public.quotations 
SET 
  approval_token = public.generate_approval_token(),
  approval_expires_at = NOW() + INTERVAL '30 days'
WHERE approval_token IS NULL AND status = 'pending';