-- Activate triggers for automatic journal entry creation

-- Trigger for invoice changes
CREATE OR REPLACE TRIGGER trigger_invoice_changes
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_invoice_changes();

-- Trigger for payment changes  
CREATE OR REPLACE TRIGGER trigger_payment_changes
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_changes();

-- Trigger for contract changes
CREATE OR REPLACE TRIGGER trigger_contract_changes
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_contract_changes();

-- Trigger for penalty changes
CREATE OR REPLACE TRIGGER trigger_penalty_changes
    BEFORE INSERT OR UPDATE ON public.penalties
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_penalty_changes();

-- Trigger for payroll changes
CREATE OR REPLACE TRIGGER trigger_payroll_changes
    BEFORE INSERT OR UPDATE ON public.payroll
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payroll_changes();

-- Update triggers for automatic timestamp updates
CREATE OR REPLACE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_chart_of_accounts_updated_at
    BEFORE UPDATE ON public.chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON public.vendors
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_banks_updated_at
    BEFORE UPDATE ON public.banks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_bank_transactions_updated_at
    BEFORE UPDATE ON public.bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_penalties_updated_at
    BEFORE UPDATE ON public.penalties
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_fixed_assets_updated_at
    BEFORE UPDATE ON public.fixed_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_cost_centers_updated_at
    BEFORE UPDATE ON public.cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create bank transaction journal entries
CREATE OR REPLACE FUNCTION public.create_bank_transaction_journal_entry(transaction_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    transaction_record record;
    journal_entry_id uuid;
    cash_account_id uuid;
    expense_account_id uuid;
    revenue_account_id uuid;
BEGIN
    -- Get transaction details
    SELECT * INTO transaction_record
    FROM public.bank_transactions
    WHERE id = transaction_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bank transaction not found';
    END IF;
    
    -- Find required accounts
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = transaction_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO expense_account_id
    FROM public.chart_of_accounts
    WHERE company_id = transaction_record.company_id
    AND account_type = 'expenses'
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = transaction_record.company_id
    AND account_type = 'revenue'
    AND is_active = true
    LIMIT 1;
    
    -- Create journal entry
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
        transaction_record.company_id,
        generate_journal_entry_number(transaction_record.company_id),
        transaction_record.transaction_date,
        'Bank Transaction #' || transaction_record.transaction_number || ' - ' || transaction_record.description,
        'bank_transaction',
        transaction_record.id,
        transaction_record.amount,
        transaction_record.amount,
        'draft',
        transaction_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create journal entry lines based on transaction type
    IF transaction_record.transaction_type = 'deposit' THEN
        -- Money coming in
        -- Debit: Cash/Bank
        IF cash_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                cash_account_id,
                1,
                'Cash deposit - ' || transaction_record.description,
                transaction_record.amount,
                0
            );
        END IF;
        
        -- Credit: Revenue
        IF revenue_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                revenue_account_id,
                2,
                'Revenue - ' || transaction_record.description,
                0,
                transaction_record.amount
            );
        END IF;
        
    ELSIF transaction_record.transaction_type = 'withdrawal' THEN
        -- Money going out
        -- Debit: Expense
        IF expense_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                expense_account_id,
                1,
                'Expense - ' || transaction_record.description,
                transaction_record.amount,
                0
            );
        END IF;
        
        -- Credit: Cash/Bank
        IF cash_account_id IS NOT NULL THEN
            INSERT INTO public.journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                cash_account_id,
                2,
                'Cash withdrawal - ' || transaction_record.description,
                0,
                transaction_record.amount
            );
        END IF;
    END IF;
    
    -- Update transaction with journal entry reference
    UPDATE public.bank_transactions
    SET journal_entry_id = journal_entry_id
    WHERE id = transaction_id_param;
    
    RETURN journal_entry_id;
END;
$function$;

-- Function to handle bank transaction changes
CREATE OR REPLACE FUNCTION public.handle_bank_transaction_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Create journal entry when bank transaction status is 'completed'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_bank_transaction_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_bank_transaction_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Trigger for bank transaction changes
CREATE OR REPLACE TRIGGER trigger_bank_transaction_changes
    BEFORE INSERT OR UPDATE ON public.bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_bank_transaction_changes();