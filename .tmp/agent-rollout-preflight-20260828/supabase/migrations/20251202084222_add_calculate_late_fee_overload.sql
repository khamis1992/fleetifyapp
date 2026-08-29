
-- إضافة نسخة جديدة من دالة calculate_late_fee بالمعاملات المطلوبة
-- هذه الدالة تحسب غرامة التأخير باستخدام invoice_id و days_overdue و rule_id

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
  v_daily_rate NUMERIC;
  v_max_fee NUMERIC;
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
    -- قيم افتراضية: 120 ريال يومياً، حد أقصى 3000 ريال
    v_daily_rate := 120;
    v_max_fee := 3000;
    
    v_fee_amount := p_days_overdue * v_daily_rate;
    IF v_fee_amount > v_max_fee THEN
      v_fee_amount := v_max_fee;
    END IF;
    
    RETURN v_fee_amount;
  END IF;

  -- حساب الغرامة حسب نوع القاعدة
  CASE v_rule.fee_type
    WHEN 'fixed' THEN
      v_fee_amount := COALESCE(v_rule.fixed_amount, 0);
      
    WHEN 'percentage' THEN
      v_fee_amount := v_invoice.total_amount * COALESCE(v_rule.percentage_rate, 0) / 100;
      
    WHEN 'daily_fixed' THEN
      v_fee_amount := p_days_overdue * COALESCE(v_rule.daily_rate, 120);
      
    WHEN 'daily_percentage' THEN
      v_fee_amount := v_invoice.total_amount * COALESCE(v_rule.daily_percentage, 0) / 100 * p_days_overdue;
      
    ELSE
      -- افتراضي: معدل يومي ثابت
      v_fee_amount := p_days_overdue * COALESCE(v_rule.daily_rate, 120);
  END CASE;

  -- تطبيق الحد الأقصى إن وجد
  IF v_rule.max_fee IS NOT NULL AND v_fee_amount > v_rule.max_fee THEN
    v_fee_amount := v_rule.max_fee;
  END IF;

  -- تطبيق الحد الأدنى إن وجد
  IF v_rule.min_fee IS NOT NULL AND v_fee_amount < v_rule.min_fee THEN
    v_fee_amount := v_rule.min_fee;
  END IF;

  RETURN COALESCE(v_fee_amount, 0);
END;
$$;

-- إضافة تعليق توضيحي
COMMENT ON FUNCTION calculate_late_fee(UUID, INTEGER, UUID) IS 
'حساب غرامة التأخير للفاتورة بناءً على عدد أيام التأخير وقاعدة الغرامات';
;
