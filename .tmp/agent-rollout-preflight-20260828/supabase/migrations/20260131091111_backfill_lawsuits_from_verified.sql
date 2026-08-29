-- Backfill lawsuits from verified customers
DO $$
DECLARE
  v_task RECORD;
  v_contract RECORD;
  v_customer RECORD;
  v_overdue_amount DECIMAL;
  v_late_penalty DECIMAL;
  v_months_unpaid INTEGER;
  v_days_overdue INTEGER;
  v_invoices_count INTEGER;
  v_claim_amount DECIMAL;
  v_case_title TEXT;
  v_facts TEXT;
  v_requests TEXT;
  v_created_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  FOR v_task IN 
    SELECT DISTINCT ON (customer_id, contract_id)
      id, company_id, customer_id, contract_id, verified_by, verified_at, verifier_name
    FROM customer_verification_tasks
    WHERE status = 'verified' AND verified_at IS NOT NULL
    ORDER BY customer_id, contract_id, verified_at DESC
  LOOP
    
    IF EXISTS (SELECT 1 FROM lawsuit_templates WHERE contract_id = v_task.contract_id AND customer_id = v_task.customer_id) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    SELECT * INTO v_contract FROM contracts WHERE id = v_task.contract_id;
    IF NOT FOUND THEN v_skipped_count := v_skipped_count + 1; CONTINUE; END IF;
    
    SELECT * INTO v_customer FROM customers WHERE id = v_task.customer_id;
    IF NOT FOUND THEN v_skipped_count := v_skipped_count + 1; CONTINUE; END IF;
    
    IF v_customer.national_id IS NULL OR TRIM(v_customer.national_id) = '' THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    IF v_customer.phone IS NULL OR TRIM(v_customer.phone) = '' THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    SELECT COUNT(*), SUM(total_amount - COALESCE(paid_amount, 0))
    INTO v_invoices_count, v_overdue_amount
    FROM invoices
    WHERE contract_id = v_task.contract_id
    AND (total_amount - COALESCE(paid_amount, 0)) > 0
    AND status != 'cancelled';
    
    v_invoices_count := COALESCE(v_invoices_count, 0);
    v_overdue_amount := COALESCE(v_overdue_amount, 0);
    
    v_months_unpaid := v_invoices_count;
    v_days_overdue := GREATEST(0, EXTRACT(DAY FROM (v_task.verified_at - v_contract.start_date))::INTEGER);
    v_late_penalty := LEAST(v_days_overdue * 120, 3000);
    v_claim_amount := v_overdue_amount + v_late_penalty;
    
    IF v_claim_amount <= 0 THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    v_case_title := 'مطالبة مالية - ' || COALESCE(
      v_customer.company_name_ar,
      TRIM(COALESCE(v_customer.first_name_ar, '') || ' ' || COALESCE(v_customer.last_name_ar, '')),
      'عميل'
    );
    
    v_facts := format('تأخر في سداد المبالغ المستحقة. المبلغ: %s ر.ق', v_claim_amount);
    v_requests := format('إلزام بأداء %s ريال قطري', v_claim_amount);
    
    BEGIN
      INSERT INTO lawsuit_templates (
        company_id, customer_id, contract_id, case_title, facts, requests,
        claim_amount, claim_amount_words,
        defendant_first_name, defendant_middle_name, defendant_last_name,
        defendant_nationality, defendant_id_number, defendant_address,
        defendant_phone, defendant_email,
        months_unpaid, overdue_amount, late_penalty, days_overdue,
        invoices_count, total_invoices_amount, total_penalties,
        violations_count, violations_amount,
        auto_created, verification_task_id
      ) VALUES (
        v_task.company_id, v_task.customer_id, v_task.contract_id,
        v_case_title, v_facts, v_requests,
        v_claim_amount, '',
        v_customer.first_name_ar, v_customer.middle_name_ar, v_customer.last_name_ar,
        v_customer.nationality, v_customer.national_id, v_customer.address,
        v_customer.phone, v_customer.email,
        v_months_unpaid, v_overdue_amount, v_late_penalty, v_days_overdue,
        v_invoices_count, v_overdue_amount, v_late_penalty,
        0, 0,
        TRUE, v_task.id
      );
      v_created_count := v_created_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_skipped_count := v_skipped_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Created: % lawsuits', v_created_count;
  RAISE NOTICE '⏭ Skipped: % customers', v_skipped_count;
END $$;;
