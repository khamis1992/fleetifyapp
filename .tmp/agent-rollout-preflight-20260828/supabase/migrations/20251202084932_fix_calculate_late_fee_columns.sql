
-- إصلاح دالة calculate_late_fee بأسماء الأعمدة الصحيحة
CREATE OR REPLACE FUNCTION calculate_late_fee(
  p_invoice_id UUID,
  p_days_overdue INTEGER,
  p_rule_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invoice RECORD;
  v_rule RECORD;
  v_fee_amount NUMERIC := 0;
  v_daily_rate NUMERIC := 120;  -- القيمة الافتراضية
  v_max_fee NUMERIC := 3000;    -- الحد الأقصى الافتراضي
BEGIN
  -- جلب بيانات الفاتورة
  SELECT 
    id,
    company_id,
    total_amount,
    invoice_type
  INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- جلب قاعدة الغرامات
  IF p_rule_id IS NOT NULL THEN
    SELECT * INTO v_rule
    FROM late_fee_rules
    WHERE id = p_rule_id;
  ELSE
    -- البحث عن قاعدة افتراضية للشركة
    SELECT * INTO v_rule
    FROM late_fee_rules
    WHERE company_id = v_invoice.company_id
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- إذا لم توجد قاعدة، استخدم القيم الافتراضية
  IF NOT FOUND OR v_rule IS NULL THEN
    v_fee_amount := p_days_overdue * v_daily_rate;
    IF v_fee_amount > v_max_fee THEN
      v_fee_amount := v_max_fee;
    END IF;
    RETURN v_fee_amount;
  END IF;

  -- حساب الغرامة حسب نوع القاعدة
  -- الأعمدة الموجودة: fee_type, fee_amount, max_fee_amount
  CASE v_rule.fee_type
    WHEN 'fixed' THEN
      -- غرامة ثابتة
      v_fee_amount := COALESCE(v_rule.fee_amount, 0);
      
    WHEN 'percentage' THEN
      -- نسبة مئوية من مبلغ الفاتورة
      v_fee_amount := v_invoice.total_amount * COALESCE(v_rule.fee_amount, 0) / 100;
      
    WHEN 'daily' THEN
      -- غرامة يومية
      v_fee_amount := p_days_overdue * COALESCE(v_rule.fee_amount, v_daily_rate);
      
    WHEN 'daily_percentage' THEN
      -- نسبة يومية
      v_fee_amount := v_invoice.total_amount * COALESCE(v_rule.fee_amount, 0) / 100 * p_days_overdue;
      
    ELSE
      -- افتراضي: معدل يومي ثابت
      v_fee_amount := p_days_overdue * COALESCE(v_rule.fee_amount, v_daily_rate);
  END CASE;

  -- تطبيق الحد الأقصى إن وجد
  IF v_rule.max_fee_amount IS NOT NULL AND v_fee_amount > v_rule.max_fee_amount THEN
    v_fee_amount := v_rule.max_fee_amount;
  END IF;

  RETURN COALESCE(v_fee_amount, 0);
END;
$$;
;
