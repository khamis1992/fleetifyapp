-- ============================================================================
-- SCHEMA CONFLICT RESOLUTION: UNIFIED REMINDER SYSTEM
-- ============================================================================
-- Purpose: Resolve conflicting reminder_schedules table definitions
-- Merges WhatsApp reminder system with template-based reminder system
-- Date: 2025-01-01 (Emergency fix)
-- ============================================================================

-- Step 1: Backup existing data before any changes
CREATE TABLE IF NOT EXISTS reminder_schedules_backup_20250101 AS
SELECT * FROM reminder_schedules;

CREATE TABLE IF NOT EXISTS reminder_templates_backup_20250101 AS
SELECT * FROM reminder_templates;

-- Log the backup operation
DO $$
BEGIN
    RAISE NOTICE '🔄 Created backup tables: reminder_schedules_backup_20250101, reminder_templates_backup_20250101';
END $$;

-- Step 2: Drop the incomplete reminder_schedules table
DROP TABLE IF EXISTS reminder_schedules CASCADE;

-- Step 3: Create the unified reminder_schedules table
-- This combines the best of both schemas
CREATE TABLE reminder_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core relationships
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    template_id UUID REFERENCES reminder_templates(id) ON DELETE SET NULL,

    -- Reminder classification (from WhatsApp system)
    reminder_type TEXT NOT NULL CHECK (reminder_type IN (
        'pre_due',      -- 3 days before due date
        'due_date',     -- On due date
        'overdue',      -- 3 days after due
        'escalation',   -- 10 days after due
        'initial',      -- From template system
        'first_reminder',
        'second_reminder',
        'final_notice',
        'legal_notice'
    )),

    -- Scheduling (unified from both systems)
    scheduled_date DATE NOT NULL,
    scheduled_time TIME DEFAULT '09:00:00',

    -- Contact information (from WhatsApp system)
    phone_number TEXT,
    customer_name TEXT,
    email_address TEXT, -- Added for email templates

    -- Message content (unified)
    message_template TEXT,
    message_variables JSONB,

    -- Template reference (from template system)
    subject TEXT,

    -- Status tracking (enhanced from both systems)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Not sent yet
        'queued',       -- In send queue
        'sent',         -- Successfully sent
        'delivered',    -- Confirmed delivered
        'read',         -- Message read
        'failed',       -- Failed to send
        'cancelled',    -- Cancelled (invoice paid)
        'retried'       -- After retry
    )),

    -- Send details (from WhatsApp system)
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    delivery_status TEXT, -- 'delivered', 'read', 'failed', 'bounced'

    -- Error handling and retry (from WhatsApp system)
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE,

    -- Channel tracking (from template system)
    channel TEXT CHECK (channel IN ('email', 'sms', 'whatsapp', 'phone', 'letter')) DEFAULT 'whatsapp',

    -- Engagement tracking (from template system)
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,

    -- A/B testing (from template system)
    variant TEXT CHECK (variant IN ('A', 'B')),

    -- Performance tracking (from template system)
    send_cost DECIMAL(10,4),

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT unique_invoice_reminder_type UNIQUE (invoice_id, reminder_type),
    CONSTRAINT valid_scheduled_date CHECK (scheduled_date >= CURRENT_DATE - INTERVAL '1 year')
);

