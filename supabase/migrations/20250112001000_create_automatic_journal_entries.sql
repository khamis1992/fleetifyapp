-- Create function for automatic journal entries on payments
CREATE OR REPLACE FUNCTION create_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    _entry_number TEXT;
    _journal_id UUID;
BEGIN
    -- Only create journal entry for completed payments
    IF NEW.status::text = 'completed' THEN
        -- Generate entry number
        _entry_number := 'PAY-' || TO_CHAR(NEW.payment_date, 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
        
        -- Create journal entry
        INSERT INTO journal_entries (
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
            _entry_number,
            NEW.payment_date,
            'Payment received: ' || COALESCE(NEW.payment_number, NEW.reference_number, ''),
            NEW.amount,
            NEW.amount,
            'payment',
            'posted',
            'payment',
            NEW.id,
            auth.uid()
        ) RETURNING id INTO _journal_id;
        
        -- Create journal entry lines
        -- Debit: Cash account
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            description
        ) 
        SELECT 
            _journal_id,
            id,
            NEW.amount,
            0,
            'Cash received'
        FROM chart_of_accounts
        WHERE account_number = '1101' -- Cash account
        LIMIT 1;
        
        -- Credit: Revenue or Accounts Receivable
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            description
        ) 
        SELECT 
            _journal_id,
            id,
            0,
            NEW.amount,
            CASE 
                WHEN NEW.invoice_id IS NOT NULL THEN 'Payment for invoice'
                ELSE 'Direct revenue'
            END
        FROM chart_of_accounts
        WHERE account_number = CASE 
            WHEN NEW.invoice_id IS NOT NULL THEN '1201' -- Accounts Receivable
            ELSE '4101' -- Revenue
        END
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for automatic journal entries on invoices
CREATE OR REPLACE FUNCTION create_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    _entry_number TEXT;
    _journal_id UUID;
BEGIN
    -- Generate entry number
    _entry_number := 'INV-' || TO_CHAR(NEW.invoice_date, 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
    
    -- Create journal entry
    INSERT INTO journal_entries (
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
        _entry_number,
        NEW.invoice_date,
        'Invoice issued: ' || NEW.invoice_number,
        NEW.total_amount,
        NEW.total_amount,
        'invoice',
        'posted',
        'invoice',
        NEW.id,
        auth.uid()
    ) RETURNING id INTO _journal_id;
    
    -- Create journal entry lines
    -- Debit: Accounts Receivable
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
    ) 
    SELECT 
        _journal_id,
        id,
        NEW.total_amount,
        0,
        'Amount due from customer'
    FROM chart_of_accounts
    WHERE account_number = '1201' -- Accounts Receivable
    LIMIT 1;
    
    -- Credit: Revenue
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
    ) 
    SELECT 
        _journal_id,
        id,
        0,
        NEW.subtotal,
        'Revenue from services'
    FROM chart_of_accounts
    WHERE account_number = '4101' -- Revenue
    LIMIT 1;
    
    -- Credit: Tax Payable (if applicable)
    IF NEW.tax_amount > 0 THEN
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            debit_amount,
            credit_amount,
            description
        ) 
        SELECT 
            _journal_id,
            id,
            0,
            NEW.tax_amount,
            'Tax collected'
        FROM chart_of_accounts
        WHERE account_number = '2201' -- Tax Payable
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for automatic journal entries on expenses
CREATE OR REPLACE FUNCTION create_expense_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    _entry_number TEXT;
    _journal_id UUID;
    _expense_account_number TEXT;
BEGIN
    -- Determine expense account based on category
    _expense_account_number := CASE NEW.category
        WHEN 'fuel' THEN '5101'
        WHEN 'maintenance' THEN '5102'
        WHEN 'insurance' THEN '5103'
        WHEN 'staff' THEN '5201'
        WHEN 'utilities' THEN '5301'
        WHEN 'marketing' THEN '5401'
        ELSE '5901' -- Other expenses
    END;
    
    -- Generate entry number
    _entry_number := 'EXP-' || TO_CHAR(NEW.expense_date, 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
    
    -- Create journal entry
    INSERT INTO journal_entries (
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
        _entry_number,
        NEW.expense_date,
        'Expense: ' || NEW.description,
        NEW.amount,
        NEW.amount,
        'expense',
        'posted',
        'expense',
        NEW.id,
        auth.uid()
    ) RETURNING id INTO _journal_id;
    
    -- Create journal entry lines
    -- Debit: Expense account
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
    ) 
    SELECT 
        _journal_id,
        id,
        NEW.amount,
        0,
        NEW.description
    FROM chart_of_accounts
    WHERE account_number = _expense_account_number
    LIMIT 1;
    
    -- Credit: Cash or Accounts Payable
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
    ) 
    SELECT 
        _journal_id,
        id,
        0,
        NEW.amount,
        'Payment to: ' || NEW.vendor_name
    FROM chart_of_accounts
    WHERE account_number = '1101' -- Cash (assuming immediate payment)
    LIMIT 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trg_payment_journal_entry ON payments;
CREATE TRIGGER trg_payment_journal_entry
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION create_payment_journal_entry();

DROP TRIGGER IF EXISTS trg_invoice_journal_entry ON invoices;
CREATE TRIGGER trg_invoice_journal_entry
AFTER INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION create_invoice_journal_entry();

DROP TRIGGER IF EXISTS trg_expense_journal_entry ON expenses;
CREATE TRIGGER trg_expense_journal_entry
AFTER INSERT ON expenses
FOR EACH ROW
EXECUTE FUNCTION create_expense_journal_entry();

-- Create initial chart of accounts if not exists
INSERT INTO chart_of_accounts (account_number, account_name, account_type, description, is_active)
VALUES 
    -- Assets
    ('1101', 'Cash', 'asset', 'Cash in hand and bank', true),
    ('1201', 'Accounts Receivable', 'asset', 'Amount owed by customers', true),
    ('1301', 'Inventory', 'asset', 'Inventory stock', true),
    ('1501', 'Property & Equipment', 'asset', 'Fixed assets', true),
    ('1502', 'Accumulated Depreciation', 'asset', 'Accumulated depreciation on fixed assets', true),
    
    -- Liabilities
    ('2101', 'Accounts Payable', 'liability', 'Amount owed to suppliers', true),
    ('2201', 'Tax Payable', 'liability', 'Tax obligations', true),
    ('2301', 'Bonds Payable', 'liability', 'Customer bonds held', true),
    
    -- Equity
    ('3101', 'Capital', 'equity', 'Owner capital', true),
    ('3201', 'Retained Earnings', 'equity', 'Retained earnings', true),
    
    -- Revenue
    ('4101', 'Rental Revenue', 'revenue', 'Revenue from yacht rentals', true),
    ('4201', 'Service Revenue', 'revenue', 'Revenue from additional services', true),
    
    -- Expenses
    ('5101', 'Fuel Expenses', 'expense', 'Fuel costs', true),
    ('5102', 'Maintenance Expenses', 'expense', 'Maintenance and repair costs', true),
    ('5103', 'Insurance Expenses', 'expense', 'Insurance premiums', true),
    ('5201', 'Payroll Expenses', 'expense', 'Employee salaries and benefits', true),
    ('5301', 'Utilities Expenses', 'expense', 'Utilities costs', true),
    ('5401', 'Marketing Expenses', 'expense', 'Marketing and advertising costs', true),
    ('5501', 'Depreciation Expenses', 'expense', 'Depreciation on fixed assets', true),
    ('5901', 'Other Expenses', 'expense', 'Miscellaneous expenses', true)
ON CONFLICT (account_number) DO NOTHING;
