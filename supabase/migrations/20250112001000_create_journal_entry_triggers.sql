-- Create automatic journal entry triggers for Fleetify
-- Based on actual schema: company_id exists, account_code, payment_status (text), invoice_date

-- =============================================================================
-- FUNCTION: Auto Journal Entry for Payments
-- =============================================================================
CREATE OR REPLACE FUNCTION create_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    _entry_number TEXT;
    _journal_id UUID;
    _cash_account_id UUID;
    _revenue_account_id UUID;
    _ar_account_id UUID;
BEGIN
    -- Only for completed payments
    IF NEW.payment_status = 'completed' THEN
        
        -- Get account IDs for this company
        SELECT id INTO _cash_account_id 
        FROM chart_of_accounts 
        WHERE company_id = NEW.company_id 
        AND account_code = '1101' 
        AND is_active = true 
        LIMIT 1;
        
        SELECT id INTO _ar_account_id
        FROM chart_of_accounts 
        WHERE company_id = NEW.company_id 
        AND account_code = '1201' 
        AND is_active = true 
        LIMIT 1;
        
        SELECT id INTO _revenue_account_id
        FROM chart_of_accounts 
        WHERE company_id = NEW.company_id 
        AND account_code = '4101' 
        AND is_active = true 
        LIMIT 1;
        
        -- Skip if accounts not found
        IF _cash_account_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Generate entry number
        _entry_number := 'PAY-' || TO_CHAR(NEW.payment_date, 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
        
        -- Create journal entry
        INSERT INTO journal_entries (
            company_id,
            entry_number,
            entry_date,
            description,
            total_debit,
            total_credit,
            entry_type,
            status,
            source_document_type,
            source_document_id,
            created_by
        ) VALUES (
            NEW.company_id,
            _entry_number,
            NEW.payment_date,
            'قيد استلام دفعة: ' || COALESCE(NEW.payment_number, NEW.reference_number, ''),
            NEW.amount,
            NEW.amount,
            'automatic',
            'posted',
            'payment',
            NEW.id,
            auth.uid()
        ) RETURNING id INTO _journal_id;
        
        -- Debit: Cash
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            description,
            line_order
        ) VALUES (
            _journal_id,
            _cash_account_id,
            NEW.amount,
            0,
            'استلام نقدية',
            1
        );
        
        -- Credit: AR or Revenue
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            description,
            line_order
        ) VALUES (
            _journal_id,
            CASE WHEN NEW.invoice_id IS NOT NULL THEN _ar_account_id ELSE _revenue_account_id END,
            0,
            NEW.amount,
            CASE WHEN NEW.invoice_id IS NOT NULL THEN 'تحصيل من العملاء' ELSE 'إيراد مباشر' END,
            2
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Auto Journal Entry for Invoices
-- =============================================================================
CREATE OR REPLACE FUNCTION create_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    _entry_number TEXT;
    _journal_id UUID;
    _ar_account_id UUID;
    _revenue_account_id UUID;
    _tax_account_id UUID;
BEGIN
    -- Get account IDs
    SELECT id INTO _ar_account_id
    FROM chart_of_accounts 
    WHERE company_id = NEW.company_id 
    AND account_code = '1201' 
    AND is_active = true 
    LIMIT 1;
    
    SELECT id INTO _revenue_account_id
    FROM chart_of_accounts 
    WHERE company_id = NEW.company_id 
    AND account_code = '4101' 
    AND is_active = true 
    LIMIT 1;
    
    -- Skip if accounts not found
    IF _ar_account_id IS NULL OR _revenue_account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Generate entry number
    _entry_number := 'INV-' || TO_CHAR(NEW.invoice_date, 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
    
    -- Create journal entry
    INSERT INTO journal_entries (
        company_id,
        entry_number,
        entry_date,
        description,
        total_debit,
        total_credit,
        entry_type,
        status,
        source_document_type,
        source_document_id,
        created_by
    ) VALUES (
        NEW.company_id,
        _entry_number,
        NEW.invoice_date,
        'قيد فاتورة: ' || NEW.invoice_number,
        NEW.total_amount,
        NEW.total_amount,
        'automatic',
        'posted',
        'invoice',
        NEW.id,
        auth.uid()
    ) RETURNING id INTO _journal_id;
    
    -- Debit: AR
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        line_order
    ) VALUES (
        _journal_id,
        _ar_account_id,
        NEW.total_amount,
        0,
        'مستحقات على العملاء',
        1
    );
    
    -- Credit: Revenue
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        line_order
    ) VALUES (
        _journal_id,
        _revenue_account_id,
        0,
        NEW.subtotal,
        'إيراد الخدمات',
        2
    );
    
    -- Credit: Tax (if applicable)
    IF NEW.tax_amount > 0 THEN
        SELECT id INTO _tax_account_id
        FROM chart_of_accounts 
        WHERE company_id = NEW.company_id 
        AND account_code = '2201' 
        AND is_active = true 
        LIMIT 1;
        
        IF _tax_account_id IS NOT NULL THEN
            INSERT INTO journal_entry_lines (
                journal_entry_id,
                account_id,
                debit_amount,
                credit_amount,
                description,
                line_order
            ) VALUES (
                _journal_id,
                _tax_account_id,
                0,
                NEW.tax_amount,
                'ضريبة محصلة',
                3
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Create Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS trg_payment_journal_entry ON payments;
CREATE TRIGGER trg_payment_journal_entry
AFTER INSERT OR UPDATE OF payment_status ON payments
FOR EACH ROW
EXECUTE FUNCTION create_payment_journal_entry();

DROP TRIGGER IF EXISTS trg_invoice_journal_entry ON invoices;
CREATE TRIGGER trg_invoice_journal_entry
AFTER INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION create_invoice_journal_entry();
