
-- Create account_movement_settings table
CREATE TABLE IF NOT EXISTS public.account_movement_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    auto_create_movements BOOLEAN DEFAULT true,
    default_movement_type TEXT DEFAULT 'journal_entry',
    require_approval BOOLEAN DEFAULT false,
    approval_threshold NUMERIC DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.account_movement_settings ENABLE ROW LEVEL SECURITY;

-- Policy for selecting settings
CREATE POLICY "Users can view their company's account movement settings"
    ON public.account_movement_settings
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- Policy for inserting settings
CREATE POLICY "Users can create account movement settings for their company"
    ON public.account_movement_settings
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- Policy for updating settings
CREATE POLICY "Users can update their company's account movement settings"
    ON public.account_movement_settings
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- Policy for deleting settings
CREATE POLICY "Users can delete their company's account movement settings"
    ON public.account_movement_settings
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- Create unique constraint to ensure one settings record per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_movement_settings_company 
ON public.account_movement_settings(company_id);
