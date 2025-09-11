-- Phase 1: Unify Property Accounting System with Main Accounting System
-- Add journal entry integration to property tables

-- 1. Add journal_entry_id to property_payments table
ALTER TABLE property_payments 
ADD COLUMN journal_entry_id uuid REFERENCES journal_entries(id);

-- 2. Add journal_entry_id to property_contracts table  
ALTER TABLE property_contracts 
ADD COLUMN journal_entry_id uuid REFERENCES journal_entries(id);

-- 3. Add account_id to property_contracts table for account linking
ALTER TABLE property_contracts 
ADD COLUMN account_id uuid REFERENCES chart_of_accounts(id);

-- 4. Create function to create journal entries for property payments
CREATE OR REPLACE FUNCTION create_property_payment_journal_entry(payment_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    payment_record property_payments%ROWTYPE;
    contract_record property_contracts%ROWTYPE;
    journal_entry_id uuid;
    journal_entry_number text;
    cash_account_id uuid;
    rental_revenue_account_id uuid;
    receivables_account_id uuid;
BEGIN
    -- Get payment record
    SELECT * INTO payment_record
    FROM property_payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found: %', payment_id_param;
    END IF;
    
    -- Get contract record
    SELECT * INTO contract_record
    FROM property_contracts
    WHERE id = payment_record.property_contract_id;
    
    -- Get cash account (default bank account)
    SELECT id INTO cash_account_id
    FROM chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'current_assets'
    AND (LOWER(account_name) LIKE '%cash%' OR LOWER(account_name) LIKE '%bank%' OR LOWER(account_name) LIKE '%نقد%' OR LOWER(account_name) LIKE '%بنك%')
    AND is_active = true
    LIMIT 1;
    
    -- Get rental revenue account
    SELECT id INTO rental_revenue_account_id
    FROM chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'revenue'
    AND (LOWER(account_name) LIKE '%rental%' OR LOWER(account_name) LIKE '%rent%' OR LOWER(account_name) LIKE '%إيجار%' OR LOWER(account_name) LIKE '%ايجار%')
    AND is_active = true
    LIMIT 1;
    
    -- If no specific rental revenue account, get general revenue account
    IF rental_revenue_account_id IS NULL THEN
        SELECT id INTO rental_revenue_account_id
        FROM chart_of_accounts
        WHERE company_id = payment_record.company_id
        AND account_type = 'revenue'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Create default accounts if they don't exist
    IF cash_account_id IS NULL THEN
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, is_active, is_system
        ) VALUES (
            payment_record.company_id, '1110001', 'Cash Account', 'حساب النقد',
            'current_assets', 'debit', true, true
        ) RETURNING id INTO cash_account_id;
    END IF;
    
    IF rental_revenue_account_id IS NULL THEN
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, is_active, is_system
        ) VALUES (
            payment_record.company_id, '4120001', 'Rental Revenue', 'إيرادات الإيجارات',
            'revenue', 'credit', true, true
        ) RETURNING id INTO rental_revenue_account_id;
    END IF;
    
    -- Generate journal entry number
    journal_entry_number := 'JE-PROP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::bigint::text, 10, '0');
    
    -- Create journal entry
    INSERT INTO journal_entries (
        id, company_id, journal_entry_number, entry_date, description, 
        total_amount, status, created_by
    ) VALUES (
        gen_random_uuid(), payment_record.company_id, journal_entry_number, 
        payment_record.payment_date::date, 
        'Property rental payment: ' || payment_record.payment_number,
        payment_record.amount, 'posted', payment_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Cash/Bank Account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, description, 
        debit_amount, credit_amount
    ) VALUES (
        gen_random_uuid(), journal_entry_id, cash_account_id,
        'Cash received - Property payment: ' || payment_record.payment_number,
        payment_record.amount, 0
    );
    
    -- Credit: Rental Revenue Account  
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, description,
        debit_amount, credit_amount
    ) VALUES (
        gen_random_uuid(), journal_entry_id, rental_revenue_account_id,
        'Rental revenue - Property payment: ' || payment_record.payment_number,
        0, payment_record.amount
    );
    
    RETURN journal_entry_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating property payment journal entry: %', SQLERRM;
END;
$$;

