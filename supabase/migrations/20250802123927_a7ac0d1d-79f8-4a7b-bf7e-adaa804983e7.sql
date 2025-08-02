-- إنشاء جدول أنواع الحسابات الافتراضية المحسّن مع رموز الحسابات (مصحح)
CREATE TABLE IF NOT EXISTS public.default_account_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_code VARCHAR(50) NOT NULL UNIQUE,
  type_name TEXT NOT NULL,
  type_name_ar TEXT,
  account_category TEXT NOT NULL,
  description TEXT,
  default_account_pattern VARCHAR(20),
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- التحقق من عدم وجود البيانات مسبقاً قبل الإدراج
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.default_account_types LIMIT 1) THEN
    -- إدراج أنواع الحسابات الأساسية مع رموز محددة
    INSERT INTO public.default_account_types (type_code, type_name, type_name_ar, account_category, description, default_account_pattern, is_required, sort_order) VALUES
    -- حسابات الأصول
    ('CASH', 'Cash Account', 'حساب النقدية', 'assets', 'Main cash account for the company', '1110%', true, 1),
    ('RECEIVABLES', 'Accounts Receivable', 'حسابات المدينين', 'assets', 'Customer receivables account', '1120%', true, 2),
    ('CUSTOMER_DEPOSITS', 'Customer Deposits', 'أمانات العملاء', 'assets', 'Customer security deposits', '1130%', false, 3),
    ('INVENTORY', 'Inventory Account', 'حساب المخزون', 'assets', 'Inventory management account', '1140%', false, 4),
    ('PREPAID_EXPENSES', 'Prepaid Expenses', 'المصروفات المدفوعة مقدماً', 'assets', 'Prepaid expenses account', '1150%', false, 5),

    -- حسابات الالتزامات
    ('PAYABLES', 'Accounts Payable', 'حسابات الدائنين', 'liabilities', 'Vendor payables account', '2110%', true, 10),
    ('ACCRUED_EXPENSES', 'Accrued Expenses', 'المصروفات المستحقة', 'liabilities', 'Accrued expenses account', '2120%', false, 11),
    ('CUSTOMER_PREPAYMENTS', 'Customer Prepayments', 'مقدمات العملاء', 'liabilities', 'Customer advance payments', '2130%', false, 12),
    ('TAXES_PAYABLE', 'Taxes Payable', 'الضرائب المستحقة', 'liabilities', 'Tax obligations', '2140%', false, 13),

    -- حسابات الإيرادات
    ('SALES_REVENUE', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', 'General sales revenue account', '4110%', true, 20),
    ('RENTAL_REVENUE', 'Rental Revenue', 'إيرادات التأجير', 'revenue', 'Vehicle rental revenue', '4120%', true, 21),
    ('SERVICE_REVENUE', 'Service Revenue', 'إيرادات الخدمات', 'revenue', 'Service revenue account', '4130%', false, 22),
    ('OTHER_REVENUE', 'Other Revenue', 'إيرادات أخرى', 'revenue', 'Miscellaneous revenue', '4190%', false, 23),

    -- حسابات المصروفات
    ('OPERATING_EXPENSES', 'Operating Expenses', 'المصروفات التشغيلية', 'expenses', 'General operating expenses', '5110%', false, 30),
    ('MAINTENANCE_EXPENSES', 'Maintenance Expenses', 'مصروفات الصيانة', 'expenses', 'Vehicle maintenance costs', '5120%', false, 31),
    ('FUEL_EXPENSES', 'Fuel Expenses', 'مصروفات الوقود', 'expenses', 'Fuel and gas expenses', '5130%', false, 32),
    ('INSURANCE_EXPENSES', 'Insurance Expenses', 'مصروفات التأمين', 'expenses', 'Insurance premium expenses', '5140%', false, 33),
    ('DEPRECIATION_EXPENSES', 'Depreciation Expenses', 'مصروفات الإهلاك', 'expenses', 'Asset depreciation expenses', '5150%', false, 34),

    -- حسابات رأس المال
    ('CAPITAL', 'Capital Account', 'رأس المال', 'equity', 'Owner equity account', '3110%', false, 40),
    ('RETAINED_EARNINGS', 'Retained Earnings', 'الأرباح المحتجزة', 'equity', 'Accumulated retained earnings', '3120%', false, 41);
  END IF;
END $$;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_default_account_types_category ON public.default_account_types(account_category);
CREATE INDEX IF NOT EXISTS idx_default_account_types_required ON public.default_account_types(is_required);

-- إنشاء جدول قوالب الحسابات
CREATE TABLE IF NOT EXISTS public.account_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  template_name_ar TEXT,
  description TEXT,
  account_mappings JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- التحقق من عدم وجود القوالب مسبقاً
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.account_templates WHERE template_name = 'Vehicle Rental Business') THEN
    -- إدراج قالب افتراضي لشركات تأجير المركبات
    INSERT INTO public.account_templates (template_name, template_name_ar, description, account_mappings, is_default) VALUES
    ('Vehicle Rental Business', 'شركة تأجير المركبات', 'Default account setup for vehicle rental companies', '{
      "required_accounts": [
        {"type_code": "CASH", "priority": 1},
        {"type_code": "RECEIVABLES", "priority": 2},
        {"type_code": "RENTAL_REVENUE", "priority": 3},
        {"type_code": "PAYABLES", "priority": 4}
      ],
      "recommended_accounts": [
        {"type_code": "CUSTOMER_DEPOSITS", "priority": 5},
        {"type_code": "MAINTENANCE_EXPENSES", "priority": 6},
        {"type_code": "FUEL_EXPENSES", "priority": 7},
        {"type_code": "INSURANCE_EXPENSES", "priority": 8},
        {"type_code": "DEPRECIATION_EXPENSES", "priority": 9}
      ]
    }', true);
  END IF;
