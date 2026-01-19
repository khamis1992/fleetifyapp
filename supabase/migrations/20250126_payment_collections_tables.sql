-- ============================================================================
-- PAYMENT COLLECTIONS SYSTEM - DATABASE MIGRATION
-- ============================================================================
-- Created: 2025-01-26
-- Purpose: Support payment tracking, customer scoring, and collections management
-- Dependencies: Requires existing tables: customers, invoices, payments, companies
-- ============================================================================

-- ============================================================================
-- 1. PAYMENT PROMISES TABLE
-- ============================================================================
-- Tracks customer promises to pay and their fulfillment status

CREATE TABLE IF NOT EXISTS payment_promises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Promise details
  promise_date date NOT NULL,
  promised_amount numeric(15,2) NOT NULL CHECK (promised_amount > 0),
  
  -- Fulfillment tracking
  actual_paid_amount numeric(15,2),
  actual_paid_date date,
  status text NOT NULL CHECK (status IN ('pending', 'kept', 'broken', 'partially_kept')),
  
  -- Contact information
  contact_method text CHECK (contact_method IN ('phone', 'email', 'whatsapp', 'sms', 'in_person')),
  notes text,
  
  -- Metadata
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Indexes for performance
  CONSTRAINT unique_promise_per_invoice UNIQUE (invoice_id, promise_date)
);

-- Indexes
CREATE INDEX idx_payment_promises_customer ON payment_promises(customer_id);
CREATE INDEX idx_payment_promises_company ON payment_promises(company_id);
CREATE INDEX idx_payment_promises_status ON payment_promises(status);
CREATE INDEX idx_payment_promises_promise_date ON payment_promises(promise_date);
CREATE INDEX idx_payment_promises_invoice ON payment_promises(invoice_id);

-- RLS Policies
ALTER TABLE payment_promises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment promises for their company"
  ON payment_promises FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create payment promises for their company"
  ON payment_promises FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update payment promises for their company"
  ON payment_promises FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 2. PAYMENT PLANS TABLE
-- ============================================================================
-- Manages installment payment plans for customers

CREATE TABLE IF NOT EXISTS payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Plan details
  total_amount numeric(15,2) NOT NULL CHECK (total_amount > 0),
  number_of_payments integer NOT NULL CHECK (number_of_payments > 0 AND number_of_payments <= 24),
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'bi-weekly', 'monthly')),
  
  -- Status tracking
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted', 'cancelled')),
  
  -- Dates
  start_date date NOT NULL,
  end_date date NOT NULL,
  
  -- Metadata
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date > start_date),
  CONSTRAINT one_plan_per_invoice UNIQUE (invoice_id)
);

-- Indexes
CREATE INDEX idx_payment_plans_customer ON payment_plans(customer_id);
CREATE INDEX idx_payment_plans_company ON payment_plans(company_id);
CREATE INDEX idx_payment_plans_status ON payment_plans(status);
CREATE INDEX idx_payment_plans_invoice ON payment_plans(invoice_id);

-- RLS Policies
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment plans for their company"
  ON payment_plans FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create payment plans for their company"
  ON payment_plans FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update payment plans for their company"
  ON payment_plans FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 3. PAYMENT INSTALLMENTS TABLE
-- ============================================================================
-- Individual installments within a payment plan

CREATE TABLE IF NOT EXISTS payment_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id uuid NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  
  -- Installment details
  installment_number integer NOT NULL CHECK (installment_number > 0),
  due_date date NOT NULL,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  
  -- Payment tracking
  paid_amount numeric(15,2) DEFAULT 0 CHECK (paid_amount >= 0),
  paid_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'missed')),
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_installment_number UNIQUE (payment_plan_id, installment_number)
);

-- Indexes
CREATE INDEX idx_payment_installments_plan ON payment_installments(payment_plan_id);
CREATE INDEX idx_payment_installments_status ON payment_installments(status);
CREATE INDEX idx_payment_installments_due_date ON payment_installments(due_date);