-- 5. Create function to create journal entries for property contracts
CREATE OR REPLACE FUNCTION create_property_contract_journal_entry(contract_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    contract_record property_contracts%ROWTYPE;
    journal_entry_id uuid;
    journal_entry_number text;
    receivables_account_id uuid;
    rental_revenue_account_id uuid;
BEGIN
    -- Get contract record
    SELECT * INTO contract_record
    FROM property_contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found: %', contract_id_param;
    END IF;
    
    -- Only create journal entry for rental contracts with amounts
    IF contract_record.rental_amount <= 0 OR contract_record.contract_type != 'rental' THEN
        RETURN NULL;
    END IF;
    
    -- Get receivables account
    SELECT id INTO receivables_account_id
    FROM chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'current_assets'
    AND (LOWER(account_name) LIKE '%receivable%' OR LOWER(account_name) LIKE '%مدين%' OR LOWER(account_name) LIKE '%ذمم%')
    AND is_active = true
    LIMIT 1;
    
    -- Get rental revenue account
    SELECT id INTO rental_revenue_account_id
    FROM chart_of_accounts
    WHERE company_id = contract_record.company_id
    AND account_type = 'revenue'
    AND (LOWER(account_name) LIKE '%rental%' OR LOWER(account_name) LIKE '%rent%' OR LOWER(account_name) LIKE '%إيجار%' OR LOWER(account_name) LIKE '%ايجار%')
    AND is_active = true
    LIMIT 1;
    
    -- Create default accounts if they don't exist
    IF receivables_account_id IS NULL THEN
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, is_active, is_system
        ) VALUES (
            contract_record.company_id, '1130001', 'Accounts Receivable - Tenants', 'ذمم مدينة - المستأجرين',
            'current_assets', 'debit', true, true
        ) RETURNING id INTO receivables_account_id;
    END IF;
    
    IF rental_revenue_account_id IS NULL THEN
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, is_active, is_system
        ) VALUES (
            contract_record.company_id, '4120001', 'Rental Revenue', 'إيرادات الإيجارات',
            'revenue', 'credit', true, true
        ) RETURNING id INTO rental_revenue_account_id;
    END IF;
    
    -- Generate journal entry number
    journal_entry_number := 'JE-CONT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::bigint::text, 10, '0');
    
    -- Create journal entry
    INSERT INTO journal_entries (
        id, company_id, journal_entry_number, entry_date, description, 
        total_amount, status, created_by
    ) VALUES (
        gen_random_uuid(), contract_record.company_id, journal_entry_number, 
        contract_record.start_date::date, 
        'Property rental contract: ' || contract_record.contract_number,
        contract_record.rental_amount, 'posted', contract_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Accounts Receivable
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, description, 
        debit_amount, credit_amount
    ) VALUES (
        gen_random_uuid(), journal_entry_id, receivables_account_id,
        'Receivable - Property contract: ' || contract_record.contract_number,
        contract_record.rental_amount, 0
    );
    
    -- Credit: Rental Revenue Account  
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, description,
        debit_amount, credit_amount
    ) VALUES (
        gen_random_uuid(), journal_entry_id, rental_revenue_account_id,
        'Rental revenue - Property contract: ' || contract_record.contract_number,
        0, contract_record.rental_amount
    );
    
    RETURN journal_entry_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating property contract journal entry: %', SQLERRM;
END;
$$;

-- 6. Create trigger for property payments
CREATE OR REPLACE FUNCTION handle_property_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    journal_id uuid;
BEGIN
    -- Only process for paid status
    IF NEW.status = 'paid' AND 
       (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'paid')) THEN
        
        -- Create journal entry using the payment record directly
        BEGIN
            journal_id := create_property_payment_journal_entry(NEW.id);
            
            -- Update the payment with journal entry ID if created successfully
            IF journal_id IS NOT NULL THEN
                NEW.journal_entry_id := journal_id;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the payment creation
                RAISE WARNING 'Failed to create journal entry for property payment %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for property payments
DROP TRIGGER IF EXISTS property_payment_accounting_trigger ON property_payments;
CREATE TRIGGER property_payment_accounting_trigger
    BEFORE INSERT OR UPDATE ON property_payments
    FOR EACH ROW
    EXECUTE FUNCTION handle_property_payment_changes();

-- 7. Create trigger for property contracts
CREATE OR REPLACE FUNCTION handle_property_contract_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    journal_id uuid;
BEGIN
    -- Only process for active contracts with rental amounts
    IF NEW.status = 'active' AND NEW.rental_amount > 0 AND
       (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'active')) THEN
        
        -- Create journal entry using the contract record directly
        BEGIN
            journal_id := create_property_contract_journal_entry(NEW.id);
            
            -- Update the contract with journal entry ID if created successfully
            IF journal_id IS NOT NULL THEN
                NEW.journal_entry_id := journal_id;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the contract creation
                RAISE WARNING 'Failed to create journal entry for property contract %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for property contracts
DROP TRIGGER IF EXISTS property_contract_accounting_trigger ON property_contracts;
CREATE TRIGGER property_contract_accounting_trigger
    BEFORE INSERT OR UPDATE ON property_contracts
    FOR EACH ROW
    EXECUTE FUNCTION handle_property_contract_changes();