-- إضافة حقل مركز التكلفة للفواتير
ALTER TABLE public.invoices 
ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id);

-- إضافة حقل لربط فواتير الأصول الثابتة
ALTER TABLE public.invoices 
ADD COLUMN fixed_asset_id UUID REFERENCES public.fixed_assets(id);

-- إضافة حقل لربط فقرات الفاتورة بمراكز التكلفة
ALTER TABLE public.invoice_items 
ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id);

-- إنشاء جدول تحليل الفواتير حسب مراكز التكلفة
CREATE TABLE public.invoice_cost_center_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id),
  invoice_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_invoices INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  budget_amount NUMERIC DEFAULT 0,
  variance_amount NUMERIC DEFAULT 0,
  variance_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS للجدول الجديد
ALTER TABLE public.invoice_cost_center_analysis ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS
CREATE POLICY "Users can view analysis in their company" 
ON public.invoice_cost_center_analysis 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage analysis in their company" 
ON public.invoice_cost_center_analysis 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)));

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX idx_invoice_cost_center_analysis_company_period ON public.invoice_cost_center_analysis(company_id, period_start, period_end);
CREATE INDEX idx_invoice_cost_center_analysis_cost_center ON public.invoice_cost_center_analysis(cost_center_id);

-- إنشاء trigger لتحديث التاريخ
CREATE TRIGGER update_invoice_cost_center_analysis_updated_at
  BEFORE UPDATE ON public.invoice_cost_center_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();