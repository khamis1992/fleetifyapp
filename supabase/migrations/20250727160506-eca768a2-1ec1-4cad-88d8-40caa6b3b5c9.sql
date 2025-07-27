-- دوال التكامل المالي - المجموعة الثانية

-- 2. دالة إنشاء قيد الفاتورة
CREATE OR REPLACE FUNCTION public.create_invoice_journal_entry(invoice_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    invoice_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    revenue_account_id uuid;
    sales_cost_center_id uuid;
BEGIN
    SELECT * INTO invoice_record
    FROM public.invoices
    WHERE id = invoice_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = invoice_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = invoice_record.company_id
    AND account_type = 'assets'
    AND account_name ILIKE '%receivable%'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = invoice_record.company_id
    AND account_type = 'revenue'
    AND is_active = true
    LIMIT 1;
    
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit,
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        invoice_record.company_id,
        generate_journal_entry_number(invoice_record.company_id),
        invoice_record.invoice_date,
        'Invoice #' || invoice_record.invoice_number,
        'invoice',
        invoice_record.id,
        invoice_record.total_amount,
        invoice_record.total_amount,
        'draft',
        invoice_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    IF receivable_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            receivable_account_id,
            sales_cost_center_id,
            1,
            'Accounts Receivable - Invoice #' || invoice_record.invoice_number,
            invoice_record.total_amount,
            0
        );
    END IF;
    
    IF revenue_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            revenue_account_id,
            sales_cost_center_id,
            2,
            'Sales Revenue - Invoice #' || invoice_record.invoice_number,
            0,
            invoice_record.total_amount
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$$;