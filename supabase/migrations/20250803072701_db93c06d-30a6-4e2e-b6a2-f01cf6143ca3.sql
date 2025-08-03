-- Add approval fields to quotations table
ALTER TABLE public.quotations 
ADD COLUMN approval_token TEXT UNIQUE,
ADD COLUMN client_approval_url TEXT,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_by_client BOOLEAN DEFAULT FALSE,
ADD COLUMN client_comments TEXT,
ADD COLUMN approval_expires_at TIMESTAMP WITH TIME ZONE;

-- Create function to generate approval token
CREATE OR REPLACE FUNCTION generate_approval_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Create quotation approval log table
CREATE TABLE public.quotation_approval_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'sent', 'approved', 'rejected', 'expired'
    client_ip TEXT,
    client_user_agent TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on quotation approval log
ALTER TABLE public.quotation_approval_log ENABLE ROW LEVEL SECURITY;

-- Create policy for quotation approval log
CREATE POLICY "Users can view approval logs for their company quotations"
ON public.quotation_approval_log
FOR SELECT
USING (
    company_id = get_user_company(auth.uid())
);

CREATE POLICY "System can manage approval logs"
ON public.quotation_approval_log
FOR ALL
USING (true);

-- Add index for approval token lookups
CREATE INDEX idx_quotations_approval_token ON public.quotations(approval_token);