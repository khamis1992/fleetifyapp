-- Financial System Database Schema

-- Chart of Accounts
CREATE TABLE public.chart_of_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    account_code VARCHAR(20) NOT NULL,
    account_name TEXT NOT NULL,
    account_name_ar TEXT,
    account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    account_subtype TEXT,
    parent_account_id UUID REFERENCES public.chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    balance_type TEXT NOT NULL CHECK (balance_type IN ('debit', 'credit')),
    current_balance DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, account_code)
);

-- Accounting Periods
CREATE TABLE public.accounting_periods (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    period_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
    is_adjustment_period BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journal Entries
CREATE TABLE public.journal_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    accounting_period_id UUID REFERENCES public.accounting_periods(id),
    reference_type TEXT,
    reference_id UUID,
    description TEXT NOT NULL,
    total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
    created_by UUID,
    posted_by UUID,
    posted_at TIMESTAMP WITH TIME ZONE,
    reversed_by UUID,
    reversed_at TIMESTAMP WITH TIME ZONE,
    reversal_entry_id UUID REFERENCES public.journal_entries(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, entry_number)
);

-- Journal Entry Lines
CREATE TABLE public.journal_entry_lines (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
    line_description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    line_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Financial Transactions
CREATE TABLE public.transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    transaction_number VARCHAR(50) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'expense', 'transfer', 'adjustment')),
    reference_number VARCHAR(100),
    customer_id UUID REFERENCES public.customers(id),
    vendor_id UUID,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT DEFAULT 'KWD',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, transaction_number)
);

-- Vendors
CREATE TABLE public.vendors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    vendor_code VARCHAR(20) NOT NULL,
    vendor_name TEXT NOT NULL,
    vendor_name_ar TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    address_ar TEXT,
    tax_number TEXT,
    payment_terms INTEGER DEFAULT 30,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, vendor_code)
);

-- Invoices
CREATE TABLE public.invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    customer_id UUID REFERENCES public.customers(id),
    vendor_id UUID REFERENCES public.vendors(id),
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('sales', 'purchase', 'service')),
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    balance_due DECIMAL(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'KWD',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    notes TEXT,
    terms TEXT,
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, invoice_number)
);

-- Invoice Items
CREATE TABLE public.invoice_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    item_description_ar TEXT,
    quantity DECIMAL(10,3) DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    account_id UUID REFERENCES public.chart_of_accounts(id),
    line_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    payment_number VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'check', 'bank_transfer', 'credit_card')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('received', 'made')),
    customer_id UUID REFERENCES public.customers(id),
    vendor_id UUID REFERENCES public.vendors(id),
    invoice_id UUID REFERENCES public.invoices(id),
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT DEFAULT 'KWD',
    reference_number VARCHAR(100),
    bank_account TEXT,
    check_number VARCHAR(50),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled')),
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, payment_number)
);

-- Budgets
CREATE TABLE public.budgets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    budget_name TEXT NOT NULL,
    budget_year INTEGER NOT NULL,
    accounting_period_id UUID REFERENCES public.accounting_periods(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'closed')),
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_expenses DECIMAL(15,2) DEFAULT 0,
    net_income DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Budget Items
CREATE TABLE public.budget_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
    budgeted_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    actual_amount DECIMAL(15,2) DEFAULT 0,
    variance_amount DECIMAL(15,2) DEFAULT 0,
    variance_percentage DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fixed Assets
CREATE TABLE public.fixed_assets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    asset_code VARCHAR(20) NOT NULL,
    asset_name TEXT NOT NULL,
    asset_name_ar TEXT,
    category TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_cost DECIMAL(15,2) NOT NULL,
    accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
    book_value DECIMAL(15,2) NOT NULL,
    salvage_value DECIMAL(15,2) DEFAULT 0,
    useful_life_years INTEGER NOT NULL,
    depreciation_method TEXT NOT NULL DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'units_of_production')),
    location TEXT,
    serial_number TEXT,
    condition_status TEXT DEFAULT 'good' CHECK (condition_status IN ('excellent', 'good', 'fair', 'poor', 'disposed')),
    disposal_date DATE,
    disposal_amount DECIMAL(15,2),
    notes TEXT,
    asset_account_id UUID REFERENCES public.chart_of_accounts(id),
    depreciation_account_id UUID REFERENCES public.chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, asset_code)
);

