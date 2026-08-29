-- ================================================================
-- MONTHLY REMINDER TEMPLATES
-- ================================================================
-- Default reminder templates for monthly payment receipts
-- Created: 2025-01-27
-- ================================================================

-- Insert default reminder templates if they don't exist
-- Note: We'll create templates for each company, or use a system company
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get the first company ID (or create system templates per company)
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  
  IF v_company_id IS NOT NULL THEN
    -- Insert templates for each company if they don't exist
    INSERT INTO reminder_templates (company_id, name, stage, channel, subject, body, status, tone)
    SELECT 
      c.id,
      'تذكير ودي - استحقاق قريب',
      'initial',
      'whatsapp',
      'تذكير ودي - استحقاق قريب',
      'مرحباً {customer_name} 👋

تذكير ودي: فاتورتك الشهرية للشهر {month} بمبلغ {rent_amount} ريال ستستحق خلال 3 أيام.

📅 تاريخ الاستحقاق: {due_date}
💰 المبلغ المطلوب: {rent_amount} ريال

يمكنك الدفع عبر:
- التحويل البنكي: [رقم الحساب]
- الكاش: مكتب الشركة

شكراً لتعاونكم 🙏',
      'active',
      'friendly'
    FROM companies c
    WHERE NOT EXISTS (
      SELECT 1 FROM reminder_templates 
      WHERE company_id = c.id
        AND stage = 'initial'
        AND channel = 'whatsapp'
        AND name = 'تذكير ودي - استحقاق قريب'
    );

    INSERT INTO reminder_templates (company_id, name, stage, channel, subject, body, status, tone)
    SELECT 
      c.id,
      'إشعار استحقاق الدفع',
      'first_reminder',
      'whatsapp',
      'إشعار استحقاق الدفع',
      'عزيزي {customer_name} ⚠️

فاتورتك الشهرية للشهر {month} مستحقة منذ يوم.

💰 المبلغ الأصلي: {rent_amount} ريال
⚠️ رسوم التأخير: {fine} ريال
💵 المبلغ الإجمالي: {total_due} ريال

الرجاء سداد المبلغ فوراً لتجنب إجراءات إضافية.

للاستفسار: [رقم الهاتف]',
      'active',
      'professional'
    FROM companies c
    WHERE NOT EXISTS (
      SELECT 1 FROM reminder_templates 
      WHERE company_id = c.id
        AND stage = 'first_reminder'
        AND channel = 'whatsapp'
        AND name = 'إشعار استحقاق الدفع'
    );

    INSERT INTO reminder_templates (company_id, name, stage, channel, subject, body, status, tone)
    SELECT 
      c.id,
      'تذكير أخير - فاتورة متأخرة',
      'second_reminder',
      'whatsapp',
      'تذكير أخير - فاتورة متأخرة',
      'عزيزي {customer_name} ⚠️

تذكير أخير: فاتورتك الشهرية للشهر {month} متأخرة منذ يومين.

💰 المبلغ الأصلي: {rent_amount} ريال
⚠️ رسوم التأخير: {fine} ريال
💵 المبلغ الإجمالي: {total_due} ريال

الرجاء سداد المبلغ فوراً لتجنب إجراءات قانونية.

للاستفسار: [رقم الهاتف]',
      'active',
      'firm'
    FROM companies c
    WHERE NOT EXISTS (
      SELECT 1 FROM reminder_templates 
      WHERE company_id = c.id
        AND stage = 'second_reminder'
        AND channel = 'whatsapp'
        AND name = 'تذكير أخير - فاتورة متأخرة'
    );

    INSERT INTO reminder_templates (company_id, name, stage, channel, subject, body, status, tone)
    SELECT 
      c.id,
      'إنذار نهائي - فاتورة متأخرة',
      'final_notice',
      'whatsapp',
      'إنذار نهائي - فاتورة متأخرة',
      'السيد/ة {customer_name} 🚨

إنذار نهائي - فاتورة متأخرة 5 أيام

فاتورتك رقم {receipt_id} متأخرة منذ 5 أيام.

💰 المبلغ الأصلي: {rent_amount} ريال
⚠️ رسوم التأخير: {fine} ريال  
💵 المبلغ الإجمالي: {total_due} ريال

يجب سداد المبلغ خلال 5 أيام القادمة وإلا سيتم رفع قضية قانونية ضدك.

للاستفسار: [رقم الهاتف]',
      'active',
      'urgent'
    FROM companies c
    WHERE NOT EXISTS (
      SELECT 1 FROM reminder_templates 
      WHERE company_id = c.id
        AND stage = 'final_notice'
        AND channel = 'whatsapp'
        AND name = 'إنذار نهائي - فاتورة متأخرة'
    );

    INSERT INTO reminder_templates (company_id, name, stage, channel, subject, body, status, tone)
    SELECT 
      c.id,
      'إشعار قانوني - رفع قضية',
      'legal_notice',
      'whatsapp',
      'إشعار قانوني - رفع قضية',
      'السيد/ة {customer_name} ⚖️

إشعار قانوني نهائي

تم رفع قضية قانونية رقم {case_number} ضدك بسبب عدم سداد الفاتورة المتأخرة منذ 10 أيام.

💰 المبلغ المستحق: {total_due} ريال
📋 رقم القضية: {case_number}

الرجاء التواصل معنا فوراً لتسوية الموقف قبل تصعيد القضية.

مكتبنا القانوني: [المعلومات]',
      'active',
      'urgent'
    FROM companies c
    WHERE NOT EXISTS (
      SELECT 1 FROM reminder_templates 
      WHERE company_id = c.id
        AND stage = 'legal_notice'
        AND channel = 'whatsapp'
        AND name = 'إشعار قانوني - رفع قضية'
    );
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE reminder_templates IS 
'Default reminder templates for monthly payment receipts. Templates are created per company.';;
