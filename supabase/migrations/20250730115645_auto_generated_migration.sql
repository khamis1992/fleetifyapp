-- Fix ambiguous column reference 'actual_amount' in check_budget_variances function
CREATE OR REPLACE FUNCTION public.check_budget_variances(company_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    budget_item_record RECORD;
    calculated_actual_amount NUMERIC;
    variance_threshold NUMERIC := 0.1; -- 10% threshold
    alert_message TEXT;
BEGIN
    -- Loop through all active budget items for the company
    FOR budget_item_record IN
        SELECT bi.*, b.budget_name, coa.account_name, coa.current_balance
        FROM public.budget_items bi
        JOIN public.budgets b ON bi.budget_id = b.id
        JOIN public.chart_of_accounts coa ON bi.account_id = coa.id
        WHERE b.company_id = company_id_param
        AND b.is_active = true
        AND bi.budgeted_amount > 0
    LOOP
        -- Calculate actual amount from account balance
        calculated_actual_amount := COALESCE(budget_item_record.current_balance, 0);
        
        -- Check if variance exceeds threshold
        IF ABS(calculated_actual_amount - budget_item_record.budgeted_amount) / budget_item_record.budgeted_amount > variance_threshold THEN
            -- Create alert message
            alert_message := format(
                'Budget variance detected for %s in budget %s: Budgeted %s, Actual %s',
                budget_item_record.account_name,
                budget_item_record.budget_name,
                budget_item_record.budgeted_amount,
                calculated_actual_amount
            );
            
            -- Insert notification (if notifications system exists)
            -- This is optional and depends on your notification system implementation
            BEGIN
                INSERT INTO public.user_notifications (
                    company_id,
                    title,
                    message,
                    notification_type,
                    related_type,
                    related_id
                ) VALUES (
                    company_id_param,
                    'Budget Variance Alert',
                    alert_message,
                    'warning',
                    'budget',
                    budget_item_record.budget_id
                );
            EXCEPTION
                WHEN OTHERS THEN
                    -- Ignore if notifications table doesn't exist or has issues
                    NULL;
            END;
        END IF;
    END LOOP;
END;
$function$;