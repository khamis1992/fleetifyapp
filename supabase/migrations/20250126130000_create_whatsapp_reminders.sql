-- WhatsApp Payment Reminder System Migration
-- ===============================================
-- Purpose: Automated payment reminders via WhatsApp Web
-- Features: 4-stage reminders, queue management, history tracking
-- Date: 2025-01-26
-- ===============================================

-- Step 1: Create reminder_schedules table
CREATE TABLE IF NOT EXISTS public.reminder_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Reminder details
    reminder_type TEXT NOT NULL CHECK (reminder_type IN (
        'pre_due',      -- 3 days before due date
        'due_date',     -- On due date
        'overdue',      -- 3 days after due
        'escalation'    -- 10 days after due
    )),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME DEFAULT '09:00:00', -- Default 9 AM
    
    -- Contact info
    phone_number TEXT NOT NULL,
    customer_name TEXT,
    
    -- Message content
    message_template TEXT NOT NULL,
    message_variables JSONB, -- Store dynamic data
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Not sent yet
        'queued',       -- In send queue
        'sent',         -- Successfully sent
        'failed',       -- Failed to send
        'cancelled'     -- Cancelled (invoice paid)
    )),
    
    -- Send details
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    delivery_status TEXT, -- 'delivered', 'read', 'failed'
    
    -- Error handling
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_invoice_reminder_type UNIQUE (invoice_id, reminder_type)
);

-- Step 2: Create reminder_history table (audit trail)
CREATE TABLE IF NOT EXISTS public.reminder_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_schedule_id UUID NOT NULL REFERENCES reminder_schedules(id) ON DELETE CASCADE,
    
    -- Action details
    action TEXT NOT NULL CHECK (action IN (
        'created', 'queued', 'sent', 'delivered', 'read', 'failed', 'cancelled', 'retried'
    )),
    
    -- Message details
    phone_number TEXT,
    message_sent TEXT, -- Actual message sent
    
    -- Status
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    
    -- Metadata
    user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 3: Create whatsapp_connection_status table
CREATE TABLE IF NOT EXISTS public.whatsapp_connection_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Connection status
    is_connected BOOLEAN DEFAULT false,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    last_disconnected_at TIMESTAMP WITH TIME ZONE,
    session_path TEXT,
    
    -- Phone info
    whatsapp_number TEXT,
    whatsapp_name TEXT,
    
    -- Statistics
    total_sent_today INTEGER DEFAULT 0,
    total_sent_this_week INTEGER DEFAULT 0,
    total_sent_this_month INTEGER DEFAULT 0,
    last_message_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Service status
    service_running BOOLEAN DEFAULT false,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    
    -- Configuration
    auto_reconnect BOOLEAN DEFAULT true,
    max_messages_per_hour INTEGER DEFAULT 60,
    delay_between_messages_seconds INTEGER DEFAULT 2,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_company_whatsapp UNIQUE (company_id)
);

