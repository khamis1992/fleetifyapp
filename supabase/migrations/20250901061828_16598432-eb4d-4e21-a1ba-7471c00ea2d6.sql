-- Step 1: Remove SECURITY DEFINER from utility functions that don't need elevated privileges
-- These functions should respect normal RLS policies

-- Remove SECURITY DEFINER from calculation functions
ALTER FUNCTION public.calculate_account_level(text) SECURITY INVOKER;

-- Remove SECURITY DEFINER from analysis functions that don't need to bypass RLS
ALTER FUNCTION public.analyze_rls_performance() SECURITY INVOKER;
ALTER FUNCTION public.analyze_system_performance() SECURITY INVOKER;  
ALTER FUNCTION public.analyze_slow_queries() SECURITY INVOKER;

-- Remove SECURITY DEFINER from business logic functions
ALTER FUNCTION public.calculate_customer_outstanding_balance(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.calculate_vehicle_total_costs(uuid) SECURITY INVOKER;

-- Remove SECURITY DEFINER from non-critical business functions
-- These should operate within the user's permissions context
DO $$
DECLARE
    func_name text;
    func_names text[] := ARRAY[
        'check_budget_overruns()',
        'check_budget_variances(uuid)',
        'check_contract_payment_status(uuid)',
        'calculate_fuel_efficiency(uuid)',
        'calculate_employee_salary(uuid)',
        'check_document_expiry_alerts(uuid)'
    ];
BEGIN
    FOREACH func_name IN ARRAY func_names
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%s SECURITY INVOKER', func_name);
        EXCEPTION WHEN OTHERS THEN
            -- Function might not exist, continue
            CONTINUE;
        END;
    END LOOP;
END $$;