END $$;

-- تحديث جدول ربط الحسابات لدعم الأولوية والحالة
ALTER TABLE public.account_mappings 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mapping_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]';

-- إنشاء القيود إذا لم تكن موجودة
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'account_mappings_mapping_status_check') THEN
    ALTER TABLE public.account_mappings ADD CONSTRAINT account_mappings_mapping_status_check 
    CHECK (mapping_status IN ('active', 'inactive', 'requires_review'));
  END IF;
END $$;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_account_mappings_priority ON public.account_mappings(priority);
CREATE INDEX IF NOT EXISTS idx_account_mappings_status ON public.account_mappings(mapping_status);

-- إنشاء جدول العقود المعلقة لقيود اليومية
CREATE TABLE IF NOT EXISTS public.pending_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  contract_id UUID NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'contract_activation',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT now() + INTERVAL '5 minutes',
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 5,
  
  CONSTRAINT fk_pending_journal_entries_company FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT fk_pending_journal_entries_contract FOREIGN KEY (contract_id) REFERENCES public.contracts(id)
);

-- إنشاء القيود للجدول الجديد
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'pending_journal_entries_status_check') THEN
    ALTER TABLE public.pending_journal_entries ADD CONSTRAINT pending_journal_entries_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
  END IF;
END $$;

-- إنشاء فهارس للجدول الجديد
CREATE INDEX IF NOT EXISTS idx_pending_journal_entries_status ON public.pending_journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_pending_journal_entries_next_retry ON public.pending_journal_entries(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_pending_journal_entries_company ON public.pending_journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_pending_journal_entries_contract ON public.pending_journal_entries(contract_id);

-- تمكين RLS على الجداول الجديدة
ALTER TABLE public.default_account_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_journal_entries ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للحسابات الافتراضية (قراءة للجميع)
DROP POLICY IF EXISTS "Anyone can view default account types" ON public.default_account_types;
CREATE POLICY "Anyone can view default account types" ON public.default_account_types FOR SELECT USING (true);

-- سياسات RLS لقوالب الحسابات
DROP POLICY IF EXISTS "Anyone can view account templates" ON public.account_templates;
DROP POLICY IF EXISTS "Super admins can manage account templates" ON public.account_templates;
CREATE POLICY "Anyone can view account templates" ON public.account_templates FOR SELECT USING (true);
CREATE POLICY "Super admins can manage account templates" ON public.account_templates FOR ALL USING (has_role(auth.uid(), 'super_admin'::user_role));

-- سياسات RLS للقيود المعلقة
DROP POLICY IF EXISTS "Users can view pending entries in their company" ON public.pending_journal_entries;
DROP POLICY IF EXISTS "Managers can manage pending entries in their company" ON public.pending_journal_entries;
CREATE POLICY "Users can view pending entries in their company" ON public.pending_journal_entries FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers can manage pending entries in their company" ON public.pending_journal_entries FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))));