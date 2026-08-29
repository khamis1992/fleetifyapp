
-- ================================================================
-- MIGRATION: منع تكرار الفواتير لنفس العقد والشهر
-- ================================================================

-- 1. إضافة عمود invoice_month لتسهيل التحقق والفهرسة
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_month DATE;

-- 2. تحديث العمود الجديد بناءً على invoice_date
UPDATE invoices 
SET invoice_month = DATE_TRUNC('month', invoice_date)::DATE
WHERE invoice_month IS NULL AND invoice_date IS NOT NULL;

-- 3. إنشاء trigger لتحديث invoice_month تلقائياً
CREATE OR REPLACE FUNCTION update_invoice_month()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_month := DATE_TRUNC('month', NEW.invoice_date)::DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_invoice_month ON invoices;
CREATE TRIGGER trg_update_invoice_month
  BEFORE INSERT OR UPDATE OF invoice_date ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_month();

-- 4. إنشاء unique index على العمود الجديد
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_contract_month 
ON invoices (contract_id, invoice_month)
WHERE contract_id IS NOT NULL 
  AND status != 'cancelled';

-- 5. دالة التحقق من وجود فاتورة
CREATE OR REPLACE FUNCTION check_invoice_exists_for_month(
  p_contract_id UUID,
  p_invoice_month DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM invoices
    WHERE contract_id = p_contract_id
      AND invoice_month = DATE_TRUNC('month', p_invoice_month)::DATE
      AND status != 'cancelled'
  );
END;
$$;

-- 6. تحسين دالة إنشاء الفاتورة
CREATE OR REPLACE FUNCTION generate_invoice_for_contract_month(
  p_contract_id UUID,
  p_invoice_month DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_invoice_id UUID;
  v_invoice_number VARCHAR(50);
  v_total_amount DECIMAL(15,3);
  v_invoice_date DATE;
  v_due_date DATE;
BEGIN
  -- Get contract details
  SELECT * INTO v_contract
  FROM contracts
  WHERE id = p_contract_id;

  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id;
  END IF;

  -- Check if contract is active in this month
  IF v_contract.start_date > p_invoice_month OR 
     (v_contract.end_date IS NOT NULL AND v_contract.end_date < p_invoice_month) THEN
    RAISE NOTICE 'Contract % is not active in month %', p_contract_id, p_invoice_month;
    RETURN NULL;
  END IF;

  -- تحقق محسّن: هل توجد فاتورة لهذا الشهر؟
  IF check_invoice_exists_for_month(p_contract_id, p_invoice_month) THEN
    RAISE NOTICE 'Invoice already exists for contract % in month %', p_contract_id, p_invoice_month;
    RETURN NULL;
  END IF;

  -- Set invoice date and due date to the 1st of the month
  v_invoice_date := p_invoice_month;
  v_due_date := p_invoice_month;

  -- Calculate total amount
  v_total_amount := COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0);

  -- Generate unique invoice number
  v_invoice_number := 'INV-C-' || 
    SUBSTRING(v_contract.contract_number FROM 1 FOR 10) || '-' ||
    TO_CHAR(p_invoice_month, 'YYYY-MM');

  -- Create invoice with exception handling
  BEGIN
    INSERT INTO invoices (
      company_id,
      customer_id,
      contract_id,
      invoice_number,
      invoice_date,
      invoice_month,
      due_date,
      total_amount,
      subtotal,
      tax_amount,
      discount_amount,
      paid_amount,
      balance_due,
      status,
      payment_status,
      invoice_type,
      notes,
      created_at,
      updated_at
    ) VALUES (
      v_contract.company_id,
      v_contract.customer_id,
      v_contract.id,
      v_invoice_number,
      v_invoice_date,
      DATE_TRUNC('month', v_invoice_date)::DATE,
      v_due_date,
      v_total_amount,
      v_total_amount,
      0,
      0,
      0,
      v_total_amount,
      'sent',
      'unpaid',
      'service',
      'فاتورة إيجار شهر ' || TO_CHAR(p_invoice_month, 'MM/YYYY'),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_invoice_id;

    RAISE NOTICE '✅ Created invoice % for contract %', v_invoice_number, v_contract.contract_number;
    RETURN v_invoice_id;
    
  EXCEPTION 
    WHEN unique_violation THEN
      RAISE NOTICE '⚠️ Invoice already exists for contract % in month %', p_contract_id, p_invoice_month;
      RETURN NULL;
  END;
END;
$$;

-- 7. منح الصلاحيات
GRANT EXECUTE ON FUNCTION check_invoice_exists_for_month(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_for_contract_month(UUID, DATE) TO authenticated;
;