-- Step 4: Create reminder_templates table
CREATE TABLE IF NOT EXISTS public.reminder_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Template details
    template_name TEXT NOT NULL,
    reminder_type TEXT NOT NULL,
    language TEXT DEFAULT 'ar',
    
    -- Content
    template_text TEXT NOT NULL,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_company_template UNIQUE (company_id, template_name, reminder_type)
);

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_company ON reminder_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_invoice ON reminder_schedules(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_customer ON reminder_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_status ON reminder_schedules(status);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_scheduled_date ON reminder_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_pending ON reminder_schedules(status, scheduled_date) 
    WHERE status IN ('pending', 'queued');

CREATE INDEX IF NOT EXISTS idx_reminder_history_schedule ON reminder_history(reminder_schedule_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_created ON reminder_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_status_company ON whatsapp_connection_status(company_id);
CREATE INDEX IF NOT EXISTS idx_reminder_templates_company ON reminder_templates(company_id);

-- Step 6: Enable RLS
ALTER TABLE reminder_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_connection_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
CREATE POLICY "Users can view reminder schedules from their company"
    ON reminder_schedules FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "System can insert reminder schedules"
    ON reminder_schedules FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update reminder schedules"
    ON reminder_schedules FOR UPDATE
    USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view reminder history"
    ON reminder_history FOR SELECT
    USING (
        reminder_schedule_id IN (
            SELECT id FROM reminder_schedules
            WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Users can view WhatsApp status for their company"
    ON whatsapp_connection_status FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Managers can manage WhatsApp status"
    ON whatsapp_connection_status FOR ALL
    USING (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('manager', 'company_admin', 'super_admin')
        )
    );

CREATE POLICY "Users can view templates from their company"
    ON reminder_templates FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Managers can manage templates"
    ON reminder_templates FOR ALL
    USING (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('manager', 'company_admin', 'super_admin')
        )
    );

-- Step 8: Create function to generate reminder schedule for invoice
CREATE OR REPLACE FUNCTION generate_reminder_schedule_for_invoice(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_invoice RECORD;
    v_customer RECORD;
    v_template RECORD;
BEGIN
    -- Get invoice details
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Get customer details
    SELECT * INTO v_customer
    FROM customers
    WHERE id = v_invoice.customer_id;
    
    IF v_customer.phone IS NULL THEN
        RAISE NOTICE 'Customer has no phone number, skipping reminders';
        RETURN;
    END IF;
    
    -- Create 4 reminder schedules
    
    -- 1. Pre-due reminder (-3 days)
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date,
        phone_number, customer_name,
        message_template, message_variables
    )
    SELECT 
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'pre_due',
        v_invoice.due_date - INTERVAL '3 days',
        v_customer.phone,
        v_customer.first_name_ar,
        COALESCE(
            (SELECT template_text FROM reminder_templates 
             WHERE company_id = v_invoice.company_id 
             AND reminder_type = 'pre_due' 
             AND is_active = true 
             LIMIT 1),
            'مرحباً [اسم العميل] 👋\n\nتذكير ودي: فاتورتك رقم [رقم الفاتورة] بمبلغ [المبلغ] د.ك ستستحق خلال 3 أيام.\n\n📅 تاريخ الاستحقاق: [تاريخ الاستحقاق]\n\nشكراً لتعاونكم 🙏'
        ),
        jsonb_build_object(
            'customer_name', v_customer.first_name_ar,
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'due_date', v_invoice.due_date
        )
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
    
    -- 2. Due date reminder
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date,
        phone_number, customer_name,
        message_template, message_variables
    )
    SELECT 
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'due_date',
        v_invoice.due_date,
        v_customer.phone,
        v_customer.first_name_ar,
        COALESCE(
            (SELECT template_text FROM reminder_templates 
             WHERE company_id = v_invoice.company_id 
             AND reminder_type = 'due_date' 
             AND is_active = true 
             LIMIT 1),
            'مرحباً [اسم العميل] 👋\n\nفاتورتك رقم [رقم الفاتورة] مستحقة اليوم.\n\n💰 المبلغ: [المبلغ] د.ك\n\nالرجاء الدفع في أقرب وقت ممكن.\n\nشكراً 🙏'
        ),
        jsonb_build_object(
            'customer_name', v_customer.first_name_ar,
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'due_date', v_invoice.due_date
        )
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
    
    -- 3. Overdue notice (+3 days)
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date,
        phone_number, customer_name,
        message_template, message_variables
    )
    SELECT 
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'overdue',
        v_invoice.due_date + INTERVAL '3 days',
        v_customer.phone,
        v_customer.first_name_ar,
        COALESCE(
            (SELECT template_text FROM reminder_templates 
             WHERE company_id = v_invoice.company_id 
             AND reminder_type = 'overdue' 
             AND is_active = true 
             LIMIT 1),
            'عزيزي [اسم العميل] ⚠️\n\nفاتورتك رقم [رقم الفاتورة] متأخرة بـ 3 أيام.\n\n💰 المبلغ: [المبلغ] د.ك\n\nالرجاء سداد المبلغ فوراً لتجنب رسوم التأخير.\n\nشكراً'
        ),
        jsonb_build_object(
            'customer_name', v_customer.first_name_ar,
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'days_overdue', 3
        )
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
    
    -- 4. Escalation warning (+10 days)
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date,
        phone_number, customer_name,
        message_template, message_variables
    )
    SELECT 
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'escalation',
        v_invoice.due_date + INTERVAL '10 days',
        v_customer.phone,
        v_customer.first_name_ar,
        COALESCE(
            (SELECT template_text FROM reminder_templates 
             WHERE company_id = v_invoice.company_id 
             AND reminder_type = 'escalation' 
             AND is_active = true 
             LIMIT 1),
            'السيد/ة [اسم العميل] 🚨\n\nإشعار نهائي - فاتورة متأخرة 10 أيام\n\n📋 رقم الفاتورة: [رقم الفاتورة]\n💰 المبلغ: [المبلغ] د.ك\n\n⚠️ في حالة عدم السداد خلال 48 ساعة سيتم اتخاذ إجراءات قانونية.'
        ),
        jsonb_build_object(
            'customer_name', v_customer.first_name_ar,
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'days_overdue', 10
        )
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
END;
$$;

