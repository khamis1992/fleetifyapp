-- ============================================================================
-- المرحلة 3: دالة تقرير صحة النظام المالي
-- ============================================================================

CREATE OR REPLACE FUNCTION financial_health_report()
RETURNS TABLE (
  issue TEXT,
  count BIGINT,
  severity TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. عقود نشطة بدون جدول دفعات
  RETURN QUERY
  SELECT 
    'عقود نشطة بدون جدول دفعات'::TEXT,
    COUNT(*)::BIGINT,
    'حرج'::TEXT,
    ''::TEXT
  FROM contracts c 
  WHERE c.status IN ('active', 'suspended', 'under_review') 
    AND COALESCE(c.monthly_amount, 0) > 0
    AND NOT EXISTS (SELECT 1 FROM contract_payment_schedules ps WHERE ps.contract_id = c.id);

  -- 2. أقساط مستحقة بدون فواتير
  RETURN QUERY
  SELECT 
    'أقساط مستحقة بدون فواتير'::TEXT,
    COUNT(*)::BIGINT,
    'مرتفع'::TEXT,
    ''::TEXT
  FROM contract_payment_schedules ps
  WHERE ps.invoice_id IS NULL AND ps.due_date <= CURRENT_DATE;

  -- 3. فواتير برصيد سالب
  RETURN QUERY
  SELECT 
    'فواتير برصيد سالب'::TEXT,
    COUNT(*)::BIGINT,
    'حرج'::TEXT,
    ''::TEXT
  FROM invoices WHERE balance_due < 0 AND status != 'cancelled';

  -- 4. فواتير paid_amount لا يطابق المدفوعات
  RETURN QUERY
  SELECT 
    'فواتير paid_amount لا يطابق المدفوعات'::TEXT,
    COUNT(*)::BIGINT,
    'مرتفع'::TEXT,
    ''::TEXT
  FROM invoices i
  WHERE i.status != 'cancelled'
    AND i.paid_amount != COALESCE((
      SELECT SUM(p.amount) FROM payments p 
      WHERE p.invoice_id = i.id AND p.payment_status = 'completed'
    ), 0);

  -- 5. أقساط حالتها لا تطابق الفاتورة
  RETURN QUERY
  SELECT 
    'أقساط حالتها لا تطابق الفاتورة'::TEXT,
    COUNT(*)::BIGINT,
    'متوسط'::TEXT,
    ''::TEXT
  FROM contract_payment_schedules ps
  JOIN invoices i ON i.id = ps.invoice_id
  WHERE (ps.status = 'paid' AND i.payment_status != 'paid')
     OR (ps.status = 'overdue' AND i.payment_status = 'paid');

  -- 6. دفعات محتملة مكررة
  RETURN QUERY
  SELECT 
    'دفعات محتملة مكررة'::TEXT,
    COALESCE(SUM(cnt - 1), 0)::BIGINT,
    'مرتفع'::TEXT,
    ''::TEXT
  FROM (
    SELECT COUNT(*) as cnt
    FROM payments p
    WHERE p.invoice_id IS NOT NULL AND p.payment_status = 'completed'
    GROUP BY p.invoice_id, DATE(p.payment_date), p.amount
    HAVING COUNT(*) > 1
  ) dup;

  -- 7. إجمالي المشاكل الحرجة
  RETURN QUERY
  SELECT 
    '=== ملخص الحالة ==='::TEXT,
    0::BIGINT,
    CASE 
      WHEN EXISTS (SELECT 1 FROM contracts c WHERE c.status IN ('active', 'suspended', 'under_review') AND COALESCE(c.monthly_amount, 0) > 0 AND NOT EXISTS (SELECT 1 FROM contract_payment_schedules ps WHERE ps.contract_id = c.id))
        OR EXISTS (SELECT 1 FROM invoices WHERE balance_due < 0 AND status != 'cancelled')
      THEN 'يوجد مشاكل حرجة'
      WHEN EXISTS (SELECT 1 FROM contract_payment_schedules ps WHERE ps.invoice_id IS NULL AND ps.due_date <= CURRENT_DATE)
      THEN 'يوجد مشاكل مرتفعة'
      ELSE 'النظام سليم ✓'
    END::TEXT,
    ''::TEXT;
END;
$$;

-- ============================================================================
-- دالة إصلاح عقد محدد (للاستخدام من الواجهة)
-- ============================================================================
CREATE OR REPLACE FUNCTION fix_single_contract(p_contract_id UUID)
RETURNS TABLE (
  schedules_created INTEGER,
  invoices_created INTEGER,
  schedules_synced INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_months INTEGER;
  v_current_date DATE;
  v_schedules_created INTEGER := 0;
  v_invoices_created INTEGER := 0;
  v_schedules_synced INTEGER := 0;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  i INTEGER;
BEGIN
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  
  IF v_contract IS NULL OR COALESCE(v_contract.monthly_amount, 0) <= 0 THEN
    schedules_created := 0;
    invoices_created := 0;
    schedules_synced := 0;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- حساب عدد الأشهر
  IF COALESCE(v_contract.contract_amount, 0) > 0 THEN
    v_months := CEIL(v_contract.contract_amount / v_contract.monthly_amount);
  ELSIF v_contract.end_date IS NOT NULL THEN
    v_months := EXTRACT(YEAR FROM AGE(v_contract.end_date, v_contract.start_date)) * 12 
              + EXTRACT(MONTH FROM AGE(v_contract.end_date, v_contract.start_date)) + 1;
  ELSE
    v_months := 12;
  END IF;
  v_months := LEAST(v_months, 60);

  -- إنشاء الأقساط المفقودة
  FOR i IN 1..v_months LOOP
    v_current_date := DATE_TRUNC('month', v_contract.start_date)::DATE + (i || ' months')::INTERVAL;
    
    IF NOT EXISTS (
      SELECT 1 FROM contract_payment_schedules 
      WHERE contract_id = p_contract_id AND installment_number = i
    ) THEN
      INSERT INTO contract_payment_schedules (
        company_id, contract_id, installment_number, amount, due_date, status, created_at
      ) VALUES (
        v_contract.company_id, p_contract_id, i, v_contract.monthly_amount, v_current_date,
        CASE WHEN v_current_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END,
        NOW()
      );
      v_schedules_created := v_schedules_created + 1;
    END IF;
  END LOOP;

  -- إنشاء الفواتير المفقودة وربطها
  FOR i IN 1..v_months LOOP
    v_current_date := DATE_TRUNC('month', v_contract.start_date)::DATE + (i || ' months')::INTERVAL;
    
    IF v_current_date <= CURRENT_DATE + INTERVAL '1 month' THEN
      -- التحقق من وجود قسط بدون فاتورة
      IF EXISTS (
        SELECT 1 FROM contract_payment_schedules ps
        WHERE ps.contract_id = p_contract_id 
        AND ps.installment_number = i 
        AND ps.invoice_id IS NULL
      ) THEN
        -- البحث عن فاتورة موجودة
        SELECT id INTO v_invoice_id
        FROM invoices
        WHERE contract_id = p_contract_id
          AND invoice_month = DATE_TRUNC('month', v_current_date)::DATE
          AND status != 'cancelled'
        LIMIT 1;
        
        IF v_invoice_id IS NULL THEN
          -- إنشاء فاتورة جديدة
          v_invoice_number := 'INV-' || v_contract.contract_number || '-' || TO_CHAR(v_current_date, 'YYYY-MM');
          WHILE EXISTS (SELECT 1 FROM invoices WHERE invoice_number = v_invoice_number) LOOP
            v_invoice_number := v_invoice_number || 'A';
          END LOOP;
          
          INSERT INTO invoices (
            company_id, customer_id, contract_id,
            invoice_number, invoice_date, due_date, invoice_month,
            total_amount, subtotal, balance_due, paid_amount,
            payment_status, status, invoice_type, notes, created_at
          ) VALUES (
            v_contract.company_id, v_contract.customer_id, p_contract_id,
            v_invoice_number, v_current_date, v_current_date,
            DATE_TRUNC('month', v_current_date)::DATE,
            v_contract.monthly_amount, v_contract.monthly_amount, v_contract.monthly_amount, 0,
            'unpaid', CASE WHEN v_current_date < CURRENT_DATE THEN 'overdue' ELSE 'draft' END,
            'sales', 'فاتورة إيجار - قسط ' || i, NOW()
          ) RETURNING id INTO v_invoice_id;
          
          v_invoices_created := v_invoices_created + 1;
        END IF;
        
        -- ربط القسط بالفاتورة
        UPDATE contract_payment_schedules
        SET invoice_id = v_invoice_id, updated_at = NOW()
        WHERE contract_id = p_contract_id AND installment_number = i;
        
        v_schedules_synced := v_schedules_synced + 1;
      END IF;
    END IF;
  END LOOP;

  -- تحديث حالات الأقساط بناءً على الفواتير
  UPDATE contract_payment_schedules ps
  SET 
    status = CASE 
      WHEN COALESCE(i.paid_amount, 0) >= i.total_amount THEN 'paid'
      WHEN COALESCE(i.paid_amount, 0) > 0 THEN 'partially_paid'
      WHEN ps.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END,
    paid_amount = COALESCE(i.paid_amount, 0),
    updated_at = NOW()
  FROM invoices i
  WHERE ps.contract_id = p_contract_id
    AND ps.invoice_id = i.id;

  schedules_created := v_schedules_created;
  invoices_created := v_invoices_created;
  schedules_synced := v_schedules_synced;
  RETURN NEXT;
END;
$$;;
