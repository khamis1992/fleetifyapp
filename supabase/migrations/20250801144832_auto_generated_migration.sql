-- Create landing page management tables (without default data)

-- Landing themes for design customization
CREATE TABLE public.landing_themes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    theme_name TEXT NOT NULL,
    theme_name_ar TEXT,
    colors JSONB DEFAULT '{}' NOT NULL,
    fonts JSONB DEFAULT '{}' NOT NULL,
    spacing JSONB DEFAULT '{}' NOT NULL,
    custom_css TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Landing sections (hero, features, testimonials, etc.)
CREATE TABLE public.landing_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL, -- 'hero', 'features', 'testimonials', 'cta', 'about', 'contact'
    section_name TEXT NOT NULL,
    section_name_ar TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}' NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Landing content for each section
CREATE TABLE public.landing_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id UUID REFERENCES public.landing_sections(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- 'text', 'image', 'video', 'button', 'form'
    content_key TEXT NOT NULL, -- 'title', 'subtitle', 'description', 'button_text', etc.
    content_value TEXT,
    content_value_ar TEXT,
    media_url TEXT,
    link_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Media library for landing pages
CREATE TABLE public.landing_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'image', 'video', 'document'
    file_size BIGINT,
    mime_type TEXT,
    alt_text TEXT,
    alt_text_ar TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Landing page settings and configurations
CREATE TABLE public.landing_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(company_id, setting_key)
);

-- Landing page analytics
CREATE TABLE public.landing_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    page_path TEXT DEFAULT '/',
    visitor_id TEXT,
    session_id TEXT,
    event_type TEXT NOT NULL, -- 'page_view', 'button_click', 'form_submit', 'section_view'
    event_data JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    country TEXT,
    city TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- A/B testing variants
CREATE TABLE public.landing_ab_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    test_name_ar TEXT,
    description TEXT,
    variant_a_config JSONB DEFAULT '{}',
    variant_b_config JSONB DEFAULT '{}',
    traffic_split INTEGER DEFAULT 50, -- percentage for variant B
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
    winner_variant TEXT, -- 'a', 'b', or null
    conversion_goal TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.landing_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_ab_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for landing_themes
CREATE POLICY "Super admins can manage all landing themes"
ON public.landing_themes FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Companies can manage their landing themes"
ON public.landing_themes FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Users can view their company themes"
ON public.landing_themes FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- RLS Policies for landing_sections
CREATE POLICY "Super admins can manage all landing sections"
ON public.landing_sections FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Companies can manage their landing sections"
ON public.landing_sections FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Users can view their company sections"
ON public.landing_sections FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- RLS Policies for landing_content
CREATE POLICY "Super admins can manage all landing content"
ON public.landing_content FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Companies can manage their landing content"
ON public.landing_content FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.landing_sections ls 
    WHERE ls.id = landing_content.section_id 
    AND ls.company_id = get_user_company(auth.uid()) 
    AND has_role(auth.uid(), 'company_admin')
));

CREATE POLICY "Users can view their company content"
ON public.landing_content FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.landing_sections ls 
    WHERE ls.id = landing_content.section_id 
    AND ls.company_id = get_user_company(auth.uid())
));

-- RLS Policies for landing_media
CREATE POLICY "Super admins can manage all landing media"
ON public.landing_media FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Companies can manage their landing media"
ON public.landing_media FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Users can view their company media"
ON public.landing_media FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- RLS Policies for landing_settings
CREATE POLICY "Super admins can manage all landing settings"
ON public.landing_settings FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Companies can manage their landing settings"
ON public.landing_settings FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Users can view their company settings"
ON public.landing_settings FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- RLS Policies for landing_analytics (read-only for most users)
CREATE POLICY "Super admins can manage all landing analytics"
ON public.landing_analytics FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Companies can view their landing analytics"
ON public.landing_analytics FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "System can insert analytics"
ON public.landing_analytics FOR INSERT 
WITH CHECK (true);

-- RLS Policies for landing_ab_tests
CREATE POLICY "Super admins can manage all A/B tests"
ON public.landing_ab_tests FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Companies can manage their A/B tests"
ON public.landing_ab_tests FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND has_role(auth.uid(), 'company_admin'));

CREATE POLICY "Users can view their company A/B tests"
ON public.landing_ab_tests FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_landing_sections_company_sort ON public.landing_sections(company_id, sort_order);
CREATE INDEX idx_landing_content_section_sort ON public.landing_content(section_id, sort_order);
CREATE INDEX idx_landing_media_company_type ON public.landing_media(company_id, file_type);
CREATE INDEX idx_landing_analytics_company_date ON public.landing_analytics(company_id, created_at);
CREATE INDEX idx_landing_analytics_event_type ON public.landing_analytics(event_type, created_at);