-- Step 4: Ensure reminder_templates table has all required columns
-- First, let's check if table exists and has the right structure
DO $$
BEGIN
    -- Check if template table has WhatsApp-specific columns, add if missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reminder_templates') THEN
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_templates' AND column_name = 'reminder_type') THEN
            ALTER TABLE reminder_templates ADD COLUMN reminder_type TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_templates' AND column_name = 'template_text') THEN
            ALTER TABLE reminder_templates ADD COLUMN template_text TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_templates' AND column_name = 'template_name') THEN
            ALTER TABLE reminder_templates ADD COLUMN template_name TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_templates' AND column_name = 'language') THEN
            ALTER TABLE reminder_templates ADD COLUMN language TEXT DEFAULT 'ar';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_templates' AND column_name = 'is_default') THEN
            ALTER TABLE reminder_templates ADD COLUMN is_default BOOLEAN DEFAULT false;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_templates' AND column_name = 'is_active') THEN
            ALTER TABLE reminder_templates ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;

        -- Update existing records to have default values
        UPDATE reminder_templates SET
            reminder_type = COALESCE(reminder_type, stage),
            template_text = COALESCE(template_text, body),
            template_name = COALESCE(template_name, name),
            is_active = CASE WHEN status = 'active' THEN true ELSE false END
        WHERE reminder_type IS NULL OR template_text IS NULL OR template_name IS NULL OR is_active IS NULL;

    ELSE
        -- Create template table if it doesn't exist
        CREATE TABLE reminder_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

            -- Template identification
            template_name TEXT NOT NULL,
            name TEXT, -- Legacy support
            reminder_type TEXT,
            stage TEXT CHECK (stage IN ('initial', 'first_reminder', 'second_reminder', 'final_notice', 'legal_notice')),
            channel TEXT CHECK (channel IN ('email', 'sms', 'whatsapp', 'phone', 'letter')) DEFAULT 'whatsapp',

            -- Content
            subject TEXT,
            body TEXT,
            template_text TEXT,
            tone TEXT CHECK (tone IN ('friendly', 'professional', 'firm', 'urgent')),

            -- Status
            is_active BOOLEAN DEFAULT true,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
            is_default BOOLEAN DEFAULT false,

            -- A/B Testing
            variant TEXT CHECK (variant IN ('A', 'B')),

            -- Performance metrics
            sent_count INTEGER DEFAULT 0,
            opened_count INTEGER DEFAULT 0,
            clicked_count INTEGER DEFAULT 0,
            response_count INTEGER DEFAULT 0,
            conversion_rate DECIMAL(5,2) DEFAULT 0,

            -- Sending preferences
            send_time_preference TEXT DEFAULT '09:00',
            avoid_weekends BOOLEAN DEFAULT true,
            avoid_holidays BOOLEAN DEFAULT true,

            -- Language
            language TEXT DEFAULT 'ar',

            -- Metadata
            created_by UUID REFERENCES profiles(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

            -- Constraints
            CONSTRAINT unique_company_template UNIQUE (company_id, template_name, reminder_type)
        );
    END IF;
END $$;

-- Step 5: Create indexes for the unified tables
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_company ON reminder_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_invoice ON reminder_schedules(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_customer ON reminder_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_template ON reminder_schedules(template_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_status ON reminder_schedules(status);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_reminder_type ON reminder_schedules(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_scheduled_date ON reminder_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_channel ON reminder_schedules(channel);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_pending ON reminder_schedules(status, scheduled_date)
    WHERE status IN ('pending', 'queued');
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_company_status ON reminder_schedules(company_id, status);

CREATE INDEX IF NOT EXISTS idx_reminder_templates_company ON reminder_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_reminder_templates_stage ON reminder_templates(stage);
CREATE INDEX IF NOT EXISTS idx_reminder_templates_channel ON reminder_templates(channel);
CREATE INDEX IF NOT EXISTS idx_reminder_templates_status ON reminder_templates(status);
CREATE INDEX IF NOT EXISTS idx_reminder_templates_reminder_type ON reminder_templates(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminder_templates_active ON reminder_templates(is_active);

-- Step 6: Enable Row Level Security
ALTER TABLE reminder_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;

-- Step 7: Create comprehensive RLS policies
-- Reminder schedules policies
CREATE POLICY "Users can view reminder schedules from their company"
    ON reminder_schedules FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create reminder schedules"
    ON reminder_schedules FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update reminder schedules"
    ON reminder_schedules FOR UPDATE
    USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can delete reminder schedules"
    ON reminder_schedules FOR DELETE
    USING (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.company_id = reminder_schedules.company_id
            AND ur.role IN ('company_admin', 'manager')
        )
    );

-- Reminder templates policies
CREATE POLICY "Users can view reminder templates from their company"
    ON reminder_templates FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Managers can create reminder templates"
    ON reminder_templates FOR INSERT
    WITH CHECK (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.company_id = reminder_templates.company_id
            AND ur.role IN ('company_admin', 'manager')
        )
    );

CREATE POLICY "Managers can update reminder templates"
    ON reminder_templates FOR UPDATE
    USING (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.company_id = reminder_templates.company_id
            AND ur.role IN ('company_admin', 'manager')
        )
    );

CREATE POLICY "Admins can delete reminder templates"
    ON reminder_templates FOR DELETE
    USING (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.company_id = reminder_templates.company_id
            AND ur.role = 'company_admin'
        )
    );

