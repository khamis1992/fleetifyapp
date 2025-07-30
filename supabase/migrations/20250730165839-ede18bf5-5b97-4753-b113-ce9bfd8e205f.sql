-- Fix the create_payment_journal_entry function to use correct column name
CREATE OR REPLACE FUNCTION public.create_payment_journal_entry(payment_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    payment_record record;
    journal_entry_id uuid;
    bank_account_id uuid;
    receivable_account_id uuid;
    payable_account_id uuid;
    sales_cost_center_id uuid;
    customer_account_id uuid;
    vendor_account_id uuid;
BEGIN
    -- Get payment details
    SELECT * INTO payment_record
    FROM public.payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- Skip if journal entry already exists or payment is not completed
    IF payment_record.journal_entry_id IS NOT NULL OR payment_record.status != 'completed' THEN
        RETURN payment_record.journal_entry_id;
    END IF;
    
    -- Get the bank account for the payment method
    SELECT account_id INTO bank_account_id
    FROM public.banks
    WHERE id = payment_record.bank_id
    AND company_id = payment_record.company_id
    LIMIT 1;
    
    -- Get cost center for sales
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = payment_record.company_id
    AND center_code = 'SALES'
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
        payment_record.company_id,
        generate_journal_entry_number(payment_record.company_id),
        payment_record.payment_date,
        CASE 
            WHEN payment_record.payment_type = 'receipt' THEN 'Receipt #' || payment_record.receipt_number
            ELSE 'Payment #' || payment_record.payment_number
        END,
        'payment',
        payment_record.id,
        payment_record.amount,
        payment_record.amount,
        'draft',
        payment_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- For receipts (money coming in)
    IF payment_record.payment_type = 'receipt' THEN
        -- Debit: Bank Account (increase cash)
        IF bank_account_id IS NOT NULL THEN
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
                bank_account_id,
                sales_cost_center_id,
                1,
                'Bank - Receipt #' || payment_record.receipt_number,
                payment_record.amount,
                0
            );
        END IF;
        
        -- Credit: Customer Account or Accounts Receivable
        IF payment_record.customer_id IS NOT NULL THEN
            -- Try to get customer-specific account first
            SELECT account_id INTO customer_account_id
            FROM public.customer_accounts
            WHERE customer_id = payment_record.customer_id
            AND company_id = payment_record.company_id
            LIMIT 1;
            
            IF customer_account_id IS NOT NULL THEN
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
                    customer_account_id,
                    sales_cost_center_id,
                    2,
                    'Customer Payment - Receipt #' || payment_record.receipt_number,
                    0,
                    payment_record.amount
                );
            ELSE
                -- Use general receivables account
                SELECT id INTO receivable_account_id
                FROM public.chart_of_accounts
                WHERE company_id = payment_record.company_id
                AND account_type = 'assets'
                AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
                AND is_active = true
                LIMIT 1;
                
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
                        2,
                        'Accounts Receivable - Receipt #' || payment_record.receipt_number,
                        0,
                        payment_record.amount
                    );
                END IF;
            END IF;
        END IF;
        
    -- For payments (money going out)
    ELSE
        -- Credit: Bank Account (decrease cash)
        IF bank_account_id IS NOT NULL THEN
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
                bank_account_id,
                sales_cost_center_id,
                1,
                'Bank - Payment #' || payment_record.payment_number,
                0,
                payment_record.amount
            );
        END IF;
        
        -- Debit: Vendor Account or Accounts Payable
        IF payment_record.vendor_id IS NOT NULL THEN
            -- Try to get vendor-specific account
            SELECT account_id INTO vendor_account_id
            FROM public.vendor_accounts
            WHERE vendor_id = payment_record.vendor_id
            AND company_id = payment_record.company_id
            LIMIT 1;
            
            IF vendor_account_id IS NOT NULL THEN
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
                    vendor_account_id,
                    sales_cost_center_id,
                    2,
                    'Vendor Payment - Payment #' || payment_record.payment_number,
                    payment_record.amount,
                    0
                );
            ELSE
                -- Use general payables account
                SELECT id INTO payable_account_id
                FROM public.chart_of_accounts
                WHERE company_id = payment_record.company_id
                AND account_type = 'liabilities'
                AND (account_name ILIKE '%payable%' OR account_name ILIKE '%دائن%')
                AND is_active = true
                LIMIT 1;
                
                IF payable_account_id IS NOT NULL THEN
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
                        payable_account_id,
                        sales_cost_center_id,
                        2,
                        'Accounts Payable - Payment #' || payment_record.payment_number,
                        payment_record.amount,
                        0
                    );
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- Update payment with journal entry ID
    UPDATE public.payments
    SET journal_entry_id = journal_entry_id
    WHERE id = payment_id_param;
    
    RETURN journal_entry_id;
END;
$function$;