-- إنشاء جدول قوالب CSV للعقود الذكية
CREATE TABLE public.csv_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  template_name_ar TEXT,
  entity_type TEXT NOT NULL, -- 'contracts', 'customers', 'vehicles', etc.
  description TEXT,
  description_ar TEXT,
  headers TEXT[] NOT NULL, -- أسماء الأعمدة المطلوبة
  sample_data JSONB DEFAULT '[]'::jsonb, -- بيانات نموذجية
  field_mappings JSONB DEFAULT '{}'::jsonb, -- خرائط الحقول
  validation_rules JSONB DEFAULT '{}'::jsonb, -- قواعد التحقق
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إضافة الفهارس
CREATE INDEX idx_csv_templates_company_id ON public.csv_templates(company_id);
CREATE INDEX idx_csv_templates_entity_type ON public.csv_templates(entity_type);
CREATE INDEX idx_csv_templates_usage ON public.csv_templates(usage_count DESC, last_used_at DESC);

-- إضافة القيود
ALTER TABLE public.csv_templates ADD CONSTRAINT csv_templates_entity_type_check 
CHECK (entity_type IN ('contracts', 'customers', 'vehicles', 'invoices', 'payments'));

-- تمكين RLS
ALTER TABLE public.csv_templates ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view templates in their company" 
ON public.csv_templates 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can create templates in their company" 
ON public.csv_templates 
FOR INSERT 
WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can update templates in their company" 
ON public.csv_templates 
FOR UPDATE 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can delete templates in their company" 
ON public.csv_templates 
FOR DELETE 
USING (
  company_id = get_user_company(auth.uid()) 
  AND (
    has_role(auth.uid(), 'company_admin'::user_role) 
    OR has_role(auth.uid(), 'manager'::user_role)
    OR created_by = auth.uid()
  )
);

-- إنشاء trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION public.update_csv_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_csv_templates_updated_at
  BEFORE UPDATE ON public.csv_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_csv_templates_updated_at();

-- إدراج قوالب افتراضية للعقود
INSERT INTO public.csv_templates (
  company_id,
  template_name,
  template_name_ar,
  entity_type,
  description,
  description_ar,
  headers,
  sample_data,
  field_mappings,
  is_default
) VALUES (
  (SELECT id FROM companies LIMIT 1), -- سيتم تحديثه لكل شركة
  'Standard Contract Upload',
  'رفع العقود القياسي',
  'contracts',
  'Standard contract CSV upload template with all required fields',
  'قالب رفع العقود القياسي مع جميع الحقول المطلوبة',
  ARRAY[
    'customer_name',
    'vehicle_id', 
    'contract_number',
    'contract_type',
    'start_date',
    'end_date',
    'contract_amount',
    'monthly_amount',
    'description',
    'terms'
  ],
  '[
    {
      "customer_name": "أحمد محمد",
      "vehicle_id": "VEH001",
      "contract_number": "CNT-2024-001",
      "contract_type": "monthly_rental",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "contract_amount": "3600",
      "monthly_amount": "300",
      "description": "عقد إيجار شهري",
      "terms": "الدفع في بداية كل شهر"
    }
  ]'::jsonb,
  '{
    "customer_name": {"required": true, "type": "string"},
    "vehicle_id": {"required": true, "type": "string"},
    "contract_number": {"required": false, "type": "string"},
    "contract_type": {"required": true, "type": "enum", "values": ["daily_rental", "weekly_rental", "monthly_rental", "yearly_rental"]},
    "start_date": {"required": true, "type": "date"},
    "end_date": {"required": true, "type": "date"},
    "contract_amount": {"required": true, "type": "number"},
    "monthly_amount": {"required": false, "type": "number"}
  }'::jsonb,
  true
);