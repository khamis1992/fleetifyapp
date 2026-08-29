-- ================================================================
-- EXTEND REMINDER SYSTEM FOR RENTAL PAYMENT RECEIPTS
-- ================================================================
-- Extends the reminder_schedules table to support rental_payment_receipts
-- Created: 2025-01-27
-- ================================================================

-- Step 1: Make invoice_id and template_id nullable
DO $$
BEGIN
  -- Make invoice_id nullable (it can be NULL for receipt-based reminders)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminder_schedules' 
    AND column_name = 'invoice_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE reminder_schedules 
    ALTER COLUMN invoice_id DROP NOT NULL;
  END IF;

  -- Make template_id nullable (we'll create templates dynamically)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminder_schedules' 
    AND column_name = 'template_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE reminder_schedules 
    ALTER COLUMN template_id DROP NOT NULL;
  END IF;

  -- Add receipt_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminder_schedules' 
    AND column_name = 'receipt_id'
  ) THEN
    ALTER TABLE reminder_schedules 
    ADD COLUMN receipt_id UUID REFERENCES rental_payment_receipts(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_reminder_schedules_receipt 
    ON reminder_schedules(receipt_id);
    
    COMMENT ON COLUMN reminder_schedules.receipt_id IS 
    'Link to rental_payment_receipts table for payment receipt reminders';
  END IF;

  -- Add reminder_type column to track reminder stage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminder_schedules' 
    AND column_name = 'reminder_type'
  ) THEN
    ALTER TABLE reminder_schedules 
    ADD COLUMN reminder_type TEXT CHECK (reminder_type IN (
      'pre_due_28', 'reminder_2', 'reminder_3', 'warning_5', 'legal_10'
    ));
    
    CREATE INDEX IF NOT EXISTS idx_reminder_schedules_type 
    ON reminder_schedules(reminder_type);
  END IF;

  -- Add message fields if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminder_schedules' 
    AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE reminder_schedules 
    ADD COLUMN phone_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminder_schedules' 
    AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE reminder_schedules 
    ADD COLUMN customer_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminder_schedules' 
    AND column_name = 'message_template'
  ) THEN
    ALTER TABLE reminder_schedules 
    ADD COLUMN message_template TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reminder_schedules' 
    AND column_name = 'message_variables'
  ) THEN
    ALTER TABLE reminder_schedules 
    ADD COLUMN message_variables JSONB;
  END IF;
END $$;

-- Step 2: Create function to get reminder template (helper function)
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
  
  -- If not found, try default template (company_id IS NULL)
  IF v_template IS NULL THEN
    SELECT body INTO v_template
    FROM reminder_templates
    WHERE stage = v_stage
      AND company_id IS NULL
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
$$;

-- Step 3: Create function to generate reminder schedule for receipt
CREATE OR REPLACE FUNCTION generate_reminder_schedule_for_receipt(
  p_receipt_id UUID,
  p_reminder_stage TEXT -- 'pre_due_28', 'reminder_2', 'reminder_3', 'warning_5', 'legal_10'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt RECORD;
  v_customer RECORD;
  v_due_date DATE;
  v_scheduled_date DATE;
  v_schedule_id UUID;
  v_days_overdue INTEGER;
BEGIN
  -- Get receipt details
  SELECT * INTO v_receipt FROM rental_payment_receipts WHERE id = p_receipt_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receipt not found: %', p_receipt_id;
  END IF;
  
  -- Get customer details
  SELECT * INTO v_customer FROM customers WHERE id = v_receipt.customer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found for receipt: %', p_receipt_id;
  END IF;
  
  -- Determine due date (already stored in payment_date)
  v_due_date := v_receipt.payment_date;
  
  -- Calculate days overdue
  v_days_overdue := GREATEST(0, CURRENT_DATE - v_due_date);
  
  -- Determine scheduled date based on reminder stage
  CASE p_reminder_stage
    WHEN 'pre_due_28' THEN
      -- Send 3 days before due date (on day 28)
      v_scheduled_date := (v_due_date - INTERVAL '3 days')::DATE;
    WHEN 'reminder_2' THEN
      -- Send on day 2 (day after due date)
      v_scheduled_date := v_due_date + INTERVAL '1 day';
    WHEN 'reminder_3' THEN
      -- Send on day 3
      v_scheduled_date := v_due_date + INTERVAL '2 days';
    WHEN 'warning_5' THEN
      -- Send on day 5
      v_scheduled_date := v_due_date + INTERVAL '4 days';
    WHEN 'legal_10' THEN
      -- Send on day 10
      v_scheduled_date := v_due_date + INTERVAL '9 days';
    ELSE
      RAISE EXCEPTION 'Invalid reminder stage: %', p_reminder_stage;
  END CASE;
  
  -- Check if reminder already exists
  IF EXISTS (
    SELECT 1 FROM reminder_schedules
    WHERE receipt_id = p_receipt_id
      AND reminder_type = p_reminder_stage
      AND scheduled_date = v_scheduled_date
  ) THEN
    -- Return existing schedule ID
    SELECT id INTO v_schedule_id
    FROM reminder_schedules
    WHERE receipt_id = p_receipt_id
      AND reminder_type = p_reminder_stage
      AND scheduled_date = v_scheduled_date
    LIMIT 1;
    
    RETURN v_schedule_id;
  END IF;
  
  -- Create reminder schedule
  INSERT INTO reminder_schedules (
    company_id,
    customer_id,
    receipt_id,
    invoice_id, -- Can be NULL for receipt-based reminders
    template_id, -- Can be NULL, we'll use message_template
    reminder_type,
    scheduled_date,
    scheduled_time,
    phone_number,
    customer_name,
    message_template,
    message_variables,
    status
  ) VALUES (
    v_receipt.company_id,
    v_receipt.customer_id,
    v_receipt.id,
    NULL, -- No invoice_id for receipt-based reminders
    NULL, -- No template_id, using message_template directly
    p_reminder_stage,
    v_scheduled_date,
    '09:00:00', -- Default to 9 AM
    COALESCE(v_customer.phone, ''),
    v_receipt.customer_name,
    get_reminder_template(p_reminder_stage, v_receipt.company_id),
    jsonb_build_object(
      'customer_name', v_receipt.customer_name,
      'receipt_id', v_receipt.id,
      'month', v_receipt.month,
      'rent_amount', v_receipt.rent_amount,
      'due_date', TO_CHAR(v_due_date, 'YYYY-MM-DD'),
      'fine', COALESCE(v_receipt.fine, 0),
      'total_due', COALESCE(v_receipt.amount_due, v_receipt.rent_amount),
      'days_overdue', v_days_overdue
    ),
    'pending'
  ) RETURNING id INTO v_schedule_id;
  
  RETURN v_schedule_id;
END;
$$;

-- Step 4: Add comments
COMMENT ON FUNCTION generate_reminder_schedule_for_receipt IS 
'Creates a reminder schedule for a rental payment receipt. Supports stages: pre_due_28, reminder_2, reminder_3, warning_5, legal_10';

COMMENT ON FUNCTION get_reminder_template IS 
'Gets reminder template text for a specific reminder type. Tries company-specific template first, then default template.';

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION generate_reminder_schedule_for_receipt TO authenticated;
GRANT EXECUTE ON FUNCTION generate_reminder_schedule_for_receipt TO service_role;
GRANT EXECUTE ON FUNCTION get_reminder_template TO authenticated;
GRANT EXECUTE ON FUNCTION get_reminder_template TO service_role;;