-- Step 9: Create trigger to auto-generate reminders on invoice creation
CREATE OR REPLACE FUNCTION trigger_generate_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only create reminders for unpaid invoices
    IF NEW.payment_status != 'paid' AND NEW.due_date IS NOT NULL THEN
        PERFORM generate_reminder_schedule_for_invoice(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_generate_payment_reminders
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_reminders();

-- Step 10: Create function to get pending reminders for today
CREATE OR REPLACE FUNCTION get_pending_reminders_for_today()
RETURNS TABLE (
    reminder_id UUID,
    invoice_number TEXT,
    customer_name TEXT,
    phone_number TEXT,
    message_text TEXT,
    reminder_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.id,
        i.invoice_number,
        rs.customer_name,
        rs.phone_number,
        rs.message_template,
        rs.reminder_type
    FROM reminder_schedules rs
    JOIN invoices i ON rs.invoice_id = i.id
    WHERE rs.scheduled_date = CURRENT_DATE
    AND rs.status = 'pending'
    AND i.payment_status != 'paid' -- Don't send if already paid
    ORDER BY rs.scheduled_time ASC;
END;
$$;

-- Step 10.5: Create function to check and queue payment reminders (for cron job)
CREATE OR REPLACE FUNCTION check_payment_reminders()
RETURNS TABLE (
    reminder_id UUID,
    company_id UUID,
    invoice_id UUID,
    invoice_number TEXT,
    customer_id UUID,
    customer_name TEXT,
    phone_number TEXT,
    message_template TEXT,
    message_variables JSONB,
    reminder_type TEXT,
    scheduled_date DATE,
    scheduled_time TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_reminder RECORD;
    v_queued_count INTEGER := 0;
BEGIN
    -- Find all pending reminders scheduled for today or earlier
    -- that haven't been cancelled and where invoice is still unpaid
    FOR v_reminder IN
        SELECT 
            rs.id,
            rs.company_id,
            rs.invoice_id,
            i.invoice_number,
            rs.customer_id,
            rs.customer_name,
            rs.phone_number,
            rs.message_template,
            rs.message_variables,
            rs.reminder_type,
            rs.scheduled_date,
            rs.scheduled_time
        FROM reminder_schedules rs
        JOIN invoices i ON rs.invoice_id = i.id
        WHERE rs.scheduled_date <= CURRENT_DATE
        AND rs.status = 'pending'
        AND i.payment_status != 'paid'
        AND i.status != 'cancelled'
        ORDER BY rs.scheduled_date ASC, rs.scheduled_time ASC
    LOOP
        -- Mark reminder as queued
        UPDATE reminder_schedules
        SET 
            status = 'queued',
            updated_at = NOW()
        WHERE id = v_reminder.id
        AND status = 'pending'; -- Only update if still pending
        
        -- Log queued action
        INSERT INTO reminder_history (reminder_schedule_id, action, success, phone_number)
        VALUES (v_reminder.id, 'queued', true, v_reminder.phone_number);
        
        -- Return the reminder details
        RETURN QUERY SELECT 
            v_reminder.id,
            v_reminder.company_id,
            v_reminder.invoice_id,
            v_reminder.invoice_number,
            v_reminder.customer_id,
            v_reminder.customer_name,
            v_reminder.phone_number,
            v_reminder.message_template,
            v_reminder.message_variables,
            v_reminder.reminder_type,
            v_reminder.scheduled_date,
            v_reminder.scheduled_time;
        
        v_queued_count := v_queued_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ check_payment_reminders: % reminders queued for processing', v_queued_count;
END;
$$;

-- Step 11: Create function to cancel reminders when invoice is paid
CREATE OR REPLACE FUNCTION cancel_reminders_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
        -- Cancel all pending reminders
        UPDATE reminder_schedules
        SET 
            status = 'cancelled',
            updated_at = NOW()
        WHERE invoice_id = NEW.id
        AND status IN ('pending', 'queued');
        
        -- Log cancellation
        INSERT INTO reminder_history (reminder_schedule_id, action, success)
        SELECT id, 'cancelled', true
        FROM reminder_schedules
        WHERE invoice_id = NEW.id AND status = 'cancelled';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER cancel_reminders_on_invoice_payment
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION cancel_reminders_on_payment();

-- Step 12: Create view for reminder dashboard
CREATE OR REPLACE VIEW reminder_dashboard_stats AS
SELECT 
    company_id,
    COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_date = CURRENT_DATE) as pending_today,
    COUNT(*) FILTER (WHERE status = 'sent' AND DATE(sent_at) = CURRENT_DATE) as sent_today,
    COUNT(*) FILTER (WHERE status = 'failed' AND DATE(sent_at) = CURRENT_DATE) as failed_today,
    COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
    COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
    COUNT(*) FILTER (WHERE status = 'cancelled') as total_cancelled
FROM reminder_schedules
GROUP BY company_id;

-- Step 12.5: Ensure reminder_templates table has required columns for WhatsApp reminders
-- Add columns if they don't exist (in case table was created by earlier migration)
DO $$
BEGIN
    -- Add template_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reminder_templates' AND column_name = 'template_name'
    ) THEN
        ALTER TABLE reminder_templates ADD COLUMN template_name TEXT;
        -- Copy from name if name exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'reminder_templates' AND column_name = 'name'
        ) THEN
            UPDATE reminder_templates SET template_name = name WHERE template_name IS NULL;
        END IF;
    END IF;
    
    -- Add reminder_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reminder_templates' AND column_name = 'reminder_type'
    ) THEN
        ALTER TABLE reminder_templates ADD COLUMN reminder_type TEXT;
        -- Copy from stage if stage exists (with mapping)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'reminder_templates' AND column_name = 'stage'
        ) THEN
            UPDATE reminder_templates SET reminder_type = stage WHERE reminder_type IS NULL;
        END IF;
    END IF;
    
    -- Add template_text column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reminder_templates' AND column_name = 'template_text'
    ) THEN
        ALTER TABLE reminder_templates ADD COLUMN template_text TEXT;
        -- Copy from body if body exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'reminder_templates' AND column_name = 'body'
        ) THEN
            UPDATE reminder_templates SET template_text = body WHERE template_text IS NULL;
        END IF;
    END IF;
    
    -- Add is_default column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reminder_templates' AND column_name = 'is_default'
    ) THEN
        ALTER TABLE reminder_templates ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
    
    -- Add language column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reminder_templates' AND column_name = 'language'
    ) THEN
        ALTER TABLE reminder_templates ADD COLUMN language TEXT DEFAULT 'ar';
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reminder_templates' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE reminder_templates ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Ensure unique constraint exists for WhatsApp reminders
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public' 
        AND c.conname = 'unique_company_template'
    ) THEN
        ALTER TABLE reminder_templates 
        ADD CONSTRAINT unique_company_template UNIQUE (company_id, template_name, reminder_type);
    END IF;