-- Depreciation Records
CREATE TABLE public.depreciation_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fixed_asset_id UUID NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
    depreciation_date DATE NOT NULL,
    depreciation_amount DECIMAL(15,2) NOT NULL,
    accumulated_depreciation DECIMAL(15,2) NOT NULL,
    book_value DECIMAL(15,2) NOT NULL,
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    period_type TEXT NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depreciation_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Chart of Accounts
CREATE POLICY "Users can view COA in their company" ON public.chart_of_accounts
FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage COA in their company" ON public.chart_of_accounts
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

-- RLS Policies for Accounting Periods
CREATE POLICY "Users can view periods in their company" ON public.accounting_periods
FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage periods in their company" ON public.accounting_periods
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

-- RLS Policies for Journal Entries
CREATE POLICY "Users can view journal entries in their company" ON public.journal_entries
FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Finance staff can manage journal entries" ON public.journal_entries
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

-- RLS Policies for Journal Entry Lines
CREATE POLICY "Users can view journal lines in their company" ON public.journal_entry_lines
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.journal_entries je 
        WHERE je.id = journal_entry_id AND je.company_id = get_user_company(auth.uid())
    )
);

CREATE POLICY "Finance staff can manage journal lines" ON public.journal_entry_lines
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.journal_entries je 
        WHERE je.id = journal_entry_id AND je.company_id = get_user_company(auth.uid())
        AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
    )
);

-- RLS Policies for Transactions
CREATE POLICY "Users can view transactions in their company" ON public.transactions
FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage transactions in their company" ON public.transactions
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))
);

-- RLS Policies for Vendors
CREATE POLICY "Users can view vendors in their company" ON public.vendors
FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage vendors in their company" ON public.vendors
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))
);

-- RLS Policies for Invoices
CREATE POLICY "Users can view invoices in their company" ON public.invoices
FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage invoices in their company" ON public.invoices
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))
);

-- RLS Policies for Invoice Items
CREATE POLICY "Users can view invoice items in their company" ON public.invoice_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.invoices i 
        WHERE i.id = invoice_id AND i.company_id = get_user_company(auth.uid())
    )
);

CREATE POLICY "Staff can manage invoice items" ON public.invoice_items
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.invoices i 
        WHERE i.id = invoice_id AND i.company_id = get_user_company(auth.uid())
        AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))
    )
);

-- RLS Policies for Payments
CREATE POLICY "Users can view payments in their company" ON public.payments
FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage payments in their company" ON public.payments
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))
);

-- RLS Policies for Budgets
CREATE POLICY "Users can view budgets in their company" ON public.budgets
FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage budgets in their company" ON public.budgets
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

-- RLS Policies for Budget Items
CREATE POLICY "Users can view budget items in their company" ON public.budget_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.budgets b 
        WHERE b.id = budget_id AND b.company_id = get_user_company(auth.uid())
    )
);

CREATE POLICY "Admins can manage budget items" ON public.budget_items
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.budgets b 
        WHERE b.id = budget_id AND b.company_id = get_user_company(auth.uid())
        AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
    )
);

-- RLS Policies for Fixed Assets
CREATE POLICY "Users can view fixed assets in their company" ON public.fixed_assets
FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage fixed assets in their company" ON public.fixed_assets
FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

-- RLS Policies for Depreciation Records
CREATE POLICY "Users can view depreciation records in their company" ON public.depreciation_records
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.fixed_assets fa 
        WHERE fa.id = fixed_asset_id AND fa.company_id = get_user_company(auth.uid())
    )
);

CREATE POLICY "Admins can manage depreciation records" ON public.depreciation_records
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.fixed_assets fa 
        WHERE fa.id = fixed_asset_id AND fa.company_id = get_user_company(auth.uid())
        AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
    )
);

-- Create indexes for better performance
CREATE INDEX idx_chart_of_accounts_company_id ON public.chart_of_accounts(company_id);
CREATE INDEX idx_chart_of_accounts_account_type ON public.chart_of_accounts(account_type);
CREATE INDEX idx_journal_entries_company_id ON public.journal_entries(company_id);
CREATE INDEX idx_journal_entries_entry_date ON public.journal_entries(entry_date);
CREATE INDEX idx_journal_entry_lines_journal_entry_id ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account_id ON public.journal_entry_lines(account_id);
CREATE INDEX idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX idx_transactions_transaction_date ON public.transactions(transaction_date);
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_payments_company_id ON public.payments(company_id);
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);

-- Create triggers for updated_at
CREATE TRIGGER update_chart_of_accounts_updated_at
    BEFORE UPDATE ON public.chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounting_periods_updated_at
    BEFORE UPDATE ON public.accounting_periods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON public.vendors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budget_items_updated_at
    BEFORE UPDATE ON public.budget_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fixed_assets_updated_at
    BEFORE UPDATE ON public.fixed_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();