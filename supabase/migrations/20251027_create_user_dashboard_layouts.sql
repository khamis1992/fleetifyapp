-- User Dashboard Layouts Table
-- Stores personalized dashboard configurations per user

CREATE TABLE IF NOT EXISTS public.user_dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  dashboard_id TEXT NOT NULL,
  layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_dashboard UNIQUE (user_id, company_id, dashboard_id)
);

-- Indexes
CREATE INDEX idx_user_dashboard_layouts_user ON public.user_dashboard_layouts(user_id);
CREATE INDEX idx_user_dashboard_layouts_company ON public.user_dashboard_layouts(company_id);
CREATE INDEX idx_user_dashboard_layouts_dashboard ON public.user_dashboard_layouts(dashboard_id);

-- Enable RLS
ALTER TABLE public.user_dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own dashboard layouts"
  ON public.user_dashboard_layouts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own dashboard layouts"
  ON public.user_dashboard_layouts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own dashboard layouts"
  ON public.user_dashboard_layouts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own dashboard layouts"
  ON public.user_dashboard_layouts FOR DELETE
  USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE public.user_dashboard_layouts IS 'Stores user-specific dashboard widget layouts and visibility preferences';
COMMENT ON COLUMN public.user_dashboard_layouts.layout_config IS 'JSONB containing widget configuration: {widgets: [{id, visible, order, size}]}';
COMMENT ON COLUMN public.user_dashboard_layouts.dashboard_id IS 'Identifier for the dashboard (e.g., "main", "fleet", "finance")';
