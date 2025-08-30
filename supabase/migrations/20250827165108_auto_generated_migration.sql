-- إضافة عمود كود العميل إلى جدول customers
ALTER TABLE public.customers 
ADD COLUMN customer_code TEXT UNIQUE;

-- إنشاء index على customer_code لتسريع البحث
CREATE INDEX idx_customers_customer_code ON public.customers(customer_code);
CREATE INDEX idx_customers_company_customer_code ON public.customers(company_id, customer_code);

-- دالة لتوليد كود العميل
CREATE OR REPLACE FUNCTION public.generate_customer_code(p_company_id UUID, p_customer_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    customer_count INTEGER;
    year_suffix TEXT;
    type_prefix TEXT;
    new_code TEXT;
BEGIN
    -- Get current year suffix
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Set type prefix based on customer type
    CASE p_customer_type
        WHEN 'individual' THEN type_prefix := 'IND';
        WHEN 'corporate' THEN type_prefix := 'COR';
        ELSE type_prefix := 'GEN';
    END CASE;
    
    -- Count existing customers for this company and type in current year
    SELECT COUNT(*) + 1 INTO customer_count
    FROM public.customers 
    WHERE company_id = p_company_id 
    AND customer_type = p_customer_type
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Generate the code: CUST-YY-TYPE-XXX
    new_code := 'CUST-' || year_suffix || '-' || type_prefix || '-' || LPAD(customer_count::TEXT, 3, '0');
    
    -- Ensure uniqueness by checking if code already exists
    WHILE EXISTS (SELECT 1 FROM public.customers WHERE customer_code = new_code AND company_id = p_company_id) LOOP
        customer_count := customer_count + 1;
        new_code := 'CUST-' || year_suffix || '-' || type_prefix || '-' || LPAD(customer_count::TEXT, 3, '0');
    END LOOP;
    
    RETURN new_code;
END;
$$;

-- دالة trigger لتوليد كود العميل تلقائياً
CREATE OR REPLACE FUNCTION public.auto_generate_customer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Generate customer code only if not provided
    IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
        NEW.customer_code := public.generate_customer_code(NEW.company_id, NEW.customer_type);
    END IF;
    
    RETURN NEW;
END;
$$;

-- إنشاء trigger لتوليد كود العميل عند الإنشاء
DROP TRIGGER IF EXISTS trigger_auto_generate_customer_code ON public.customers;
CREATE TRIGGER trigger_auto_generate_customer_code
    BEFORE INSERT ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_customer_code();

-- دالة محسّنة لكشف حساب العميل بالكود
CREATE OR REPLACE FUNCTION public.get_customer_account_statement_by_code(
    p_company_id UUID,
    p_customer_code TEXT,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
    transaction_date DATE,
    transaction_type TEXT,
    description TEXT,
    reference_number TEXT,
    debit_amount NUMERIC,
    credit_amount NUMERIC,
    running_balance NUMERIC,
    transaction_id UUID,
    source_table TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    customer_id_var UUID;
    opening_balance NUMERIC := 0;
    current_balance NUMERIC := 0;
BEGIN
    -- Get customer ID from code
    SELECT id INTO customer_id_var
    FROM public.customers
    WHERE company_id = p_company_id AND customer_code = p_customer_code;
    
    IF customer_id_var IS NULL THEN
        RAISE EXCEPTION 'Customer with code % not found', p_customer_code;
    END IF;
    
    -- Calculate opening balance if date_from is specified
    IF p_date_from IS NOT NULL THEN
        -- Get opening balance from payments before date_from
        SELECT COALESCE(SUM(amount), 0) INTO opening_balance
        FROM public.payments
        WHERE customer_id = customer_id_var 
        AND payment_date < p_date_from
        AND status = 'completed';
        
        -- Subtract invoices before date_from
        SELECT opening_balance - COALESCE(SUM(total_amount), 0) INTO opening_balance
        FROM public.invoices
        WHERE customer_id = customer_id_var 
        AND invoice_date < p_date_from
        AND status IN ('sent', 'overdue', 'paid');
    END IF;
    
    current_balance := opening_balance;
    
    -- Return transactions within date range
    RETURN QUERY
    WITH all_transactions AS (
        -- Payments (Credits)
        SELECT 
            p.payment_date::DATE as trans_date,
            'payment'::TEXT as trans_type,
            COALESCE(p.description, 'Payment') as description,
            p.payment_number as reference,
            0::NUMERIC as debit,
            p.amount as credit,
            p.id as trans_id,
            'payments'::TEXT as source
        FROM public.payments p
        WHERE p.customer_id = customer_id_var
        AND p.status = 'completed'
        AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
        AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
        
        UNION ALL
        
        -- Invoices (Debits)
        SELECT 
            i.invoice_date::DATE as trans_date,
            'invoice'::TEXT as trans_type,
            COALESCE(i.notes, 'Invoice #' || i.invoice_number) as description,
            i.invoice_number as reference,
            i.total_amount as debit,
            0::NUMERIC as credit,
            i.id as trans_id,
            'invoices'::TEXT as source
        FROM public.invoices i
        WHERE i.customer_id = customer_id_var
        AND i.status IN ('sent', 'overdue', 'paid')
        AND (p_date_from IS NULL OR i.invoice_date >= p_date_from)
        AND (p_date_to IS NULL OR i.invoice_date <= p_date_to)
        
        ORDER BY trans_date, trans_type
    )
    SELECT 
        t.trans_date,
        t.trans_type,
        t.description,
        t.reference,
        t.debit,
        t.credit,
        opening_balance + SUM(t.credit - t.debit) OVER (ORDER BY t.trans_date, t.trans_type ROWS UNBOUNDED PRECEDING) as running_balance,
        t.trans_id,
        t.source
    FROM all_transactions t;
END;
$$;