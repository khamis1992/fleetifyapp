-- إنشاء جدول البنوك والخزائن
CREATE TABLE public.banks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    bank_name TEXT NOT NULL,
    bank_name_ar TEXT,
    account_number TEXT NOT NULL,
    iban TEXT,
    swift_code TEXT,
    branch_name TEXT,
    branch_name_ar TEXT,
    account_type TEXT NOT NULL DEFAULT 'checking',
    currency TEXT NOT NULL DEFAULT 'KWD',
    current_balance NUMERIC DEFAULT 0,
    opening_balance NUMERIC DEFAULT 0,
    opening_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS للبنوك
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للبنوك
CREATE POLICY "المديرون يمكنهم إدارة البنوك في شركتهم" ON public.banks
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

CREATE POLICY "المستخدمون يمكنهم عرض البنوك في شركتهم" ON public.banks
FOR SELECT USING (company_id = get_user_company(auth.uid()));

-- إنشاء جدول مراكز التكلفة
CREATE TABLE public.cost_centers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    center_code TEXT NOT NULL,
    center_name TEXT NOT NULL,
    center_name_ar TEXT,
    description TEXT,
    parent_center_id UUID,
    manager_id UUID,
    budget_amount NUMERIC DEFAULT 0,
    actual_amount NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, center_code)
);

-- تفعيل RLS لمراكز التكلفة
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لمراكز التكلفة
CREATE POLICY "المديرون يمكنهم إدارة مراكز التكلفة في شركتهم" ON public.cost_centers
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

CREATE POLICY "المستخدمون يمكنهم عرض مراكز التكلفة في شركتهم" ON public.cost_centers
FOR SELECT USING (company_id = get_user_company(auth.uid()));

-- إنشاء جدول حركات البنوك
CREATE TABLE public.bank_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    bank_id UUID NOT NULL,
    transaction_number TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'transfer', 'fee'
    amount NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    description TEXT NOT NULL,
    reference_number TEXT,
    check_number TEXT,
    counterpart_bank_id UUID, -- للتحويلات بين البنوك
    journal_entry_id UUID,
    status TEXT NOT NULL DEFAULT 'completed',
    reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, transaction_number)
);

-- تفعيل RLS لحركات البنوك
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لحركات البنوك
CREATE POLICY "الموظفون يمكنهم إدارة حركات البنوك في شركتهم" ON public.bank_transactions
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))
);

CREATE POLICY "المستخدمون يمكنهم عرض حركات البنوك في شركتهم" ON public.bank_transactions
FOR SELECT USING (company_id = get_user_company(auth.uid()));

-- إضافة عمود مركز التكلفة للقيود المحاسبية
ALTER TABLE public.journal_entry_lines ADD COLUMN cost_center_id UUID;

-- إنشاء triggers للتواريخ المحدثة
CREATE TRIGGER update_banks_updated_at
    BEFORE UPDATE ON public.banks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at
    BEFORE UPDATE ON public.cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_transactions_updated_at
    BEFORE UPDATE ON public.bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- إدراج دليل الحسابات الأساسي
INSERT INTO public.chart_of_accounts (account_code, account_name, account_name_ar, account_type, balance_type, company_id, is_system) VALUES
-- الأصول
('1000', 'Assets', 'الأصول', 'asset', 'debit', '00000000-0000-0000-0000-000000000000', true),
('1100', 'Current Assets', 'الأصول المتداولة', 'asset', 'debit', '00000000-0000-0000-0000-000000000000', true),
('1110', 'Cash', 'النقدية', 'asset', 'debit', '00000000-0000-0000-0000-000000000000', true),
('1120', 'Banks', 'البنوك', 'asset', 'debit', '00000000-0000-0000-0000-000000000000', true),
('1130', 'Accounts Receivable', 'العملاء - مدينون', 'asset', 'debit', '00000000-0000-0000-0000-000000000000', true),
('1140', 'Inventory', 'المخزون', 'asset', 'debit', '00000000-0000-0000-0000-000000000000', true),
('1200', 'Fixed Assets', 'الأصول الثابتة', 'asset', 'debit', '00000000-0000-0000-0000-000000000000', true),
('1210', 'Equipment', 'المعدات', 'asset', 'debit', '00000000-0000-0000-0000-000000000000', true),
('1220', 'Vehicles', 'المركبات', 'asset', 'debit', '00000000-0000-0000-0000-000000000000', true),
('1230', 'Buildings', 'المباني', 'asset', 'debit', '00000000-0000-0000-0000-000000000000', true),
('1250', 'Accumulated Depreciation', 'مجمع الإهلاك', 'asset', 'credit', '00000000-0000-0000-0000-000000000000', true),

-- الخصوم
('2000', 'Liabilities', 'الخصوم', 'liability', 'credit', '00000000-0000-0000-0000-000000000000', true),
('2100', 'Current Liabilities', 'الخصوم المتداولة', 'liability', 'credit', '00000000-0000-0000-0000-000000000000', true),
('2110', 'Accounts Payable', 'الموردون - دائنون', 'liability', 'credit', '00000000-0000-0000-0000-000000000000', true),
('2120', 'Accrued Expenses', 'المصاريف المستحقة', 'liability', 'credit', '00000000-0000-0000-0000-000000000000', true),
('2130', 'Short-term Loans', 'القروض قصيرة الأجل', 'liability', 'credit', '00000000-0000-0000-0000-000000000000', true),
('2200', 'Long-term Liabilities', 'الخصوم طويلة الأجل', 'liability', 'credit', '00000000-0000-0000-0000-000000000000', true),
('2210', 'Long-term Loans', 'القروض طويلة الأجل', 'liability', 'credit', '00000000-0000-0000-0000-000000000000', true),

-- حقوق الملكية
('3000', 'Equity', 'حقوق الملكية', 'equity', 'credit', '00000000-0000-0000-0000-000000000000', true),
('3100', 'Capital', 'رأس المال', 'equity', 'credit', '00000000-0000-0000-0000-000000000000', true),
('3200', 'Retained Earnings', 'الأرباح المحتجزة', 'equity', 'credit', '00000000-0000-0000-0000-000000000000', true),

-- الإيرادات
('4000', 'Revenue', 'الإيرادات', 'revenue', 'credit', '00000000-0000-0000-0000-000000000000', true),
('4100', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', 'credit', '00000000-0000-0000-0000-000000000000', true),
('4110', 'Car Rental Revenue', 'إيرادات تأجير السيارات', 'revenue', 'credit', '00000000-0000-0000-0000-000000000000', true),
('4200', 'Other Revenue', 'إيرادات أخرى', 'revenue', 'credit', '00000000-0000-0000-0000-000000000000', true),

-- المصاريف
('5000', 'Expenses', 'المصاريف', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true),
('5100', 'Operating Expenses', 'المصاريف التشغيلية', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true),
('5110', 'Salaries and Wages', 'الرواتب والأجور', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true),
('5120', 'Rent Expense', 'مصاريف الإيجار', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true),
('5130', 'Utilities', 'المرافق العامة', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true),
('5140', 'Insurance Expense', 'مصاريف التأمين', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true),
('5150', 'Maintenance and Repairs', 'الصيانة والإصلاحات', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true),
('5160', 'Fuel Expense', 'مصاريف الوقود', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true),
('5200', 'Administrative Expenses', 'المصاريف الإدارية', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true),
('5210', 'Office Supplies', 'مستلزمات المكتب', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true),
('5220', 'Professional Fees', 'الأتعاب المهنية', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true),
('5300', 'Depreciation Expense', 'مصاريف الإهلاك', 'expense', 'debit', '00000000-0000-0000-0000-000000000000', true);