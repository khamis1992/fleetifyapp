-- Restores the exact pre-20260714310000 function definitions and execution grants.

CREATE OR REPLACE FUNCTION public.calculate_customer_outstanding_balance(customer_id_param uuid, company_id_param uuid)
 RETURNS TABLE(current_balance numeric, overdue_amount numeric, days_overdue integer, credit_available numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    total_invoiced numeric := 0;
    total_paid numeric := 0;
    oldest_unpaid_date date;
    customer_credit_limit numeric := 0;
BEGIN
    -- Get customer credit limit
    SELECT COALESCE(credit_limit, 0) INTO customer_credit_limit
    FROM public.customers
    WHERE id = customer_id_param;
    
    -- Calculate total invoiced amount
    SELECT COALESCE(SUM(total_amount), 0) INTO total_invoiced
    FROM public.invoices
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param
    AND status IN ('sent', 'overdue');
    
    -- Calculate total paid amount
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.payments
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param
    AND status = 'completed';
    
    -- Get oldest unpaid invoice date
    SELECT MIN(due_date) INTO oldest_unpaid_date
    FROM public.invoices
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param
    AND status IN ('sent', 'overdue')
    AND total_amount > COALESCE((
        SELECT SUM(amount) 
        FROM public.payments 
        WHERE invoice_id = invoices.id AND status = 'completed'
    ), 0);
    
    RETURN QUERY SELECT
        (total_invoiced - total_paid) as current_balance,
        CASE 
            WHEN oldest_unpaid_date IS NOT NULL AND oldest_unpaid_date < CURRENT_DATE 
            THEN (total_invoiced - total_paid)
            ELSE 0
        END as overdue_amount,
        CASE 
            WHEN oldest_unpaid_date IS NOT NULL AND oldest_unpaid_date < CURRENT_DATE 
            THEN (CURRENT_DATE - oldest_unpaid_date)::integer
            ELSE 0
        END as days_overdue,
        GREATEST(customer_credit_limit - (total_invoiced - total_paid), 0) as credit_available;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.calculate_customer_outstanding_balance(customer_id_param uuid, company_id_param uuid) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.calculate_vehicle_total_costs(vehicle_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_maintenance DECIMAL(15,3) := 0;
  v_total_insurance DECIMAL(15,3) := 0;
  v_total_operating DECIMAL(15,3) := 0;
  v_revenue_generated DECIMAL(15,3) := 0;
BEGIN
  -- Calculate total maintenance cost
  SELECT COALESCE(SUM(actual_cost), 0)
  INTO v_total_maintenance
  FROM vehicle_maintenance
  WHERE vehicle_id = vehicle_id_param
    AND status IN ('completed', 'approved');

  -- Calculate total insurance cost (if you have insurance records)
  -- For now, we'll set it to 0 or get from vehicle_insurance table if exists
  SELECT COALESCE(SUM(premium_amount), 0)
  INTO v_total_insurance
  FROM vehicle_insurance
  WHERE vehicle_id = vehicle_id_param
    AND status = 'active';

  -- Calculate revenue from contracts
  SELECT COALESCE(SUM(monthly_amount), 0)
  INTO v_revenue_generated
  FROM contracts
  WHERE vehicle_id = vehicle_id_param
    AND status IN ('active', 'completed');

  -- Total operating cost = maintenance + insurance + other costs
  v_total_operating := v_total_maintenance + v_total_insurance;

  -- Update vehicle record
  UPDATE vehicles
  SET 
    total_maintenance_cost = v_total_maintenance,
    total_insurance_cost = v_total_insurance,
    total_operating_cost = v_total_operating,
    updated_at = NOW()
  WHERE id = vehicle_id_param;

  RAISE NOTICE 'Updated vehicle %: Maintenance=%, Insurance=%, Operating=%, Revenue=%',
    vehicle_id_param, v_total_maintenance, v_total_insurance, v_total_operating, v_revenue_generated;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.calculate_vehicle_total_costs(vehicle_id_param uuid) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.check_customer_credit_status(customer_id_param uuid, company_id_param uuid)
 RETURNS TABLE(credit_score integer, risk_level text, credit_available numeric, payment_history_score integer, can_extend_credit boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    balance_info record;
    payment_score integer := 0;
    calculated_score integer := 0;
    risk_assessment text := 'low';
    credit_limit numeric := 0;
    can_extend boolean := true;
BEGIN
    -- Get current balance information
    SELECT * INTO balance_info 
    FROM public.calculate_customer_outstanding_balance(customer_id_param, company_id_param);
    
    -- Get customer credit limit
    SELECT COALESCE(credit_limit, 0) INTO credit_limit
    FROM public.customers
    WHERE id = customer_id_param;
    
    -- Calculate payment history score (0-100)
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 50  -- No history = neutral
            WHEN AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) >= 0.9 THEN 100
            WHEN AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) >= 0.7 THEN 80
            WHEN AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) >= 0.5 THEN 60
            ELSE 30
        END INTO payment_score
    FROM public.payments
    WHERE customer_id = customer_id_param AND company_id = company_id_param;
    
    -- Calculate overall credit score
    calculated_score := GREATEST(0, LEAST(100, 
        payment_score - 
        (balance_info.days_overdue * 2) -  -- Reduce score for overdue days
        CASE WHEN balance_info.overdue_amount > 0 THEN 20 ELSE 0 END -- Penalty for overdue amount
    ));
    
    -- Determine risk level
    IF calculated_score >= 80 THEN
        risk_assessment := 'low';
    ELSIF calculated_score >= 60 THEN
        risk_assessment := 'medium';
    ELSE
        risk_assessment := 'high';
    END IF;
    
    -- Determine if can extend credit
    can_extend := (calculated_score >= 60 AND balance_info.overdue_amount = 0);
    
    RETURN QUERY SELECT
        calculated_score as credit_score,
        risk_assessment as risk_level,
        balance_info.credit_available as credit_available,
        payment_score as payment_history_score,
        can_extend as can_extend_credit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.check_customer_credit_status(customer_id_param uuid, company_id_param uuid) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.create_customer_financial_account_fixed(customer_id_param uuid, company_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    customer_record record;
    account_id uuid;
    account_code varchar;
    account_name text;
    next_code_number integer;
BEGIN
    -- Get customer details
    SELECT * INTO customer_record
    FROM customers
    WHERE id = customer_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;
    
    -- Generate unique account code
    SELECT COALESCE(MAX(CAST(SUBSTRING(coa.account_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_code_number
    FROM chart_of_accounts coa  -- تحديد واضح للجدول
    WHERE coa.company_id = company_id_param
    AND coa.account_code LIKE '1201%';
    
    account_code := '1201' || LPAD(next_code_number::text, 4, '0');
    
    -- Create account name
    IF customer_record.customer_type = 'individual' THEN
        account_name := COALESCE(customer_record.first_name, '') || ' ' || COALESCE(customer_record.last_name, '');
    ELSE
        account_name := COALESCE(customer_record.company_name, 'Corporate Customer');
    END IF;
    
    account_name := 'Customer - ' || TRIM(account_name);
    
    -- Find parent receivables account مع تحديد واضح للجدول
    WITH receivables_account AS (
        SELECT coa.id as parent_id
        FROM chart_of_accounts coa  -- تحديد واضح للجدول
        WHERE coa.company_id = company_id_param
        AND coa.account_type = 'assets'
        AND (coa.account_name ILIKE '%receivable%' OR coa.account_code = '1201')
        AND coa.is_header = true
        LIMIT 1
    )
    -- Create the customer account
    INSERT INTO chart_of_accounts (
        id,
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        account_subtype,
        balance_type,
        parent_account_id,
        account_level,
        is_header,
        is_system,
        description,
        current_balance,
        is_active
    )
    SELECT 
        gen_random_uuid(),
        company_id_param,
        account_code,
        account_name,
        account_name || ' (العميل)',
        'assets',
        'accounts_receivable',
        'debit',
        ra.parent_id,
        CASE WHEN ra.parent_id IS NOT NULL THEN 3 ELSE 2 END,
        false,
        false,
        'Customer specific receivables account',
        0,
        true
    FROM receivables_account ra
    RETURNING id INTO account_id;
    
    -- Update customer with account_id
    UPDATE customers 
    SET account_id = account_id
    WHERE id = customer_id_param;
    
    RETURN account_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_customer_financial_account_fixed(customer_id_param uuid, company_id_param uuid) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.create_vendor_financial_account(vendor_id_param uuid, company_id_param uuid, vendor_data jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_id UUID;
    parent_account_id UUID;
    vendor_name TEXT;
    account_code TEXT;
    account_sequence INTEGER;
BEGIN
    -- البحث عن الحساب الأب للدائنين (المورديين)
    SELECT id INTO parent_account_id
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'liabilities'
    AND (account_name ILIKE '%payable%' 
         OR account_name ILIKE '%دائن%' 
         OR account_name ILIKE '%مورد%'
         OR account_code LIKE '21%')
    AND is_active = true
    ORDER BY account_code
    LIMIT 1;
    
    -- إذا لم يتم العثور على حساب الدائنين، قم بإنشاء واحد
    IF parent_account_id IS NULL THEN
        INSERT INTO public.chart_of_accounts (
            id,
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            balance_type,
            is_header,
            is_active,
            account_level,
            current_balance
        ) VALUES (
            gen_random_uuid(),
            company_id_param,
            '2110',
            'Trade Payables - Local',
            'ذمم الموردين المحلية',
            'liabilities',
            'credit',
            true,
            true,
            2,
            0
        ) RETURNING id INTO parent_account_id;
    END IF;
    
    -- إنشاء اسم الحساب
    IF vendor_data IS NOT NULL THEN
        vendor_name := COALESCE(vendor_data->>'vendor_name', 'Vendor');
    ELSE
        vendor_name := 'Vendor Account';
    END IF;
    
    -- إنشاء رقم تسلسلي للحساب
    SELECT COALESCE(MAX(CAST(SUBSTRING(account_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO account_sequence
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND parent_account_id = parent_account_id
    AND account_code ~ '^211[0-9]-[0-9]+$';
    
    -- إنشاء رمز الحساب
    account_code := '2111-' || LPAD(account_sequence::text, 4, '0');
    
    -- إنشاء الحساب
    INSERT INTO public.chart_of_accounts (
        id,
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        balance_type,
        parent_account_id,
        is_header,
        is_active,
        account_level,
        current_balance,
        description
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        account_code,
        vendor_name,
        vendor_name,
        'liabilities',
        'credit',
        parent_account_id,
        false,
        true,
        3,
        0,
        'Vendor account for: ' || vendor_name
    ) RETURNING id INTO account_id;
    
    -- ربط الحساب بالمورد
    INSERT INTO public.vendor_accounts (
        id,
        company_id,
        vendor_id,
        account_id,
        account_type,
        is_default
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        vendor_id_param,
        account_id,
        'payable',
        true
    );
    
    RETURN account_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_vendor_financial_account(vendor_id_param uuid, company_id_param uuid, vendor_data jsonb) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.fix_chart_hierarchy(target_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    orphaned_count INTEGER := 0;
    level_corrections INTEGER := 0;
    circular_refs_fixed INTEGER := 0;
    result json;
BEGIN
    -- 1. إصلاح الحسابات اليتيمة
    UPDATE chart_of_accounts 
    SET parent_account_id = NULL
    WHERE company_id = target_company_id
    AND parent_account_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts parent
        WHERE parent.id = chart_of_accounts.parent_account_id
        AND parent.company_id = target_company_id
        AND parent.is_active = true
    );
    
    GET DIAGNOSTICS orphaned_count = ROW_COUNT;
    
    -- 2. إصلاح المراجع الدائرية
    WITH RECURSIVE circular_check AS (
        SELECT id, parent_account_id, account_code, 1 as depth, ARRAY[id] as path
        FROM chart_of_accounts 
        WHERE company_id = target_company_id AND is_active = true
        
        UNION ALL
        
        SELECT c.id, p.parent_account_id, c.account_code, cc.depth + 1, cc.path || p.id
        FROM circular_check cc
        JOIN chart_of_accounts c ON c.id = cc.id
        JOIN chart_of_accounts p ON p.id = c.parent_account_id
        WHERE p.company_id = target_company_id 
        AND p.is_active = true
        AND cc.depth < 10
        AND NOT (p.id = ANY(cc.path))
    )
    UPDATE chart_of_accounts 
    SET parent_account_id = NULL
    WHERE id IN (
        SELECT DISTINCT id 
        FROM circular_check cc
        JOIN chart_of_accounts child ON child.parent_account_id = cc.id
        WHERE child.id = ANY(cc.path)
    );
    
    GET DIAGNOSTICS circular_refs_fixed = ROW_COUNT;
    
    -- 3. إعادة حساب مستويات الحسابات
    SELECT recalculate_account_levels(target_company_id) INTO level_corrections;
    
    -- إنشاء النتيجة
    result := json_build_object(
        'success', true,
        'orphaned_accounts_fixed', orphaned_count,
        'level_corrections', level_corrections,
        'circular_references_fixed', circular_refs_fixed,
        'total_fixes', orphaned_count + level_corrections + circular_refs_fixed,
        'message', CASE 
            WHEN (orphaned_count + level_corrections + circular_refs_fixed) = 0 THEN 
                'لا توجد مشاكل في هرمية الحسابات'
            ELSE 
                format('تم إصلاح %s مشكلة: %s حساب يتيم، %s تصحيح مستوى، %s مرجع دائري', 
                       orphaned_count + level_corrections + circular_refs_fixed,
                       orphaned_count, 
                       level_corrections, 
                       circular_refs_fixed)
        END
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'فشل في إصلاح هرمية الحسابات'
        );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fix_chart_hierarchy(target_company_id uuid) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.generate_customer_statement_data(customer_id_param uuid, company_id_param uuid, start_date_param date DEFAULT NULL::date, end_date_param date DEFAULT NULL::date)
 RETURNS TABLE(statement_period text, opening_balance numeric, total_charges numeric, total_payments numeric, closing_balance numeric, transaction_count integer, overdue_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    period_start date;
    period_end date;
    opening_bal numeric := 0;
    charges numeric := 0;
    payments numeric := 0;
    closing_bal numeric := 0;
    txn_count integer := 0;
    overdue_amt numeric := 0;
BEGIN
    -- Set default date range if not provided
    period_start := COALESCE(start_date_param, DATE_TRUNC('month', CURRENT_DATE));
    period_end := COALESCE(end_date_param, CURRENT_DATE);
    
    -- Calculate opening balance (invoices before period start minus payments)
    SELECT 
        COALESCE(SUM(i.total_amount), 0) - COALESCE(SUM(p.amount), 0) INTO opening_bal
    FROM public.invoices i
    LEFT JOIN public.payments p ON i.id = p.invoice_id AND p.status = 'completed' AND p.payment_date < period_start
    WHERE i.customer_id = customer_id_param 
    AND i.company_id = company_id_param
    AND i.invoice_date < period_start;
    
    -- Calculate charges during period
    SELECT COALESCE(SUM(total_amount), 0) INTO charges
    FROM public.invoices
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param
    AND invoice_date BETWEEN period_start AND period_end;
    
    -- Calculate payments during period
    SELECT COALESCE(SUM(amount), 0) INTO payments
    FROM public.payments
    WHERE customer_id = customer_id_param 
    AND company_id = company_id_param
    AND payment_date BETWEEN period_start AND period_end
    AND status = 'completed';
    
    -- Calculate transaction count
    SELECT 
        (SELECT COUNT(*) FROM public.invoices WHERE customer_id = customer_id_param AND company_id = company_id_param AND invoice_date BETWEEN period_start AND period_end) +
        (SELECT COUNT(*) FROM public.payments WHERE customer_id = customer_id_param AND company_id = company_id_param AND payment_date BETWEEN period_start AND period_end AND status = 'completed')
    INTO txn_count;
    
    -- Calculate closing balance
    closing_bal := opening_bal + charges - payments;
    
    -- Calculate overdue amount
    SELECT COALESCE(overdue_amount, 0) INTO overdue_amt
    FROM public.calculate_customer_outstanding_balance(customer_id_param, company_id_param);
    
    RETURN QUERY SELECT
        period_start::text || ' to ' || period_end::text as statement_period,
        opening_bal as opening_balance,
        charges as total_charges,
        payments as total_payments,
        closing_bal as closing_balance,
        txn_count as transaction_count,
        overdue_amt as overdue_amount;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.generate_customer_statement_data(customer_id_param uuid, company_id_param uuid, start_date_param date, end_date_param date) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_all_customers_outstanding_balance(company_id_param uuid)
 RETURNS TABLE(customer_id uuid, customer_name text, monthly_rent numeric, total_paid numeric, outstanding_balance numeric, months_behind integer, last_payment_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cu.id as customer_id,
    (cu.first_name || ' ' || cu.last_name) as customer_name,
    COALESCE(c.monthly_amount, 0) as monthly_rent,
    COALESCE(SUM(p.amount), 0) as total_paid,
    (
      (COALESCE(c.monthly_amount, 0) * 
        GREATEST(1, EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.start_date))::integer + 1)
      ) - COALESCE(SUM(p.amount), 0)
    ) as outstanding_balance,
    GREATEST(0, 
      (EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.start_date))::integer + 1) - 
      COUNT(DISTINCT TO_CHAR(p.payment_date, 'YYYY-MM'))::integer
    ) as months_behind,
    MAX(p.payment_date) as last_payment_date
  FROM customers cu
  INNER JOIN contracts c ON cu.id = c.customer_id
  LEFT JOIN payments p ON cu.id = p.customer_id AND p.payment_type = 'rental'
  WHERE cu.company_id = company_id_param
    AND c.status = 'active'
    AND cu.is_active = true
  GROUP BY cu.id, cu.first_name, cu.last_name, c.monthly_amount, c.start_date
  HAVING (
    (COALESCE(c.monthly_amount, 0) * 
      GREATEST(1, EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.start_date))::integer + 1)
    ) - COALESCE(SUM(p.amount), 0)
  ) > 0
  ORDER BY outstanding_balance DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_all_customers_outstanding_balance(company_id_param uuid) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_available_vehicles_for_contracts(company_id_param uuid, contract_start_date date DEFAULT NULL::date, contract_end_date date DEFAULT NULL::date)
 RETURNS TABLE(id uuid, plate_number text, make text, model text, year integer, color text, status vehicle_status, daily_rate numeric, weekly_rate numeric, monthly_rate numeric, minimum_rental_price numeric, enforce_minimum_price boolean, company_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.plate_number,
        v.make,
        v.model,
        v.year,
        v.color,
        v.status,
        v.daily_rate,
        v.weekly_rate,
        v.monthly_rate,
        v.minimum_rental_price,
        v.enforce_minimum_price,
        v.company_id
    FROM vehicles v
    WHERE v.company_id = company_id_param
    AND v.is_active = true
    AND v.status IN ('available', 'reserved')
    AND (
        -- إذا لم يتم تمرير تواريخ، إرجاع جميع المركبات المتاحة
        contract_start_date IS NULL 
        OR contract_end_date IS NULL
        OR NOT EXISTS (
            -- فحص التضارب مع العقود الموجودة
            SELECT 1 FROM contracts c
            WHERE c.vehicle_id = v.id
            AND c.company_id = company_id_param
            AND c.status IN ('active', 'draft')
            AND (
                (c.start_date <= contract_end_date AND c.end_date >= contract_start_date)
            )
        )
    )
    ORDER BY v.plate_number;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_available_vehicles_for_contracts(company_id_param uuid, contract_start_date date, contract_end_date date) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.is_aggregate_account(account_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_level integer;
    is_header boolean;
BEGIN
    SELECT account_level, is_header INTO account_level, is_header
    FROM public.chart_of_accounts
    WHERE id = account_id_param
    AND is_active = true;
    
    -- الحسابات الإجمالية هي الحسابات الرئيسية أو الحسابات أقل من المستوى 5
    RETURN is_header = true OR account_level < 5;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.is_aggregate_account(account_id_param uuid) TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.update_customer_aging_analysis(customer_id_param uuid, company_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    current_amt numeric := 0;
    days_1_30_amt numeric := 0;
    days_31_60_amt numeric := 0;
    days_61_90_amt numeric := 0;
    days_91_120_amt numeric := 0;
    days_over_120_amt numeric := 0;
    total_outstanding_amt numeric := 0;
    invoice_rec record;
    days_overdue integer;
    outstanding_amount numeric;
BEGIN
    -- Calculate aging buckets
    FOR invoice_rec IN
        SELECT i.id, i.due_date, i.total_amount,
               COALESCE(SUM(p.amount), 0) as paid_amount
        FROM public.invoices i
        LEFT JOIN public.payments p ON i.id = p.invoice_id AND p.status = 'completed'
        WHERE i.customer_id = customer_id_param 
        AND i.company_id = company_id_param
        AND i.status IN ('sent', 'overdue')
        GROUP BY i.id, i.due_date, i.total_amount
        HAVING i.total_amount > COALESCE(SUM(p.amount), 0)
    LOOP
        outstanding_amount := invoice_rec.total_amount - invoice_rec.paid_amount;
        days_overdue := GREATEST(0, (CURRENT_DATE - invoice_rec.due_date)::integer);
        
        IF days_overdue = 0 THEN
            current_amt := current_amt + outstanding_amount;
        ELSIF days_overdue BETWEEN 1 AND 30 THEN
            days_1_30_amt := days_1_30_amt + outstanding_amount;
        ELSIF days_overdue BETWEEN 31 AND 60 THEN
            days_31_60_amt := days_31_60_amt + outstanding_amount;
        ELSIF days_overdue BETWEEN 61 AND 90 THEN
            days_61_90_amt := days_61_90_amt + outstanding_amount;
        ELSIF days_overdue BETWEEN 91 AND 120 THEN
            days_91_120_amt := days_91_120_amt + outstanding_amount;
        ELSE
            days_over_120_amt := days_over_120_amt + outstanding_amount;
        END IF;
        
        total_outstanding_amt := total_outstanding_amt + outstanding_amount;
    END LOOP;
    
    -- Insert or update aging analysis
    INSERT INTO public.customer_aging_analysis (
        company_id, customer_id, analysis_date,
        current_amount, days_1_30, days_31_60, days_61_90, days_91_120, days_over_120,
        total_outstanding
    ) VALUES (
        company_id_param, customer_id_param, CURRENT_DATE,
        current_amt, days_1_30_amt, days_31_60_amt, days_61_90_amt, days_91_120_amt, days_over_120_amt,
        total_outstanding_amt
    )
    ON CONFLICT (company_id, customer_id, analysis_date) 
    DO UPDATE SET
        current_amount = EXCLUDED.current_amount,
        days_1_30 = EXCLUDED.days_1_30,
        days_31_60 = EXCLUDED.days_31_60,
        days_61_90 = EXCLUDED.days_61_90,
        days_91_120 = EXCLUDED.days_91_120,
        days_over_120 = EXCLUDED.days_over_120,
        total_outstanding = EXCLUDED.total_outstanding;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_customer_aging_analysis(customer_id_param uuid, company_id_param uuid) TO PUBLIC,anon,authenticated,service_role;

DROP FUNCTION IF EXISTS public.assert_finance_rpc_company_access_v1(uuid);
