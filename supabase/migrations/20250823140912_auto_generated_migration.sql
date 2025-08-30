-- إنشاء جدول إعدادات الغرامات المتأخرة
CREATE TABLE IF NOT EXISTS public.late_fine_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    fine_type TEXT NOT NULL CHECK (fine_type IN ('percentage', 'fixed_amount')),
    fine_rate NUMERIC NOT NULL DEFAULT 1.0,
    grace_period_days INTEGER NOT NULL DEFAULT 7,
    max_fine_amount NUMERIC DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- إنشاء فهرس على company_id
CREATE INDEX IF NOT EXISTS idx_late_fine_settings_company_id ON public.late_fine_settings(company_id);

-- إنشاء فهرس على الإعدادات النشطة
CREATE INDEX IF NOT EXISTS idx_late_fine_settings_active ON public.late_fine_settings(company_id, is_active) WHERE is_active = true;

-- إنشاء trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_late_fine_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_late_fine_settings_updated_at
    BEFORE UPDATE ON public.late_fine_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_late_fine_settings_updated_at();

-- تمكين RLS
ALTER TABLE public.late_fine_settings ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view fine settings in their company"
    ON public.late_fine_settings FOR SELECT
    USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage fine settings in their company"
    ON public.late_fine_settings FOR ALL
    USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR 
        (company_id = get_user_company(auth.uid()) AND 
         (has_role(auth.uid(), 'company_admin'::user_role) OR 
          has_role(auth.uid(), 'manager'::user_role)))
    );

-- إضافة تعليقات
COMMENT ON TABLE public.late_fine_settings IS 'إعدادات نظام الغرامات المتأخرة لكل شركة';
COMMENT ON COLUMN public.late_fine_settings.fine_type IS 'نوع الغرامة: percentage (نسبة مئوية) أو fixed_amount (مبلغ ثابت)';
COMMENT ON COLUMN public.late_fine_settings.fine_rate IS 'معدل الغرامة: نسبة مئوية أو مبلغ ثابت يومي';
COMMENT ON COLUMN public.late_fine_settings.grace_period_days IS 'فترة السماح بالأيام قبل تطبيق الغرامة';
COMMENT ON COLUMN public.late_fine_settings.max_fine_amount IS 'الحد الأقصى لمبلغ الغرامة (0 = غير محدود)';