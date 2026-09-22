-- Rollback of 20260921140000_cash_flow_from_ledger.sql
-- Restores the previous payments-table heuristic (payment_type='receipt'/'payment').
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.generate_cash_flow_analysis(company_id_param uuid, start_date_param date DEFAULT NULL::date, end_date_param date DEFAULT NULL::date)
 RETURNS TABLE(total_inflow numeric, total_outflow numeric, net_cash_flow numeric, operating_cash_flow numeric, investing_cash_flow numeric, financing_cash_flow numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    start_date date;
    end_date date;
    inflow numeric := 0;
    outflow numeric := 0;
    operating_inflow numeric := 0;
    operating_outflow numeric := 0;
    investing_inflow numeric := 0;
    investing_outflow numeric := 0;
    financing_inflow numeric := 0;
    financing_outflow numeric := 0;
BEGIN
    -- Set default date range if not provided (last 6 months)
    IF start_date_param IS NULL THEN
        start_date := CURRENT_DATE - INTERVAL '6 months';
    ELSE
        start_date := start_date_param;
    END IF;

    IF end_date_param IS NULL THEN
        end_date := CURRENT_DATE;
    ELSE
        end_date := end_date_param;
    END IF;

    -- Calculate operating cash flows (from payments and bank transactions)
    SELECT
        COALESCE(SUM(CASE WHEN payment_type = 'receipt' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_type = 'payment' THEN amount ELSE 0 END), 0)
    INTO operating_inflow, operating_outflow
    FROM public.payments
    WHERE company_id = company_id_param
    AND payment_date BETWEEN start_date AND end_date
    AND payment_status = 'completed';

    -- Add bank transaction flows
    SELECT
        operating_inflow + COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0),
        operating_outflow + COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0)
    INTO operating_inflow, operating_outflow
    FROM public.bank_transactions
    WHERE company_id = company_id_param
    AND transaction_date BETWEEN start_date AND end_date
    AND status = 'completed';

    -- Calculate investing cash flows (asset purchases, disposals)
    SELECT
        COALESCE(SUM(CASE WHEN disposal_amount IS NOT NULL THEN disposal_amount ELSE 0 END), 0),
        COALESCE(SUM(purchase_cost), 0)
    INTO investing_inflow, investing_outflow
    FROM public.fixed_assets
    WHERE company_id = company_id_param
    AND (
        (purchase_date BETWEEN start_date AND end_date) OR
        (disposal_date BETWEEN start_date AND end_date)
    );

    -- Add vehicle purchases to investing outflows
    SELECT
        investing_outflow + COALESCE(SUM(purchase_cost), 0)
    INTO investing_outflow
    FROM public.vehicles
    WHERE company_id = company_id_param
    AND purchase_date BETWEEN start_date AND end_date
    AND purchase_cost IS NOT NULL;

    -- Calculate financing cash flows (loans, equity - simplified for now)
    financing_inflow := 0; -- TODO: Add loan/equity tracking
    financing_outflow := 0; -- TODO: Add loan payments, dividends

    -- Calculate totals
    inflow := operating_inflow + investing_inflow + financing_inflow;
    outflow := operating_outflow + investing_outflow + financing_outflow;

    RETURN QUERY SELECT
        inflow as total_inflow,
        outflow as total_outflow,
        (inflow - outflow) as net_cash_flow,
        (operating_inflow - operating_outflow) as operating_cash_flow,
        (investing_inflow - investing_outflow) as investing_cash_flow,
        (financing_inflow - financing_outflow) as financing_cash_flow;
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_cash_flow_analysis(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_cash_flow_analysis(uuid, date, date) TO authenticated, service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
