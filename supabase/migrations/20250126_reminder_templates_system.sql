-- ============================================================================
-- REMINDER TEMPLATES & AUTOMATION SYSTEM - DATABASE MIGRATION
-- ============================================================================
-- Created: 2025-01-26
-- Purpose: Support reminder templates, automation, and A/B testing
-- Dependencies: Requires payment_reminders table from previous migration
-- ============================================================================

-- ============================================================================
-- 1. REMINDER TEMPLATES TABLE
-- ============================================================================
-- Stores customizable reminder templates for different stages

CREATE TABLE IF NOT EXISTS reminder_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Template identification
  name text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('initial', 'first_reminder', 'second_reminder', 'final_notice', 'legal_notice')),
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'phone', 'letter')),
  
  -- Content
  subject text NOT NULL,
  body text NOT NULL,
  tone text CHECK (tone IN ('friendly', 'professional', 'firm', 'urgent')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  
  -- A/B Testing
  variant text CHECK (variant IN ('A', 'B')),
  
  -- Performance metrics
  sent_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  response_count integer DEFAULT 0,
  conversion_rate numeric(5,2) DEFAULT 0, -- percentage
  
  -- Sending preferences
  send_time_preference text DEFAULT '09:00', -- HH:MM format
  avoid_weekends boolean DEFAULT true,
  avoid_holidays boolean DEFAULT true,
  
  -- Metadata
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_reminder_templates_company ON reminder_templates(company_id);
CREATE INDEX idx_reminder_templates_stage ON reminder_templates(stage);
CREATE INDEX idx_reminder_templates_channel ON reminder_templates(channel);
CREATE INDEX idx_reminder_templates_status ON reminder_templates(status);
CREATE INDEX idx_reminder_templates_variant ON reminder_templates(variant);

-- RLS Policies
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reminder templates for their company"
  ON reminder_templates FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create reminder templates for their company"
  ON reminder_templates FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update reminder templates for their company"
  ON reminder_templates FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 2. REMINDER SCHEDULES TABLE
-- ============================================================================
-- Manages scheduled reminders to be sent

CREATE TABLE IF NOT EXISTS reminder_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES reminder_templates(id) ON DELETE CASCADE,
  
  -- Schedule details
  scheduled_date date NOT NULL,
  scheduled_time text NOT NULL, -- HH:MM format
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  
  -- Execution tracking
  sent_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_reminder_schedules_company ON reminder_schedules(company_id);
CREATE INDEX idx_reminder_schedules_customer ON reminder_schedules(customer_id);
CREATE INDEX idx_reminder_schedules_invoice ON reminder_schedules(invoice_id);
CREATE INDEX idx_reminder_schedules_template ON reminder_schedules(template_id);
CREATE INDEX idx_reminder_schedules_status ON reminder_schedules(status);
CREATE INDEX idx_reminder_schedules_date ON reminder_schedules(scheduled_date, scheduled_time);

-- RLS Policies
ALTER TABLE reminder_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reminder schedules for their company"
  ON reminder_schedules FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create reminder schedules for their company"
  ON reminder_schedules FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update reminder schedules for their company"
  ON reminder_schedules FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 3. UPDATE PAYMENT_REMINDERS TABLE
-- ============================================================================
-- Add template_id column to link reminders to templates

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_reminders' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE payment_reminders ADD COLUMN template_id uuid REFERENCES reminder_templates(id);
    CREATE INDEX idx_payment_reminders_template ON payment_reminders(template_id);
  END IF;
END $$;

-- ============================================================================
-- 4. REMINDER TEMPLATE VARIABLES TABLE
-- ============================================================================
-- Stores custom template variables for companies

CREATE TABLE IF NOT EXISTS template_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Variable definition
  variable_key text NOT NULL,
  variable_label text NOT NULL,
  variable_category text CHECK (variable_category IN ('customer', 'invoice', 'company', 'payment', 'custom')),
  default_value text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  
  -- Constraint
  CONSTRAINT unique_variable_per_company UNIQUE (company_id, variable_key)
);