-- RLS Policies
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view installments for their company plans"
  ON payment_installments FOR SELECT
  USING (payment_plan_id IN (
    SELECT id FROM payment_plans 
    WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can create installments for their company plans"
  ON payment_installments FOR INSERT
  WITH CHECK (payment_plan_id IN (
    SELECT id FROM payment_plans 
    WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can update installments for their company plans"
  ON payment_installments FOR UPDATE
  USING (payment_plan_id IN (
    SELECT id FROM payment_plans 
    WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- ============================================================================
-- 4. PAYMENT ATTEMPTS TABLE
-- ============================================================================
-- Tracks failed payment attempts (credit card declines, bounced checks, etc.)

CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Attempt details
  attempt_date timestamptz NOT NULL DEFAULT now(),
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  payment_method text CHECK (payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'check', 'cash', 'other')),
  
  -- Status and error
  status text NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  failure_reason text,
  error_code text,
  
  -- Transaction details
  transaction_id text,
  gateway_response jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_payment_attempts_customer ON payment_attempts(customer_id);
CREATE INDEX idx_payment_attempts_company ON payment_attempts(company_id);
CREATE INDEX idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX idx_payment_attempts_date ON payment_attempts(attempt_date);
CREATE INDEX idx_payment_attempts_invoice ON payment_attempts(invoice_id);

-- RLS Policies
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment attempts for their company"
  ON payment_attempts FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create payment attempts for their company"
  ON payment_attempts FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 5. PAYMENT REMINDERS TABLE
-- ============================================================================
-- Tracks sent payment reminders and their responses

CREATE TABLE IF NOT EXISTS payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Reminder details
  reminder_stage text NOT NULL CHECK (reminder_stage IN ('initial', 'first_reminder', 'second_reminder', 'final_notice', 'legal_notice')),
  sent_date timestamptz NOT NULL DEFAULT now(),
  send_method text CHECK (send_method IN ('email', 'sms', 'whatsapp', 'phone', 'letter')),
  
  -- Template and content
  template_id uuid, -- Future: reference to reminder_templates table
  subject text,
  message_body text,
  
  -- Response tracking
  opened_at timestamptz,
  clicked_at timestamptz,
  responded_at timestamptz,
  response_type text CHECK (response_type IN ('paid', 'promised', 'disputed', 'ignored')),
  
  -- Metadata
  sent_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_payment_reminders_customer ON payment_reminders(customer_id);
CREATE INDEX idx_payment_reminders_company ON payment_reminders(company_id);
CREATE INDEX idx_payment_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX idx_payment_reminders_stage ON payment_reminders(reminder_stage);
CREATE INDEX idx_payment_reminders_sent_date ON payment_reminders(sent_date);

-- RLS Policies
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment reminders for their company"
  ON payment_reminders FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create payment reminders for their company"
  ON payment_reminders FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 6. CUSTOMER PAYMENT SCORES TABLE
-- ============================================================================
-- Historical tracking of customer payment scores

CREATE TABLE IF NOT EXISTS customer_payment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Score details
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  category text NOT NULL CHECK (category IN ('excellent', 'good', 'fair', 'poor', 'very_poor')),
  
  -- Breakdown
  late_payments_deduction integer DEFAULT 0,
  broken_promises_deduction integer DEFAULT 0,
  disputes_deduction integer DEFAULT 0,
  failed_payments_deduction integer DEFAULT 0,
  early_payments_bonus integer DEFAULT 0,
  other_bonuses integer DEFAULT 0,
  
  -- Metadata
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_customer_payment_scores_customer ON customer_payment_scores(customer_id);
CREATE INDEX idx_customer_payment_scores_company ON customer_payment_scores(company_id);
CREATE INDEX idx_customer_payment_scores_date ON customer_payment_scores(calculated_at);
CREATE INDEX idx_customer_payment_scores_category ON customer_payment_scores(category);

-- RLS Policies
ALTER TABLE customer_payment_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment scores for their company"
  ON customer_payment_scores FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create payment scores for their company"
  ON customer_payment_scores FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 7. PAYMENT BEHAVIOR ANALYTICS TABLE
-- ============================================================================
-- Stores analyzed payment behavior patterns for customers

CREATE TABLE IF NOT EXISTS payment_behavior_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Behavior metrics
  average_days_to_pay numeric(5,2),
  preferred_payment_method text,
  best_day_to_contact text CHECK (best_day_to_contact IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  best_time_to_contact text,
  
  -- Performance rates (0-100)
  response_rate integer CHECK (response_rate >= 0 AND response_rate <= 100),
  promise_keeping_rate integer CHECK (promise_keeping_rate >= 0 AND promise_keeping_rate <= 100),
  on_time_payment_rate integer CHECK (on_time_payment_rate >= 0 AND on_time_payment_rate <= 100),
  
  -- Payment patterns
  payment_frequency text, -- 'regular', 'irregular', 'seasonal'
  typical_delay_days integer,
  prefers_reminders boolean DEFAULT false,
  
  -- Metadata
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  data_points_count integer DEFAULT 0, -- Number of payments analyzed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint: One current analysis per customer
  CONSTRAINT unique_customer_analytics UNIQUE (customer_id, company_id)
);

-- Indexes
CREATE INDEX idx_payment_behavior_customer ON payment_behavior_analytics(customer_id);
CREATE INDEX idx_payment_behavior_company ON payment_behavior_analytics(company_id);
CREATE INDEX idx_payment_behavior_analyzed_at ON payment_behavior_analytics(analyzed_at);

-- RLS Policies
ALTER TABLE payment_behavior_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view behavior analytics for their company"
  ON payment_behavior_analytics FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert behavior analytics for their company"
  ON payment_behavior_analytics FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update behavior analytics for their company"
  ON payment_behavior_analytics FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 8. AUTOMATED TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_payment_promises_updated_at
  BEFORE UPDATE ON payment_promises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_installments_updated_at
  BEFORE UPDATE ON payment_installments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_behavior_analytics_updated_at
  BEFORE UPDATE ON payment_behavior_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. AUTOMATIC STATUS UPDATES
-- ============================================================================

-- Function to automatically update promise status when payment is received
CREATE OR REPLACE FUNCTION check_payment_promise_fulfillment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update promise status when payment is made on the invoice
  UPDATE payment_promises
  SET 
    actual_paid_amount = NEW.amount,
    actual_paid_date = NEW.payment_date,
    status = CASE
      WHEN NEW.amount >= promised_amount THEN 'kept'
      WHEN NEW.amount > 0 AND NEW.amount < promised_amount THEN 'partially_kept'
      ELSE status
    END,
    updated_at = now()
  WHERE invoice_id = NEW.invoice_id
    AND status = 'pending'
    AND promise_date <= NEW.payment_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on payments table (if exists)
-- Note: This assumes a payments table exists. Adjust table name if different.
-- CREATE TRIGGER check_promise_on_payment
--   AFTER INSERT ON payments
--   FOR EACH ROW EXECUTE FUNCTION check_payment_promise_fulfillment();

-- Function to mark broken promises automatically
CREATE OR REPLACE FUNCTION mark_broken_promises()
RETURNS void AS $$
BEGIN
  UPDATE payment_promises
  SET 
    status = 'broken',
    updated_at = now()
  WHERE status = 'pending'
    AND promise_date < CURRENT_DATE
    AND actual_paid_date IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update installment status based on due date
CREATE OR REPLACE FUNCTION update_installment_status()
RETURNS void AS $$
BEGIN
  UPDATE payment_installments
  SET 
    status = CASE
      WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 'overdue'
      WHEN status = 'overdue' AND due_date < CURRENT_DATE - INTERVAL '30 days' THEN 'missed'
      ELSE status
    END,
    updated_at = now()
  WHERE status IN ('pending', 'overdue')
    AND paid_date IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. ADD MISSING COLUMN TO CUSTOMERS TABLE (if not exists)
-- ============================================================================

-- Add auto_pay_enabled column to customers table for bonus scoring
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'auto_pay_enabled'
  ) THEN
    ALTER TABLE customers ADD COLUMN auto_pay_enabled boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- 11. USEFUL VIEWS
-- ============================================================================

-- View: Customer Payment Score Summary (Latest scores)
CREATE OR REPLACE VIEW customer_payment_score_summary AS
SELECT DISTINCT ON (customer_id)
  customer_id,
  company_id,
  score,
  category,
  late_payments_deduction,
  broken_promises_deduction,
  disputes_deduction,
  failed_payments_deduction,
  early_payments_bonus,
  other_bonuses,
  calculated_at
FROM customer_payment_scores
ORDER BY customer_id, calculated_at DESC;

-- View: Active Payment Plans Summary
CREATE OR REPLACE VIEW active_payment_plans_summary AS
SELECT 
  pp.id,
  pp.company_id,
  pp.customer_id,
  COALESCE(c.first_name || ' ' || c.last_name, c.first_name, c.last_name, '') as customer_name,
  pp.invoice_id,
  pp.total_amount,
  pp.number_of_payments,
  pp.frequency,
  pp.status,
  COUNT(pi.id) as total_installments,
  COUNT(pi.id) FILTER (WHERE pi.status = 'paid') as paid_installments,
  COUNT(pi.id) FILTER (WHERE pi.status = 'overdue') as overdue_installments,
  SUM(pi.amount) as total_plan_amount,
  SUM(pi.paid_amount) as total_paid_amount,
  pp.start_date,
  pp.end_date
FROM payment_plans pp
LEFT JOIN payment_installments pi ON pp.id = pi.payment_plan_id
LEFT JOIN customers c ON pp.customer_id = c.id
WHERE pp.status = 'active'
GROUP BY pp.id, c.first_name, c.last_name;

-- View: Overdue Promises
CREATE OR REPLACE VIEW overdue_payment_promises AS
SELECT 
  pp.*,
  COALESCE(c.first_name || ' ' || c.last_name, c.first_name, c.last_name, '') as customer_name,
  i.invoice_number,
  i.total_amount as invoice_amount,
  CURRENT_DATE - pp.promise_date as days_overdue
FROM payment_promises pp
LEFT JOIN customers c ON pp.customer_id = c.id
LEFT JOIN invoices i ON pp.invoice_id = i.id
WHERE pp.status = 'pending'
  AND pp.promise_date < CURRENT_DATE;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comment to track migration
COMMENT ON TABLE payment_promises IS 'Payment Collections System - Tracks customer payment promises';
COMMENT ON TABLE payment_plans IS 'Payment Collections System - Manages installment payment plans';
COMMENT ON TABLE payment_installments IS 'Payment Collections System - Individual installments in payment plans';
COMMENT ON TABLE payment_attempts IS 'Payment Collections System - Failed payment attempt tracking';
COMMENT ON TABLE payment_reminders IS 'Payment Collections System - Payment reminder history';
COMMENT ON TABLE customer_payment_scores IS 'Payment Collections System - Historical payment score tracking';
COMMENT ON TABLE payment_behavior_analytics IS 'Payment Collections System - Customer payment behavior analysis';
