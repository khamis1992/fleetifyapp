-- Create contract drafts table for auto-save functionality
CREATE TABLE public.contract_drafts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    current_step INTEGER NOT NULL DEFAULT 0,
    last_saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own draft contracts"
ON public.contract_drafts
FOR ALL
USING (created_by = auth.uid());

-- Add update trigger
CREATE TRIGGER update_contract_drafts_updated_at
    BEFORE UPDATE ON public.contract_drafts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();;