-- Indexes
CREATE INDEX idx_template_variables_company ON template_variables(company_id);
CREATE INDEX idx_template_variables_category ON template_variables(variable_category);

-- RLS Policies
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template variables for their company"
  ON template_variables FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create template variables for their company"
  ON template_variables FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 5. AUTOMATED TRIGGERS
-- ============================================================================

-- Trigger to update template statistics when reminders are sent
CREATE OR REPLACE FUNCTION update_template_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment sent count
  UPDATE reminder_templates
  SET sent_count = sent_count + 1
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_template_sent_count
  AFTER INSERT ON payment_reminders
  FOR EACH ROW
  WHEN (NEW.template_id IS NOT NULL)
  EXECUTE FUNCTION update_template_statistics();

-- Trigger to update open/click/response counts
CREATE OR REPLACE FUNCTION update_template_engagement()
RETURNS TRIGGER AS $$
BEGIN
  -- Update opened count
  IF OLD.opened_at IS NULL AND NEW.opened_at IS NOT NULL THEN
    UPDATE reminder_templates
    SET opened_count = opened_count + 1
    WHERE id = NEW.template_id;
  END IF;
  
  -- Update clicked count
  IF OLD.clicked_at IS NULL AND NEW.clicked_at IS NOT NULL THEN
    UPDATE reminder_templates
    SET clicked_count = clicked_count + 1
    WHERE id = NEW.template_id;
  END IF;
  
  -- Update response count and conversion rate
  IF OLD.responded_at IS NULL AND NEW.responded_at IS NOT NULL THEN
    UPDATE reminder_templates
    SET 
      response_count = response_count + 1,
      conversion_rate = CASE 
        WHEN sent_count > 0 
        THEN ((response_count + 1)::numeric / sent_count::numeric) * 100
        ELSE 0
      END
    WHERE id = NEW.template_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_template_engagement
  AFTER UPDATE ON payment_reminders
  FOR EACH ROW
  WHEN (NEW.template_id IS NOT NULL)
  EXECUTE FUNCTION update_template_engagement();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_reminder_templates_updated_at
  BEFORE UPDATE ON reminder_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_schedules_updated_at
  BEFORE UPDATE ON reminder_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. AUTOMATED REMINDER PROCESSING FUNCTION
-- ============================================================================

-- Function to process pending reminder schedules
CREATE OR REPLACE FUNCTION process_pending_reminders()
RETURNS TABLE (
  processed_count integer,
  failed_count integer
) AS $$
DECLARE
  v_processed integer := 0;
  v_failed integer := 0;
  v_schedule record;
  v_template record;
  v_invoice record;
  v_customer record;
BEGIN
  -- Get all pending reminders scheduled for now or earlier
  FOR v_schedule IN 
    SELECT * FROM reminder_schedules
    WHERE status = 'pending'
      AND scheduled_date <= CURRENT_DATE
      AND (scheduled_date < CURRENT_DATE OR scheduled_time <= TO_CHAR(CURRENT_TIME, 'HH24:MI'))
    LIMIT 100  -- Process in batches
  LOOP
    BEGIN
      -- Get template, invoice, and customer data
      SELECT * INTO v_template FROM reminder_templates WHERE id = v_schedule.template_id;
      SELECT * INTO v_invoice FROM invoices WHERE id = v_schedule.invoice_id;
      SELECT * INTO v_customer FROM customers WHERE id = v_schedule.customer_id;
      
      -- Insert into payment_reminders (actual sending would happen via external service)
      INSERT INTO payment_reminders (
        company_id,
        customer_id,
        invoice_id,
        template_id,
        reminder_stage,
        send_method,
        subject,
        message_body,
        sent_date,
        sent_by
      ) VALUES (
        v_schedule.company_id,
        v_schedule.customer_id,
        v_schedule.invoice_id,
        v_schedule.template_id,
        v_template.stage,
        v_template.channel,
        v_template.subject,
        v_template.body,
        now(),
        NULL  -- System-sent
      );
      
      -- Mark schedule as sent
      UPDATE reminder_schedules
      SET 
        status = 'sent',
        sent_at = now(),
        updated_at = now()
      WHERE id = v_schedule.id;
      
      v_processed := v_processed + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Mark as failed and log error
      UPDATE reminder_schedules
      SET 
        status = 'failed',
        error_message = SQLERRM,
        retry_count = retry_count + 1,
        updated_at = now()
      WHERE id = v_schedule.id;
      
      v_failed := v_failed + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_failed;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. USEFUL VIEWS