-- Step 8: Restore data from backups if available
DO $$
BEGIN
    -- Check if backup has data and restore it
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reminder_schedules_backup_20250101') THEN
        -- Check if backup table has rows
        PERFORM 1 FROM reminder_schedules_backup_20250101 LIMIT 1;

        IF FOUND THEN
            -- Restore data from backup table
            -- Only map columns that exist in both old and new schema
            -- Map old reminder_type values to new standardized values
            INSERT INTO reminder_schedules (
                id, company_id, invoice_id, customer_id, template_id,
                reminder_type, scheduled_date, scheduled_time,
                phone_number, customer_name, message_template, message_variables,
                status, sent_at, retry_count,
                created_at, updated_at
            )
            SELECT
                id, company_id, invoice_id, customer_id, template_id,
                -- Map old reminder types to new standardized types
                CASE 
                    WHEN reminder_type LIKE 'pre_due%' THEN 'pre_due'
                    WHEN reminder_type LIKE 'due_date%' THEN 'due_date'
                    WHEN reminder_type LIKE 'overdue%' THEN 'overdue'
                    WHEN reminder_type LIKE 'escalation%' THEN 'escalation'
                    WHEN reminder_type IN ('initial', 'first_reminder', 'second_reminder', 'final_notice', 'legal_notice') THEN reminder_type
                    ELSE 'pre_due' -- Default fallback
                END,
                scheduled_date, 
                COALESCE(scheduled_time::TIME, '09:00:00'::TIME),
                phone_number, customer_name, message_template, message_variables,
                status, sent_at, COALESCE(retry_count, 0),
                created_at, updated_at
            FROM reminder_schedules_backup_20250101
            ON CONFLICT (id) DO NOTHING;

            RAISE NOTICE '📥 Restored % reminder_schedules from backup',
                (SELECT COUNT(*) FROM reminder_schedules_backup_20250101);
        END IF;
    END IF;
END $$;

-- Step 9: Create unified triggers and functions
-- Updated function to generate reminder schedules
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

    IF NOT FOUND THEN
        RAISE NOTICE 'Customer not found for invoice %', p_invoice_id;
        RETURN;
    END IF;

    -- Create 4 reminder schedules for WhatsApp

    -- 1. Pre-due reminder (-3 days)
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date, scheduled_time,
        phone_number, customer_name, email_address,
        message_template, message_variables,
        channel
    )
    SELECT
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'pre_due',
        v_invoice.due_date - INTERVAL '3 days',
        '09:00:00',
        v_customer.phone,
        COALESCE(v_customer.first_name_ar, v_customer.first_name),
        v_customer.email,
        COALESCE(
            (SELECT template_text FROM reminder_templates
             WHERE company_id = v_invoice.company_id
             AND reminder_type = 'pre_due'
             AND is_active = true
             LIMIT 1),
            'مرحباً [اسم العميل] 👋\n\nتذكير ودي: فاتورتك رقم [رقم الفاتورة] بمبلغ [المبلغ] د.ك ستستحق خلال 3 أيام.\n\n📅 تاريخ الاستحقاق: [تاريخ الاستحقاق]\n\nشكراً لتعاونكم 🙏'
        ),
        jsonb_build_object(
            'customer_name', COALESCE(v_customer.first_name_ar, v_customer.first_name),
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'due_date', v_invoice.due_date,
            'company_name', (SELECT name FROM companies WHERE id = v_invoice.company_id)
        ),
        'whatsapp'
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;

    -- 2. Due date reminder
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date, scheduled_time,
        phone_number, customer_name, email_address,
        message_template, message_variables,
        channel
    )
    SELECT
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'due_date',
        v_invoice.due_date,
        '09:00:00',
        v_customer.phone,
        COALESCE(v_customer.first_name_ar, v_customer.first_name),
        v_customer.email,
        COALESCE(
            (SELECT template_text FROM reminder_templates
             WHERE company_id = v_invoice.company_id
             AND reminder_type = 'due_date'
             AND is_active = true
             LIMIT 1),
            'مرحباً [اسم العميل] 👋\n\nفاتورتك رقم [رقم الفاتورة] مستحقة اليوم.\n\n💰 المبلغ: [المبلغ] د.ك\n\nالرجاء الدفع في أقرب وقت ممكن.\n\nشكراً 🙏'
        ),
        jsonb_build_object(
            'customer_name', COALESCE(v_customer.first_name_ar, v_customer.first_name),
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'due_date', v_invoice.due_date
        ),
        'whatsapp'
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;

    -- 3. Overdue notice (+3 days)
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date, scheduled_time,
        phone_number, customer_name, email_address,
        message_template, message_variables,
        channel
    )
    SELECT
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'overdue',
        v_invoice.due_date + INTERVAL '3 days',
        '09:00:00',
        v_customer.phone,
        COALESCE(v_customer.first_name_ar, v_customer.first_name),
        v_customer.email,
        COALESCE(
            (SELECT template_text FROM reminder_templates
             WHERE company_id = v_invoice.company_id
             AND reminder_type = 'overdue'
             AND is_active = true
             LIMIT 1),
            'عزيزي [اسم العميل] ⚠️\n\nفاتورتك رقم [رقم الفاتورة] متأخرة بـ 3 أيام.\n\n💰 المبلغ: [المبلغ] د.ك\n\nالرجاء سداد المبلغ فوراً لتجنب رسوم التأخير.\n\nشكراً'
        ),
        jsonb_build_object(
            'customer_name', COALESCE(v_customer.first_name_ar, v_customer.first_name),
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'days_overdue', 3
        ),
        'whatsapp'
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;

    -- 4. Escalation warning (+10 days)
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date, scheduled_time,
        phone_number, customer_name, email_address,
        message_template, message_variables,
        channel
    )
    SELECT
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'escalation',
        v_invoice.due_date + INTERVAL '10 days',
        '09:00:00',
        v_customer.phone,
        COALESCE(v_customer.first_name_ar, v_customer.first_name),
        v_customer.email,
        COALESCE(
            (SELECT template_text FROM reminder_templates
             WHERE company_id = v_invoice.company_id
             AND reminder_type = 'escalation'
             AND is_active = true
             LIMIT 1),
            'السيد/ة [اسم العميل] 🚨\n\nإشعار نهائي - فاتورة متأخرة 10 أيام\n\n📋 رقم الفاتورة: [رقم الفاتورة]\n💰 المبلغ: [المبلغ] د.ك\n\n⚠️ في حالة عدم السداد خلال 48 ساعة سيتم اتخاذ إجراءات قانونية.'
        ),
        jsonb_build_object(
            'customer_name', COALESCE(v_customer.first_name_ar, v_customer.first_name),
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'days_overdue', 10
        ),
        'whatsapp'
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
END;
$$;

