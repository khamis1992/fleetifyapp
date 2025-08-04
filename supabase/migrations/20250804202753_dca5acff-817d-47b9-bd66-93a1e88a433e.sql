-- Create table for AI analysis results
CREATE TABLE IF NOT EXISTS public.ai_analysis_results (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    analysis_type text NOT NULL,
    results jsonb NOT NULL DEFAULT '{}',
    confidence_score numeric DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE public.ai_analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view analysis results in their company" 
ON public.ai_analysis_results 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can insert analysis results for their company" 
ON public.ai_analysis_results 
FOR INSERT 
WITH CHECK (company_id = get_user_company(auth.uid()));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_company_date 
ON public.ai_analysis_results(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_type 
ON public.ai_analysis_results(company_id, analysis_type);