END $$;

-- Step 13: Insert default templates
-- Note: Also populate columns from earlier migration schema (name, stage, body, channel, subject, status)
INSERT INTO reminder_templates (
    company_id, 
    template_name, 
    reminder_type, 
    template_text, 
    is_default,
    name,
    stage,
    body,
    channel,
    subject,
    status
)
SELECT 
    id as company_id,
    'Default Pre-Due Reminder' as template_name,
    'pre_due' as reminder_type,
    'مرحباً [اسم العميل] 👋

تذكير ودي: فاتورتك رقم [رقم الفاتورة] بمبلغ [المبلغ] د.ك ستستحق خلال 3 أيام.

📅 تاريخ الاستحقاق: [تاريخ الاستحقاق]

شكراً لتعاونكم 🙏
[اسم الشركة]' as template_text,
    true as is_default,
    'Default Pre-Due Reminder' as name,
    'initial' as stage,
    'مرحباً [اسم العميل] 👋

تذكير ودي: فاتورتك رقم [رقم الفاتورة] بمبلغ [المبلغ] د.ك ستستحق خلال 3 أيام.

📅 تاريخ الاستحقاق: [تاريخ الاستحقاق]

شكراً لتعاونكم 🙏
[اسم الشركة]' as body,
    'whatsapp' as channel,
    'تذكير استحقاق الفاتورة' as subject,
    'active' as status
