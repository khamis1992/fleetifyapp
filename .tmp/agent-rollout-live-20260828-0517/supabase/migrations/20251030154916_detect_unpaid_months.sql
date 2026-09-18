-- ================================================================
-- DETECT AND CREATE LEGAL CASES FOR UNPAID MONTHS
-- ================================================================
-- Automatically detects months within active contracts that don't have payments
-- and creates legal cases for them
-- Created: 2025-01-27
-- ================================================================

CREATE OR REPLACE FUNCTION detect_and_create_legal_cases_for_unpaid_months()
RETURNS TABLE(cases_created INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_customer RECORD;
  v_case_id UUID;
  v_case_number TEXT;
  v_cases_created INTEGER := 0;
  v_month_date DATE;
  v_current_date DATE := CURRENT_DATE;
  v_case_count INTEGER;
BEGIN
  -- Loop through all active contracts
  FOR v_contract IN
    SELECT 
      c.id,
      c.company_id,
      c.customer_id,
      c.monthly_amount,
      c.start_date,
      c.end_date,
      c.vehicle_id,
      CONCAT(
        COALESCE(cust.first_name_ar, cust.first_name, ''), ' ', 
        COALESCE(cust.last_name_ar, cust.last_name, '')
      ) as customer_name
    FROM contracts c
    JOIN customers cust ON c.customer_id = cust.id
    WHERE c.status = 'active'
      AND c.monthly_amount > 0
  LOOP
    -- Check for unpaid months from contract start date to current date
    v_month_date := DATE_TRUNC('month', v_contract.start_date)::DATE;
    
    WHILE v_month_date <= v_current_date 
      AND (v_contract.end_date IS NULL OR v_month_date <= DATE_TRUNC('month', v_contract.end_date)::DATE)
    LOOP
      -- Check if this month has a paid receipt
      IF NOT EXISTS (
        SELECT 1 FROM rental_payment_receipts
        WHERE customer_id = v_contract.customer_id
          AND company_id = v_contract.company_id
          AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM v_month_date)
          AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM v_month_date)
          AND payment_status = 'paid'
          AND total_paid >= rent_amount
      ) THEN
        -- This month is unpaid - check if legal case already exists for it
        IF NOT EXISTS (
          SELECT 1 FROM legal_cases
          WHERE customer_id = v_contract.customer_id
            AND company_id = v_contract.company_id
            AND case_status = 'open'
            AND metadata->>'unpaid_month' = TO_CHAR(v_month_date, 'YYYY-MM-DD')
        ) THEN
          -- Generate case number
          SELECT COUNT(*) + 1 INTO v_case_count
          FROM legal_cases
          WHERE company_id = v_contract.company_id
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
          
          v_case_number := 'LC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_case_count::TEXT, 4, '0');
          
          -- Create legal case for unpaid month
          INSERT INTO legal_cases (
            company_id,
            customer_id,
            case_number,
            case_title,
            case_type,
            case_status,
            priority,
            claim_amount,
            currency,
            description,
            metadata,
            filed_date,
            created_at,
            updated_at
          ) VALUES (
            v_contract.company_id,
            v_contract.customer_id,
            v_case_number,
            'قضية تحصيل دين - ' || v_contract.customer_name || ' - شهر ' || TO_CHAR(v_month_date, 'TMMonth YYYY'),
            'rental',
            'open',
            'high',
            v_contract.monthly_amount,
            'QAR',
            'قضية تحصيل دين تلقائية نتيجة عدم سداد إيصال الإيجار الشهري لشهر ' || 
            TO_CHAR(v_month_date, 'TMMonth YYYY') || '. المبلغ المستحق: ' || 
            v_contract.monthly_amount::TEXT || ' ريال. لا يوجد دفعة مسجلة لهذا الشهر.',
            jsonb_build_object(
              'unpaid_month', TO_CHAR(v_month_date, 'YYYY-MM-DD'),
              'contract_id', v_contract.id,
              'vehicle_id', v_contract.vehicle_id,
              'auto_detected', true,
              'month_name', TO_CHAR(v_month_date, 'TMMonth YYYY'),
              'monthly_amount', v_contract.monthly_amount
            ),
            CURRENT_DATE,
            NOW(),
            NOW()
          );
          
          v_cases_created := v_cases_created + 1;
        END IF;
      END IF;
      
      -- Move to next month
      v_month_date := v_month_date + INTERVAL '1 month';
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT v_cases_created;
END;
$$;

-- Add comments
COMMENT ON FUNCTION detect_and_create_legal_cases_for_unpaid_months IS 
'Automatically detects months within active contracts that don''t have paid receipts and creates legal cases for them. Should be run daily to catch any missed payments.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION detect_and_create_legal_cases_for_unpaid_months TO authenticated;
GRANT EXECUTE ON FUNCTION detect_and_create_legal_cases_for_unpaid_months TO service_role;;
