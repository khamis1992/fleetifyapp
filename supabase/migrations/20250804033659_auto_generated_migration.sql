-- إنشاء جداول النظام القانوني الذكي المحسّن

-- جدول استفسارات النظام القانوني الذكي
CREATE TABLE public.legal_ai_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  query TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'kuwait',
  response TEXT,
  response_time INTEGER,
  source_type TEXT DEFAULT 'api' CHECK (source_type IN ('api', 'cache', 'local_knowledge')),
  confidence_score NUMERIC(3,2) DEFAULT 0.85,
  cost_saved BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 1,
  customer_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- جدول تقييمات النظام القانوني الذكي
CREATE TABLE public.legal_ai_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  message_id TEXT NOT NULL,
  query TEXT,
  country TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول المذكرات القانونية
CREATE TABLE public.legal_memos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  memo_number TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  memo_type TEXT NOT NULL DEFAULT 'general' CHECK (memo_type IN ('general', 'contract_analysis', 'compliance_review', 'risk_assessment', 'debt_collection', 'dispute_resolution')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'sent')),
  template_id UUID,
  generated_by_ai BOOLEAN DEFAULT false,
  data_sources JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  approved_by UUID,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول قوالب المذكرات القانونية
CREATE TABLE public.legal_memo_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  template_name_ar TEXT,
  memo_type TEXT NOT NULL,
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول سجلات الوصول للنظام القانوني الذكي
CREATE TABLE public.legal_ai_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('customer_data', 'financial_data', 'contract_data', 'memo_generation')),
  customer_id UUID,
  data_accessed JSONB DEFAULT '{}'::jsonb,
  purpose TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين Row Level Security
ALTER TABLE public.legal_ai_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_memo_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_ai_access_logs ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لجدول legal_ai_queries
CREATE POLICY "المستخدمون يمكنهم عرض الاستفسارات في شركتهم" 
ON public.legal_ai_queries 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "الموظفون يمكنهم إدارة الاستفسارات في شركتهم" 
ON public.legal_ai_queries 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role) OR 
         has_role(auth.uid(), 'sales_agent'::user_role))));

-- سياسات الأمان لجدول legal_ai_feedback
CREATE POLICY "المستخدمون يمكنهم عرض التقييمات في شركتهم" 
ON public.legal_ai_feedback 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "الموظفون يمكنهم إدارة التقييمات في شركتهم" 
ON public.legal_ai_feedback 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role) OR 
         has_role(auth.uid(), 'sales_agent'::user_role))));

-- سياسات الأمان لجدول legal_memos
CREATE POLICY "المستخدمون يمكنهم عرض المذكرات في شركتهم" 
ON public.legal_memos 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "الموظفون يمكنهم إدارة المذكرات في شركتهم" 
ON public.legal_memos 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role) OR 
         has_role(auth.uid(), 'sales_agent'::user_role))))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role) OR 
           (company_id = get_user_company(auth.uid()) AND 
            (has_role(auth.uid(), 'company_admin'::user_role) OR 
             has_role(auth.uid(), 'manager'::user_role) OR 
             has_role(auth.uid(), 'sales_agent'::user_role))));

-- سياسات الأمان لجدول legal_memo_templates
CREATE POLICY "المستخدمون يمكنهم عرض القوالب في شركتهم" 
ON public.legal_memo_templates 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "المديرون يمكنهم إدارة القوالب في شركتهم" 
ON public.legal_memo_templates 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role))))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role) OR 
           (company_id = get_user_company(auth.uid()) AND 
            (has_role(auth.uid(), 'company_admin'::user_role) OR 
             has_role(auth.uid(), 'manager'::user_role))));

-- سياسات الأمان لجدول legal_ai_access_logs
CREATE POLICY "المديرون يمكنهم عرض سجلات الوصول في شركتهم" 
ON public.legal_ai_access_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role))));

CREATE POLICY "النظام يمكنه إدارة سجلات الوصول" 
ON public.legal_ai_access_logs 
FOR INSERT 
WITH CHECK (true);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_legal_ai_queries_company_id ON public.legal_ai_queries(company_id);
CREATE INDEX idx_legal_ai_queries_customer_id ON public.legal_ai_queries(customer_id);
CREATE INDEX idx_legal_ai_queries_created_at ON public.legal_ai_queries(created_at);

CREATE INDEX idx_legal_ai_feedback_company_id ON public.legal_ai_feedback(company_id);
CREATE INDEX idx_legal_ai_feedback_created_at ON public.legal_ai_feedback(created_at);

CREATE INDEX idx_legal_memos_company_id ON public.legal_memos(company_id);
CREATE INDEX idx_legal_memos_customer_id ON public.legal_memos(customer_id);
CREATE INDEX idx_legal_memos_status ON public.legal_memos(status);
CREATE INDEX idx_legal_memos_created_at ON public.legal_memos(created_at);

CREATE INDEX idx_legal_memo_templates_company_id ON public.legal_memo_templates(company_id);
CREATE INDEX idx_legal_memo_templates_memo_type ON public.legal_memo_templates(memo_type);

CREATE INDEX idx_legal_ai_access_logs_company_id ON public.legal_ai_access_logs(company_id);
CREATE INDEX idx_legal_ai_access_logs_user_id ON public.legal_ai_access_logs(user_id);
CREATE INDEX idx_legal_ai_access_logs_created_at ON public.legal_ai_access_logs(created_at);

-- إدراج قوالب افتراضية للمذكرات القانونية
INSERT INTO public.legal_memo_templates (company_id, template_name, template_name_ar, memo_type, template_content, variables, is_default, created_by) VALUES
-- سيتم إضافة القوالب الافتراضية بواسطة النظام عند إنشاء شركة جديدة
('00000000-0000-0000-0000-000000000000', 'General Legal Memo', 'مذكرة قانونية عامة', 'general', 
'بسم الله الرحمن الرحيم

مذكرة قانونية

التاريخ: {{date}}
إلى: {{client_name}}
من: {{company_name}}
الموضوع: {{subject}}

المحترم/ة {{client_name}},

{{content}}

التوصيات:
{{recommendations}}

وتفضلوا بقبول فائق الاحترام والتقدير.

{{company_name}}
{{signature}}', 
'["date", "client_name", "company_name", "subject", "content", "recommendations", "signature"]'::jsonb, 
true, '00000000-0000-0000-0000-000000000000');

-- دالة لتوليد رقم المذكرة القانونية
CREATE OR REPLACE FUNCTION public.generate_legal_memo_number(company_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    memo_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- Get current year
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Count existing memos for this company in current year
    SELECT COUNT(*) + 1 INTO memo_count
    FROM public.legal_memos 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Return formatted memo number
    RETURN 'MEMO-' || year_suffix || '-' || LPAD(memo_count::TEXT, 4, '0');
END;
$function$;