-- Trigger to auto-generate reminders on invoice creation
DROP TRIGGER IF EXISTS auto_generate_payment_reminders ON invoices;
CREATE TRIGGER auto_generate_payment_reminders
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_reminders();

-- Update trigger function
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

-- Updated function to cancel reminders when invoice is paid
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
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cancel_reminders_on_invoice_payment ON invoices;
CREATE TRIGGER cancel_reminders_on_invoice_payment
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION cancel_reminders_on_payment();

-- Step 10: Create updated trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reminder_schedules_updated_at ON reminder_schedules;
CREATE TRIGGER update_reminder_schedules_updated_at
    BEFORE UPDATE ON reminder_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reminder_templates_updated_at ON reminder_templates;
CREATE TRIGGER update_reminder_templates_updated_at
    BEFORE UPDATE ON reminder_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Grant permissions
GRANT SELECT ON reminder_schedules TO authenticated, service_role;
GRANT INSERT ON reminder_schedules TO authenticated, service_role;
GRANT UPDATE ON reminder_schedules TO authenticated, service_role;
GRANT DELETE ON reminder_schedules TO service_role;

GRANT SELECT ON reminder_templates TO authenticated, service_role;
GRANT INSERT ON reminder_templates TO authenticated, service_role;
GRANT UPDATE ON reminder_templates TO authenticated, service_role;
GRANT DELETE ON reminder_templates TO service_role;

GRANT EXECUTE ON FUNCTION generate_reminder_schedule_for_invoice TO authenticated, service_role;

-- Step 12: Add helpful comments
COMMENT ON TABLE reminder_schedules IS 'Unified reminder system supporting WhatsApp, email, SMS with template integration';
COMMENT ON TABLE reminder_templates IS 'Unified template system for all reminder types and channels';
COMMENT ON COLUMN reminder_schedules.reminder_type IS 'Type of reminder: pre_due, due_date, overdue, escalation, or template-based stages';
COMMENT ON COLUMN reminder_schedules.channel IS 'Communication channel: whatsapp, email, sms, phone, letter';

-- Step 13: Success notification
DO $$
BEGIN
    RAISE NOTICE '✅ Schema conflict resolution completed successfully';
    RAISE NOTICE '📋 Unified reminder_schedules table created with all WhatsApp and template features';
    RAISE NOTICE '🔄 Data restored from backup if available';
    RAISE NOTICE '🔒 RLS policies updated for unified tables';
    RAISE NOTICE '⚡ Triggers and functions updated for unified system';
    RAISE NOTICE '💾 Backup tables preserved: reminder_schedules_backup_20250101, reminder_templates_backup_20250101';
END $$;