FROM companies
ON CONFLICT (company_id, template_name, reminder_type) DO NOTHING;

INSERT INTO reminder_templates (
    company_id, 
    template_name, 
    reminder_type, 
    template_text, 
    is_default,
    name,
    stage,
    body,
    channel,
    subject,
    status
)
SELECT 
    id as company_id,
    'Default Due Date Reminder' as template_name,
    'due_date' as reminder_type,
    'مرحباً [اسم العميل] 👋

فاتورتك رقم [رقم الفاتورة] مستحقة اليوم.

💰 المبلغ: [المبلغ] د.ك

الرجاء الدفع في أقرب وقت ممكن لتجنب رسوم التأخير.

شكراً 🙏
[اسم الشركة]' as template_text,
    true as is_default,
    'Default Due Date Reminder' as name,
    'first_reminder' as stage,
    'مرحباً [اسم العميل] 👋

فاتورتك رقم [رقم الفاتورة] مستحقة اليوم.

💰 المبلغ: [المبلغ] د.ك

الرجاء الدفع في أقرب وقت ممكن لتجنب رسوم التأخير.

شكراً 🙏
[اسم الشركة]' as body,
    'whatsapp' as channel,
    'فاتورة مستحقة اليوم' as subject,
    'active' as status
FROM companies
ON CONFLICT (company_id, template_name, reminder_type) DO NOTHING;

-- Step 14: Grant permissions
GRANT SELECT ON reminder_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION generate_reminder_schedule_for_invoice TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_reminders_for_today TO authenticated;
GRANT EXECUTE ON FUNCTION check_payment_reminders TO authenticated;
GRANT EXECUTE ON FUNCTION check_payment_reminders TO service_role;

-- Step 15: Add comments
COMMENT ON TABLE reminder_schedules IS 'Scheduled WhatsApp payment reminders for invoices';
COMMENT ON TABLE reminder_history IS 'Complete audit trail of all reminder actions';
COMMENT ON TABLE whatsapp_connection_status IS 'WhatsApp Web connection status and statistics';
COMMENT ON TABLE reminder_templates IS 'Customizable message templates for reminders';
COMMENT ON FUNCTION generate_reminder_schedule_for_invoice IS 'Auto-generate 4 reminder schedules for an invoice';
COMMENT ON FUNCTION get_pending_reminders_for_today IS 'Get all reminders scheduled for today';
COMMENT ON FUNCTION check_payment_reminders IS 'Check for pending reminders and queue them for processing (for cron job)';
COMMENT ON VIEW reminder_dashboard_stats IS 'Real-time statistics for reminder dashboard';

-- Step 16: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ WhatsApp Payment Reminder System created successfully';
    RAISE NOTICE '📋 Tables: reminder_schedules, reminder_history, whatsapp_connection_status, reminder_templates';
    RAISE NOTICE '🔧 Functions: generate_reminder_schedule_for_invoice, get_pending_reminders_for_today, check_payment_reminders';
    RAISE NOTICE '⚡ Triggers: Auto-generate reminders on invoice creation, Cancel on payment';
    RAISE NOTICE '👁️ Views: reminder_dashboard_stats';
    RAISE NOTICE '📱 Next: Set up WhatsApp Web service (see WHATSAPP_REMINDER_SYSTEM_PLAN.md)';
    RAISE NOTICE '⏰ Schedule: Reminders at -3 days, due date, +3 days, +10 days';
    RAISE NOTICE '🔄 Cron: Use check_payment_reminders() function for scheduled daily processing';
    RAISE NOTICE '🔒 RLS policies enabled';
END $$;
