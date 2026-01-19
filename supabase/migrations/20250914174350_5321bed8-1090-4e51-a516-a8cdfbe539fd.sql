-- Add Journal Entries Tables
-- إضافة جداول القيود المحاسبية

-- القيود المحاسبية
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    journal_entry_number TEXT NOT NULL,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_number TEXT,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed', 'cancelled')),
    entry_type TEXT NOT NULL CHECK (entry_type IN ('payment', 'receipt', 'invoice', 'adjustment', 'reversal')),
    source_type TEXT NOT NULL CHECK (source_type IN ('payment', 'invoice', 'contract', 'manual')),
    source_id UUID,
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_entry_number_per_company UNIQUE (company_id, journal_entry_number),
    CONSTRAINT positive_totals CHECK (total_amount >= 0)
);

-- بنود القيود المحاسبية
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
    debit_amount NUMERIC NOT NULL DEFAULT 0,
    credit_amount NUMERIC NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT single_amount_per_line CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (debit_amount = 0 AND credit_amount > 0)
    ),
    CONSTRAINT positive_amounts CHECK (debit_amount >= 0 AND credit_amount >= 0)
);

-- الفهارس للقيود المحاسبية
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON public.journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON public.journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source_type ON public.journal_entries(source_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source_id ON public.journal_entries(source_id);

-- فهارس بنود القيود
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_entry_id ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON public.journal_entry_lines(account_id);

-- تفعيل RLS
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للقيود المحاسبية
CREATE POLICY "Users can view journal entries in their company" 
ON public.journal_entries 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage journal entries in their company" 
ON public.journal_entries 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND (
        has_role(auth.uid(), 'company_admin'::user_role) OR 
        has_role(auth.uid(), 'manager'::user_role) OR 
        has_role(auth.uid(), 'sales_agent'::user_role)
    ))
);

-- سياسات الأمان لبنود القيود
CREATE POLICY "Users can view journal entry lines in their company" 
ON public.journal_entry_lines 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.journal_entries 
        WHERE id = journal_entry_id 
        AND company_id = get_user_company(auth.uid())
    )
);

CREATE POLICY "Staff can manage journal entry lines in their company" 
ON public.journal_entry_lines 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    EXISTS (
        SELECT 1 FROM public.journal_entries je
        WHERE je.id = journal_entry_id 
        AND je.company_id = get_user_company(auth.uid())
        AND (
            has_role(auth.uid(), 'company_admin'::user_role) OR 
            has_role(auth.uid(), 'manager'::user_role) OR 
            has_role(auth.uid(), 'sales_agent'::user_role)
        )
    )
);

-- إضافة الترايقرز
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_entry_lines_updated_at BEFORE UPDATE ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- تعليقات
COMMENT ON TABLE public.journal_entries IS 'القيود المحاسبية الرئيسية';
COMMENT ON TABLE public.journal_entry_lines IS 'بنود القيود المحاسبية';