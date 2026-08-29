-- Migration: إنشاء RPC function لتوليد الفواتير من جدول الدفعات
-- الوصف: دالة لإنشاء فواتير تلقائية لعقد بناءً على جدول الدفعات المحسوب

CREATE OR REPLACE FUNCTION generate_invoices_from_payment_schedule(
  p_contract_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_monthly_amount DECIMAL(12,2);
  v_total_amount DECIMAL(12,2);
  v_start_date DATE;
  v_end_date DATE;
  v_number_of_months INTEGER;
  v_current_date DATE;
  v_invoice_number TEXT;
  v_invoices_created INTEGER := 0;
  v_company_id UUID;
  v_customer_id UUID;
  v_invoice_exists BOOLEAN;
BEGIN
  -- جلب معلومات العقد
  SELECT 
    id,
    company_id,
    customer_id,
    contract_number,
    start_date,
    end_date,
    monthly_amount,
    contract_amount
  INTO v_contract
  FROM contracts
  WHERE id = p_contract_id;

  -- التحقق من وجود العقد
  IF NOT FOUND THEN
    RAISE EXCEPTION 'العقد غير موجود: %', p_contract_id;
  END IF;

  -- التحقق من البيانات المطلوبة
  IF v_contract.start_date IS NULL THEN
    RAISE EXCEPTION 'تاريخ بداية العقد مطلوب';
  END IF;

  IF v_contract.monthly_amount IS NULL OR v_contract.monthly_amount <= 0 THEN
    RAISE EXCEPTION 'المبلغ الشهري مطلوب ويجب أن يكون أكبر من صفر';
  END IF;

  -- تعيين المتغيرات
  v_monthly_amount := v_contract.monthly_amount;
  v_total_amount := COALESCE(v_contract.contract_amount, 0);
  v_start_date := v_contract.start_date;
  v_end_date := v_contract.end_date;
  v_company_id := v_contract.company_id;
  v_customer_id := v_contract.customer_id;

  -- حساب عدد الأشهر
  IF v_total_amount > 0 THEN
    v_number_of_months := CEIL(v_total_amount / v_monthly_amount);
  ELSE
    -- إذا لم يكن هناك contract_amount، احسب من الفرق بين التواريخ
    IF v_end_date IS NOT NULL THEN
      v_number_of_months := EXTRACT(YEAR FROM AGE(v_end_date, v_start_date)) * 12 
                          + EXTRACT(MONTH FROM AGE(v_end_date, v_start_date)) + 1;
    ELSE
      v_number_of_months := 12;
    END IF;
  END IF;

  -- إنشاء الفواتير
  FOR i IN 1..v_number_of_months LOOP
    -- حساب تاريخ الاستحقاق
    v_current_date := DATE_TRUNC('month', v_start_date) + (i || ' months')::INTERVAL;
    
    -- توليد رقم الفاتورة
    v_invoice_number := 'INV-' || v_contract.contract_number || '-' || LPAD(i::TEXT, 3, '0');

    -- التحقق من عدم وجود فاتورة بنفس الرقم
    SELECT EXISTS(
      SELECT 1 FROM invoices 
      WHERE invoice_number = v_invoice_number 
        AND company_id = v_company_id
    ) INTO v_invoice_exists;

    -- إنشاء الفاتورة إذا لم تكن موجودة
    IF NOT v_invoice_exists THEN
      INSERT INTO invoices (
        company_id,
        customer_id,
        contract_id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        payment_status,
        invoice_type,
        description,
        created_at,
        updated_at
      ) VALUES (
        v_company_id,
        v_customer_id,
        p_contract_id,
        v_invoice_number,
        v_current_date - INTERVAL '5 days',
        v_current_date,
        v_monthly_amount,
        'unpaid',
        'rental',
        'فاتورة إيجار شهرية - الشهر ' || i || ' من ' || v_number_of_months,
        NOW(),
        NOW()
      );

      v_invoices_created := v_invoices_created + 1;
    END IF;
  END LOOP;

  RETURN v_invoices_created;
END;
$$;

COMMENT ON FUNCTION generate_invoices_from_payment_schedule IS 
'دالة لإنشاء فواتير تلقائية لعقد بناءً على جدول الدفعات المحسوب';

GRANT EXECUTE ON FUNCTION generate_invoices_from_payment_schedule TO authenticated;;
