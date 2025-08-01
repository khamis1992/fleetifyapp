-- Add Arabic fields to landing page tables for multilingual support

-- Update landing_sections table to add Arabic fields
ALTER TABLE landing_sections 
ADD COLUMN IF NOT EXISTS section_name_ar TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Update landing_themes table to add Arabic fields  
ALTER TABLE landing_themes
ADD COLUMN IF NOT EXISTS theme_name_ar TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Update landing_media table to add Arabic fields
ALTER TABLE landing_media
ADD COLUMN IF NOT EXISTS alt_text_ar TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Update landing_ab_tests table to add Arabic fields
ALTER TABLE landing_ab_tests
ADD COLUMN IF NOT EXISTS test_name_ar TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Create landing_content table for dynamic content management
CREATE TABLE IF NOT EXISTS landing_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    section_key TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text',
    content_en TEXT,
    content_ar TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    UNIQUE(company_id, section_key)
);

-- Enable RLS on landing_content
ALTER TABLE landing_content ENABLE ROW LEVEL SECURITY;

-- Create policies for landing_content
CREATE POLICY "Super admins can manage all landing content"
ON landing_content
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Companies can view their landing content"
ON landing_content
FOR SELECT
USING (company_id IS NULL OR company_id = get_user_company_secure(auth.uid()));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_landing_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for landing_content
CREATE TRIGGER update_landing_content_updated_at
    BEFORE UPDATE ON landing_content
    FOR EACH ROW
    EXECUTE FUNCTION update_landing_content_updated_at();

-- Insert default landing page content
INSERT INTO landing_content (company_id, section_key, content_type, content_en, content_ar) VALUES
(NULL, 'hero_title', 'text', 'Transform Your Business with Smart Solutions', 'حوّل عملك بحلول ذكية'),
(NULL, 'hero_subtitle', 'text', 'Streamline your operations with our comprehensive business management platform', 'بسّط عملياتك مع منصة إدارة الأعمال الشاملة'),
(NULL, 'hero_cta', 'text', 'Get Started Today', 'ابدأ اليوم'),
(NULL, 'features_title', 'text', 'Powerful Features for Modern Business', 'ميزات قوية للأعمال الحديثة'),
(NULL, 'features_subtitle', 'text', 'Everything you need to manage your business efficiently', 'كل ما تحتاجه لإدارة عملك بكفاءة'),
(NULL, 'testimonials_title', 'text', 'What Our Clients Say', 'ماذا يقول عملاؤنا'),
(NULL, 'cta_title', 'text', 'Ready to Get Started?', 'مستعد للبدء؟'),
(NULL, 'cta_subtitle', 'text', 'Join thousands of businesses already using our platform', 'انضم إلى آلاف الشركات التي تستخدم منصتنا بالفعل'),
(NULL, 'cta_button', 'text', 'Start Free Trial', 'ابدأ التجربة المجانية');