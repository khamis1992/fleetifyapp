-- Create function for auto-creating lawsuits
CREATE OR REPLACE FUNCTION auto_create_lawsuit_on_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_customer RECORD;
  v_vehicle RECORD;
  v_overdue_amount DECIMAL DEFAULT 0;
  v_late_penalty DECIMAL DEFAULT 0;
  v_months_unpaid INTEGER DEFAULT 0;
  v_days_overdue INTEGER DEFAULT 0;
  v_invoices_count INTEGER DEFAULT 0;
  v_total_invoices_amount DECIMAL DEFAULT 0;
  v_violations_count INTEGER DEFAULT 0;
  v_violations_amount DECIMAL DEFAULT 0;
  v_claim_amount DECIMAL DEFAULT 0;
  v_case_title TEXT;
  v_facts TEXT;
  v_requests TEXT;
BEGIN
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    
    SELECT * INTO v_contract FROM contracts WHERE id = NEW.contract_id;
    IF NOT FOUND THEN RETURN NEW; END IF;
    
    SELECT * INTO v_customer FROM customers WHERE id = NEW.customer_id;
    IF NOT FOUND THEN RETURN NEW; END IF;
    
    IF v_customer.national_id IS NULL OR v_customer.phone IS NULL THEN
      RETURN NEW;
    END IF;
    
    IF v_contract.vehicle_id IS NOT NULL THEN
      SELECT * INTO v_vehicle FROM vehicles WHERE id = v_contract.vehicle_id;
    END IF;
    
    SELECT 
      COUNT(*),
      SUM(total_amount - COALESCE(paid_amount, 0))
    INTO v_invoices_count, v_overdue_amount
    FROM invoices
    WHERE contract_id = NEW.contract_id
    AND (total_amount - COALESCE(paid_amount, 0)) > 0
    AND status != 'cancelled';
    
    v_invoices_count := COALESCE(v_invoices_count, 0);
    v_overdue_amount := COALESCE(v_overdue_amount, 0);
    v_total_invoices_amount := v_overdue_amount;
    
    SELECT 
      COUNT(*),
      SUM(COALESCE(fine_amount, 0))
    INTO v_violations_count, v_violations_amount
    FROM traffic_violations
    WHERE contract_id = NEW.contract_id
    AND payment_status != 'paid';
    
    v_violations_count := COALESCE(v_violations_count, 0);
    v_violations_amount := COALESCE(v_violations_amount, 0);
    
    v_months_unpaid := v_invoices_count;
    v_days_overdue := GREATEST(0, EXTRACT(DAY FROM (NOW() - v_contract.start_date))::INTEGER);
    v_late_penalty := LEAST(v_days_overdue * 120, 3000);
    v_claim_amount := v_overdue_amount + v_late_penalty + v_violations_amount;
    
    IF v_claim_amount <= 0 THEN
      RETURN NEW;
    END IF;
    
    v_case_title := 'مطالبة مالية - ' || COALESCE(
      v_customer.company_name_ar,
      TRIM(COALESCE(v_customer.first_name_ar, '') || ' ' || COALESCE(v_customer.last_name_ar, '')),
      'عميل'
    );
    
    v_facts := format(
      'تأخر المدعى عليه في سداد المبالغ المستحقة. المبلغ: %s ر.ق',
      v_claim_amount
    );
    
    v_requests := format(
      'إلزام المدعى عليه بأداء مبلغ %s ريال قطري',
      v_claim_amount
    );
    
    IF EXISTS (
      SELECT 1 FROM lawsuit_templates 
      WHERE contract_id = NEW.contract_id
      AND customer_id = NEW.customer_id
    ) THEN
      RETURN NEW;
    END IF;
    
    BEGIN
      INSERT INTO lawsuit_templates (
        company_id, customer_id, contract_id,
        case_title, facts, requests, claim_amount, claim_amount_words,
        defendant_first_name, defendant_middle_name, defendant_last_name,
        defendant_nationality, defendant_id_number, defendant_address,
        defendant_phone, defendant_email,
        months_unpaid, overdue_amount, late_penalty, days_overdue,
        invoices_count, total_invoices_amount, total_penalties,
        violations_count, violations_amount,
        auto_created, verification_task_id
      ) VALUES (
        NEW.company_id, NEW.customer_id, NEW.contract_id,
        v_case_title, v_facts, v_requests, v_claim_amount, '',
        v_customer.first_name_ar, v_customer.middle_name_ar, v_customer.last_name_ar,
        v_customer.nationality, v_customer.national_id, v_customer.address,
        v_customer.phone, v_customer.email,
        v_months_unpaid, v_overdue_amount, v_late_penalty, v_days_overdue,
        v_invoices_count, v_total_invoices_amount, v_late_penalty,
        v_violations_count, v_violations_amount,
        TRUE, NEW.id
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error creating lawsuit: %', SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$;;
