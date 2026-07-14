-- Restores the exact pre-20260714340000 function definitions and execution grants.

CREATE OR REPLACE FUNCTION public.get_whatsapp_statistics()
 RETURNS TABLE(total_reminders bigint, sent_count bigint, failed_count bigint, pending_count bigint, cancelled_count bigint, unique_customers bigint, unique_invoices bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_reminders,
    COUNT(*) FILTER (WHERE status = 'sent')::BIGINT as sent_count,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_count,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_count,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as cancelled_count,
    COUNT(DISTINCT customer_id)::BIGINT as unique_customers,
    COUNT(DISTINCT invoice_id)::BIGINT as unique_invoices
  FROM reminder_schedules;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_whatsapp_statistics() TO PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.update_delinquent_customers(p_company_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(processed_count integer, added_count integer, updated_count integer, removed_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_processed_count INTEGER := 0;
    v_added_count INTEGER := 0;
    v_updated_count INTEGER := 0;
    v_removed_count INTEGER := 0;
    v_company_id UUID;
    v_contract RECORD;
    v_customer RECORD;
    v_payment RECORD;
    v_violation RECORD;
    v_legal_case RECORD;
    v_today DATE := CURRENT_DATE;
    v_contract_start_date DATE;
    v_months_since_start INTEGER;
    v_expected_payments INTEGER;
    v_actual_payments INTEGER;
    v_months_unpaid INTEGER;
    v_overdue_amount NUMERIC;
    v_days_overdue INTEGER;
    v_last_expected_payment_date DATE;
    v_late_penalty NUMERIC;
    v_violations_count INTEGER;
    v_violations_amount NUMERIC;
    v_total_debt NUMERIC;
    v_risk_score NUMERIC;
    v_risk_level TEXT;
    v_risk_level_en TEXT;
    v_risk_color TEXT;
    v_recommended_action TEXT;
    v_has_previous_legal_cases BOOLEAN;
    v_previous_legal_cases_count INTEGER;
    v_last_payment_date DATE;
    v_last_payment_amount NUMERIC;
    v_customer_name TEXT;
    v_existing_record UUID;
BEGIN
    -- If no company_id provided, process all companies
    IF p_company_id IS NOT NULL THEN
        -- Process single company
        FOR v_contract IN
            SELECT 
                c.id,
                c.contract_number,
                c.start_date,
                c.monthly_rent,
                c.vehicle_id,
                c.customer_id,
                c.company_id,
                cust.id as cust_id,
                cust.customer_code,
                cust.first_name,
                cust.last_name,
                cust.first_name_ar,
                cust.last_name_ar,
                cust.company_name,
                cust.company_name_ar,
                cust.customer_type,
                cust.phone,
                cust.email,
                cust.credit_limit,
                cust.is_blacklisted,
                v.plate_number as vehicle_plate
            FROM contracts c
            INNER JOIN customers cust ON c.customer_id = cust.id
            LEFT JOIN vehicles v ON c.vehicle_id = v.id
            WHERE c.company_id = p_company_id
            AND c.status = 'active'
            AND c.start_date IS NOT NULL
        LOOP
            v_processed_count := v_processed_count + 1;
            
            -- Calculate expected payments
            v_contract_start_date := v_contract.start_date;
            v_months_since_start := FLOOR(EXTRACT(EPOCH FROM (v_today - v_contract_start_date)) / (30 * 24 * 60 * 60));
            v_expected_payments := GREATEST(0, v_months_since_start);
            
            -- Get actual payments
            SELECT COUNT(*), MAX(payment_date), MAX(amount)
            INTO v_actual_payments, v_last_payment_date, v_last_payment_amount
            FROM payments
            WHERE customer_id = v_contract.customer_id
            AND company_id = v_contract.company_id
            AND payment_status = 'completed';
            
            -- Calculate months unpaid
            v_months_unpaid := GREATEST(0, v_expected_payments - COALESCE(v_actual_payments, 0));
            
            -- Skip if no unpaid months
            IF v_months_unpaid = 0 THEN
                CONTINUE;
            END IF;
            
            -- Calculate overdue amount
            v_overdue_amount := v_months_unpaid * v_contract.monthly_rent;
            
            -- Calculate days overdue
            v_last_expected_payment_date := v_contract_start_date + (v_expected_payments || ' months')::INTERVAL;
            v_days_overdue := GREATEST(0, v_today - v_last_expected_payment_date);
            
            -- Calculate late penalty (50 QAR per day)
            v_late_penalty := v_days_overdue * 50;
            
            -- Get violations
            SELECT COUNT(*), COALESCE(SUM(fine_amount), 0)
            INTO v_violations_count, v_violations_amount
            FROM traffic_violations
            WHERE customer_id = v_contract.customer_id
            AND company_id = v_contract.company_id
            AND status != 'paid';
            
            -- Get legal history
            SELECT COUNT(*) > 0, COUNT(*)
            INTO v_has_previous_legal_cases, v_previous_legal_cases_count
            FROM legal_cases
            WHERE client_id = v_contract.customer_id
            AND company_id = v_contract.company_id;
            
            -- Calculate risk score (simplified calculation)
            v_risk_score := 0;
            v_risk_score := v_risk_score + LEAST((v_days_overdue / 120.0) * 100 * 0.40, 40);
            IF v_contract.credit_limit > 0 THEN
                v_risk_score := v_risk_score + LEAST((v_overdue_amount / v_contract.credit_limit) * 100 * 0.30, 30);
            ELSE
                v_risk_score := v_risk_score + 30;
            END IF;
            v_risk_score := v_risk_score + LEAST((v_violations_count / 5.0) * 100 * 0.15, 15);
            IF v_expected_payments > 0 THEN
                v_risk_score := v_risk_score + ((v_months_unpaid / v_expected_payments::NUMERIC) * 100 * 0.10);
            END IF;
            IF v_has_previous_legal_cases THEN
                v_risk_score := v_risk_score + 5;
            END IF;
            v_risk_score := LEAST(v_risk_score, 100);
            
            -- Determine risk level
            IF v_risk_score >= 85 THEN
                v_risk_level := 'CRITICAL';
                v_risk_level_en := 'Critical';
                v_risk_color := 'red';
                v_recommended_action := 'BLACKLIST_AND_FILE_CASE';
            ELSIF v_risk_score >= 70 THEN
                v_risk_level := 'HIGH';
                v_risk_level_en := 'High';
                v_risk_color := 'red';
                v_recommended_action := 'FILE_LEGAL_CASE';
            ELSIF v_risk_score >= 60 THEN
                v_risk_level := 'MEDIUM';
                v_risk_level_en := 'Medium';
                v_risk_color := 'orange';
                v_recommended_action := 'SEND_FORMAL_NOTICE';
            ELSIF v_risk_score >= 40 THEN
                v_risk_level := 'LOW';
                v_risk_level_en := 'Low';
                v_risk_color := 'yellow';
                v_recommended_action := 'SEND_WARNING';
            ELSE
                v_risk_level := 'MONITOR';
                v_risk_level_en := 'Monitor';
                v_risk_color := 'green';
                v_recommended_action := 'MONITOR';
            END IF;
            
            -- Calculate total debt
            v_total_debt := v_overdue_amount + v_late_penalty + COALESCE(v_violations_amount, 0);
            
            -- Build customer name - استخدام الأسماء العربية بالأولوية
            IF v_contract.customer_type = 'individual' THEN
                -- استخدام الأسماء العربية أولاً، ثم الإنجليزية كـ fallback
                v_customer_name := TRIM(
                    COALESCE(v_contract.first_name_ar, v_contract.first_name, '') || ' ' || 
                    COALESCE(v_contract.last_name_ar, v_contract.last_name, '')
                );
            ELSE
                -- للشركات، استخدام الاسم العربي أولاً
                v_customer_name := COALESCE(v_contract.company_name_ar, v_contract.company_name, '');
            END IF;
            
            -- Check if record exists
            SELECT id INTO v_existing_record
            FROM delinquent_customers
            WHERE company_id = v_contract.company_id
            AND customer_id = v_contract.customer_id
            AND contract_id = v_contract.id;
            
            -- Insert or update
            IF v_existing_record IS NOT NULL THEN
                UPDATE delinquent_customers
                SET
                    customer_name = v_customer_name,
                    customer_code = v_contract.customer_code,
                    customer_type = v_contract.customer_type,
                    phone = v_contract.phone,
                    email = v_contract.email,
                    credit_limit = COALESCE(v_contract.credit_limit, 0),
                    is_blacklisted = COALESCE(v_contract.is_blacklisted, false),
                    contract_number = v_contract.contract_number,
                    contract_start_date = v_contract_start_date,
                    monthly_rent = v_contract.monthly_rent,
                    vehicle_id = v_contract.vehicle_id,
                    vehicle_plate = v_contract.vehicle_plate,
                    months_unpaid = v_months_unpaid,
                    overdue_amount = v_overdue_amount,
                    last_payment_date = v_last_payment_date,
                    last_payment_amount = COALESCE(v_last_payment_amount, 0),
                    actual_payments_count = v_actual_payments,
                    expected_payments_count = v_expected_payments,
                    days_overdue = v_days_overdue,
                    late_penalty = v_late_penalty,
                    violations_count = v_violations_count,
                    violations_amount = v_violations_amount,
                    total_debt = v_total_debt,
                    risk_score = v_risk_score,
                    risk_level = v_risk_level,
                    risk_level_en = v_risk_level_en,
                    risk_color = v_risk_color,
                    recommended_action = v_recommended_action,
                    has_previous_legal_cases = v_has_previous_legal_cases,
                    previous_legal_cases_count = v_previous_legal_cases_count,
                    last_updated_at = NOW()
                WHERE id = v_existing_record;
                
                v_updated_count := v_updated_count + 1;
            ELSE
                INSERT INTO delinquent_customers (
                    company_id,
                    customer_id,
                    customer_name,
                    customer_code,
                    customer_type,
                    phone,
                    email,
                    credit_limit,
                    is_blacklisted,
                    contract_id,
                    contract_number,
                    contract_start_date,
                    monthly_rent,
                    vehicle_id,
                    vehicle_plate,
                    months_unpaid,
                    overdue_amount,
                    last_payment_date,
                    last_payment_amount,
                    actual_payments_count,
                    expected_payments_count,
                    days_overdue,
                    late_penalty,
                    violations_count,
                    violations_amount,
                    total_debt,
                    risk_score,
                    risk_level,
                    risk_level_en,
                    risk_color,
                    recommended_action,
                    has_previous_legal_cases,
                    previous_legal_cases_count,
                    first_detected_at,
                    last_updated_at,
                    is_active
                ) VALUES (
                    v_contract.company_id,
                    v_contract.customer_id,
                    v_customer_name,
                    v_contract.customer_code,
                    v_contract.customer_type,
                    v_contract.phone,
                    v_contract.email,
                    COALESCE(v_contract.credit_limit, 0),
                    COALESCE(v_contract.is_blacklisted, false),
                    v_contract.id,
                    v_contract.contract_number,
                    v_contract_start_date,
                    v_contract.monthly_rent,
                    v_contract.vehicle_id,
                    v_contract.vehicle_plate,
                    v_months_unpaid,
                    v_overdue_amount,
                    v_last_payment_date,
                    COALESCE(v_last_payment_amount, 0),
                    v_actual_payments,
                    v_expected_payments,
                    v_days_overdue,
                    v_late_penalty,
                    v_violations_count,
                    v_violations_amount,
                    v_total_debt,
                    v_risk_score,
                    v_risk_level,
                    v_risk_level_en,
                    v_risk_color,
                    v_recommended_action,
                    v_has_previous_legal_cases,
                    v_previous_legal_cases_count,
                    NOW(),
                    NOW(),
                    true
                );
                
                v_added_count := v_added_count + 1;
            END IF;
        END LOOP;
        
        -- Mark inactive customers (no longer delinquent)
        UPDATE delinquent_customers
        SET is_active = false, last_updated_at = NOW()
        WHERE company_id = p_company_id
        AND is_active = true
        AND id NOT IN (
            SELECT dc.id
            FROM delinquent_customers dc
            INNER JOIN contracts c ON dc.contract_id = c.id
            WHERE dc.company_id = p_company_id
            AND c.status = 'active'
        );
        
        GET DIAGNOSTICS v_removed_count = ROW_COUNT;
    ELSE
        -- Process all companies
        FOR v_company_id IN
            SELECT DISTINCT id FROM companies WHERE is_active = true
        LOOP
            -- Recursive call for each company
            PERFORM update_delinquent_customers(v_company_id);
        END LOOP;
    END IF;
    
    RETURN QUERY SELECT v_processed_count, v_added_count, v_updated_count, v_removed_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_delinquent_customers(p_company_id uuid) TO PUBLIC,anon,authenticated,service_role;

