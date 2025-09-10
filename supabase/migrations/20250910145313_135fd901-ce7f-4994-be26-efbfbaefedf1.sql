-- إضافة الحقول الجديدة لجدول الشركات لدعم النظام المعياري
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'car_rental' CHECK (business_type IN ('car_rental', 'real_estate', 'retail', 'medical', 'manufacturing', 'restaurant', 'logistics', 'education', 'consulting', 'construction')),
ADD COLUMN IF NOT EXISTS industry_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS active_modules TEXT[] DEFAULT ARRAY['core', 'finance'],
ADD COLUMN IF NOT EXISTS company_template TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS custom_branding JSONB DEFAULT '{}';

-- تحديث الشركات الموجودة لتكون من نوع تأجير السيارات
UPDATE public.companies 
SET business_type = 'car_rental',
    active_modules = ARRAY['core', 'finance', 'vehicles', 'contracts', 'customers']
WHERE business_type IS NULL OR business_type = 'car_rental';

-- إنشاء جدول قوالب الأعمال (Business Templates)
CREATE TABLE IF NOT EXISTS public.business_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_name TEXT NOT NULL,
    template_name_ar TEXT,
    business_type TEXT NOT NULL,
    description TEXT,
    description_ar TEXT,
    default_modules TEXT[] NOT NULL DEFAULT ARRAY['core', 'finance'],
    default_chart_accounts JSONB DEFAULT '{}',
    default_settings JSONB DEFAULT '{}',
    icon_name TEXT,
    color_scheme JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إدراج القوالب الأساسية
INSERT INTO public.business_templates (template_name, template_name_ar, business_type, description, description_ar, default_modules, icon_name) VALUES
('Car Rental Management', 'إدارة تأجير السيارات', 'car_rental', 'Complete car rental management system', 'نظام إدارة تأجير السيارات المتكامل', ARRAY['core', 'finance', 'vehicles', 'contracts', 'customers'], 'Car'),
('Real Estate Management', 'إدارة العقارات', 'real_estate', 'Property rental and sales management', 'إدارة تأجير وبيع العقارات', ARRAY['core', 'finance', 'properties', 'contracts', 'tenants'], 'Building'),
('Retail Management', 'إدارة التجارة', 'retail', 'Retail and inventory management system', 'نظام إدارة التجارة والمخزون', ARRAY['core', 'finance', 'inventory', 'sales', 'suppliers'], 'Store'),
('Medical Practice', 'العيادة الطبية', 'medical', 'Medical practice management system', 'نظام إدارة العيادات الطبية', ARRAY['core', 'finance', 'patients', 'appointments', 'medical_records'], 'Stethoscope'),
('Restaurant Management', 'إدارة المطاعم', 'restaurant', 'Restaurant and food service management', 'إدارة المطاعم وخدمات الطعام', ARRAY['core', 'finance', 'menu', 'orders', 'inventory'], 'UtensilsCrossed');

-- إنشاء جدول إعدادات الوحدات
CREATE TABLE IF NOT EXISTS public.module_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    module_name TEXT NOT NULL,
    module_config JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    version TEXT DEFAULT '1.0',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID,
    UNIQUE(company_id, module_name)
);

-- تمكين RLS على الجداول الجديدة
ALTER TABLE public.business_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لقوالب الأعمال
CREATE POLICY "Anyone can view business templates" ON public.business_templates
    FOR SELECT USING (is_active = true);

-- سياسات RLS لإعدادات الوحدات
CREATE POLICY "Users can view module settings in their company" ON public.module_settings
    FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage module settings in their company" ON public.module_settings
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR 
        (company_id = get_user_company(auth.uid()) AND 
         (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
    );

-- تحديث الفهارس للأداء
CREATE INDEX IF NOT EXISTS idx_companies_business_type ON public.companies(business_type);
CREATE INDEX IF NOT EXISTS idx_companies_active_modules ON public.companies USING GIN(active_modules);
CREATE INDEX IF NOT EXISTS idx_module_settings_company_module ON public.module_settings(company_id, module_name);