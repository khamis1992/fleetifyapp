-- Enable RLS on legal_consultations if not already enabled
ALTER TABLE public.legal_consultations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their company legal consultations" ON public.legal_consultations;
DROP POLICY IF EXISTS "Users can insert legal consultations for their company" ON public.legal_consultations;

-- Allow users to view their company's legal consultations
CREATE POLICY "Users can view their company legal consultations"
  ON public.legal_consultations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Allow users to insert legal consultations for their company
CREATE POLICY "Users can insert legal consultations for their company"
  ON public.legal_consultations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.employees WHERE user_id = auth.uid() AND is_active = true
    )
  );;
