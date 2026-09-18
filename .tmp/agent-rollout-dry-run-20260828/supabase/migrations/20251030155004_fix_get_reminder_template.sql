-- Fix get_reminder_template function to work with actual table structure
CREATE OR REPLACE FUNCTION get_reminder_template(
  p_reminder_type TEXT,
  p_company_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_template TEXT;
  v_stage TEXT;
BEGIN
  -- Map reminder_type to stage
  CASE p_reminder_type
    WHEN 'pre_due_28' THEN v_stage := 'initial';
    WHEN 'reminder_2' THEN v_stage := 'first_reminder';
    WHEN 'reminder_3' THEN v_stage := 'second_reminder';
    WHEN 'warning_5' THEN v_stage := 'final_notice';
    WHEN 'legal_10' THEN v_stage := 'legal_notice';
    ELSE v_stage := 'initial';
  END CASE;

  -- Try to get company-specific template first
  SELECT body INTO v_template
  FROM reminder_templates
  WHERE stage = v_stage
    AND company_id = p_company_id
    AND status = 'active'
    AND channel = 'whatsapp'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If not found, try any company template
  IF v_template IS NULL THEN
    SELECT body INTO v_template
    FROM reminder_templates
    WHERE stage = v_stage
      AND status = 'active'
      AND channel = 'whatsapp'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- Return default template if still not found
  IF v_template IS NULL THEN
    CASE p_reminder_type
      WHEN 'pre_due_28' THEN
        v_template := 'مرحباً {customer_name} 👋

تذكير ودي: فاتورتك الشهرية للشهر {month} بمبلغ {rent_amount} ريال ستستحق خلال 3 أيام.

📅 تاريخ الاستحقاق: {due_date}
💰 المبلغ المطلوب: {rent_amount} ريال

يمكنك الدفع عبر:
- التحويل البنكي: [رقم الحساب]
- الكاش: مكتب الشركة

شكراً لتعاونكم 🙏';
      WHEN 'reminder_2' THEN
        v_template := 'عزيزي {customer_name} ⚠️

فاتورتك الشهرية للشهر {month} مستحقة منذ يوم.

💰 المبلغ الأصلي: {rent_amount} ريال
⚠️ رسوم التأخير: {fine} ريال
💵 المبلغ الإجمالي: {total_due} ريال

الرجاء سداد المبلغ فوراً لتجنب إجراءات إضافية.

للاستفسار: [رقم الهاتف]';
      WHEN 'reminder_3' THEN
        v_template := 'عزيزي {customer_name} ⚠️

تذكير أخير: فاتورتك الشهرية للشهر {month} متأخرة منذ يومين.

💰 المبلغ الأصلي: {rent_amount} ريال
⚠️ رسوم التأخير: {fine} ريال
💵 المبلغ الإجمالي: {total_due} ريال

الرجاء سداد المبلغ فوراً لتجنب إجراءات قانونية.

للاستفسار: [رقم الهاتف]';
      WHEN 'warning_5' THEN
        v_template := 'السيد/ة {customer_name} 🚨

إنذار نهائي - فاتورة متأخرة 5 أيام

فاتورتك رقم {receipt_id} متأخرة منذ 5 أيام.

💰 المبلغ الأصلي: {rent_amount} ريال
⚠️ رسوم التأخير: {fine} ريال  
💵 المبلغ الإجمالي: {total_due} ريال

يجب سداد المبلغ خلال 5 أيام القادمة وإلا سيتم رفع قضية قانونية ضدك.

للاستفسار: [رقم الهاتف]';
      WHEN 'legal_10' THEN
        v_template := 'السيد/ة {customer_name} ⚖️

إشعار قانوني نهائي

تم رفع قضية قانونية رقم {case_number} ضدك بسبب عدم سداد الفاتورة المتأخرة منذ 10 أيام.

💰 المبلغ المستحق: {total_due} ريال
📋 رقم القضية: {case_number}

الرجاء التواصل معنا فوراً لتسوية الموقف قبل تصعيد القضية.

مكتبنا القانوني: [المعلومات]';
      ELSE
        v_template := 'تذكير: لديك فاتورة مستحقة بمبلغ {total_due} ريال.';
    END CASE;
  END IF;
  
  RETURN v_template;
END;
$$;;