-- ============================================================================

-- View: Template Performance Summary
CREATE OR REPLACE VIEW template_performance_summary AS
SELECT 
  rt.id,
  rt.company_id,
  rt.name,
  rt.stage,
  rt.channel,
  rt.status,
  rt.sent_count,
  rt.opened_count,
  rt.clicked_count,
  rt.response_count,
  rt.conversion_rate,
  CASE 
    WHEN rt.sent_count > 0 THEN (rt.opened_count::numeric / rt.sent_count::numeric) * 100
    ELSE 0
  END as open_rate,
  CASE 
    WHEN rt.sent_count > 0 THEN (rt.clicked_count::numeric / rt.sent_count::numeric) * 100
    ELSE 0
  END as click_rate,
  CASE 
    WHEN rt.sent_count > 0 THEN (rt.response_count::numeric / rt.sent_count::numeric) * 100
    ELSE 0
  END as response_rate
FROM reminder_templates rt
WHERE rt.status = 'active';

-- View: Upcoming Scheduled Reminders
CREATE OR REPLACE VIEW upcoming_reminders AS
SELECT 
  rs.*,
  rt.name as template_name,
  rt.stage as reminder_stage,
  rt.channel,
  COALESCE(c.first_name || ' ' || c.last_name, c.first_name, c.last_name, '') as customer_name,
  i.invoice_number,
  i.total_amount as invoice_amount
FROM reminder_schedules rs
LEFT JOIN reminder_templates rt ON rs.template_id = rt.id
LEFT JOIN customers c ON rs.customer_id = c.id
LEFT JOIN invoices i ON rs.invoice_id = i.id
WHERE rs.status = 'pending'
  AND rs.scheduled_date >= CURRENT_DATE
ORDER BY rs.scheduled_date, rs.scheduled_time;

-- View: A/B Test Comparison
CREATE OR REPLACE VIEW ab_test_comparison AS
SELECT 
  rt.stage,
  rt.channel,
  rt.variant,
  COUNT(*) as template_count,
  SUM(rt.sent_count) as total_sent,
  AVG(CASE WHEN rt.sent_count > 0 THEN (rt.opened_count::numeric / rt.sent_count::numeric) * 100 ELSE 0 END) as avg_open_rate,
  AVG(CASE WHEN rt.sent_count > 0 THEN (rt.clicked_count::numeric / rt.sent_count::numeric) * 100 ELSE 0 END) as avg_click_rate,
  AVG(CASE WHEN rt.sent_count > 0 THEN (rt.response_count::numeric / rt.sent_count::numeric) * 100 ELSE 0 END) as avg_response_rate,
  AVG(rt.conversion_rate) as avg_conversion_rate
FROM reminder_templates rt
WHERE rt.status = 'active'
  AND rt.variant IS NOT NULL
GROUP BY rt.stage, rt.channel, rt.variant
ORDER BY rt.stage, rt.channel, rt.variant;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comments to track migration
COMMENT ON TABLE reminder_templates IS 'Reminder Templates System - Customizable reminder templates with A/B testing';
COMMENT ON TABLE reminder_schedules IS 'Reminder Templates System - Scheduled reminders queue';
COMMENT ON TABLE template_variables IS 'Reminder Templates System - Custom template variables';

COMMENT ON FUNCTION process_pending_reminders() IS 'Automated function to process and send pending reminders';
COMMENT ON VIEW template_performance_summary IS 'Performance metrics for all active templates';
COMMENT ON VIEW upcoming_reminders IS 'Scheduled reminders for upcoming days';
COMMENT ON VIEW ab_test_comparison IS 'A/B test performance comparison by stage and channel';
