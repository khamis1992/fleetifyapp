
-- =====================================================
-- نظام إدارة المهام - Task Management System
-- =====================================================

-- 1. جدول المهام الرئيسي
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- بيانات المهمة الأساسية
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- المسؤولين
    created_by UUID NOT NULL REFERENCES profiles(id),
    assigned_to UUID REFERENCES profiles(id),
    
    -- الحالة والأولوية
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- التواريخ
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- التصنيف
    category VARCHAR(100),
    tags TEXT[],
    
    -- الإشعارات
    whatsapp_notification_sent BOOLEAN DEFAULT FALSE,
    whatsapp_sent_at TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT FALSE,
    
    -- البيانات الإضافية
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- الطوابع الزمنية
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول التعليقات على المهام
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول سجل تغييرات المهام
CREATE TABLE IF NOT EXISTS task_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    action VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول التنبيهات
CREATE TABLE IF NOT EXISTS task_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('assignment', 'due_reminder', 'status_change', 'comment', 'mention')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    whatsapp_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول قوالب المهام
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_title VARCHAR(255),
    default_description TEXT,
    default_priority VARCHAR(20) DEFAULT 'medium',
    default_category VARCHAR(100),
    default_tags TEXT[],
    checklist_items JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. جدول قوائم التحقق للمهام
CREATE TABLE IF NOT EXISTS task_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES profiles(id),
    completed_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- الفهارس (Indexes)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_task_activity_log_task_id ON task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_user_id ON task_activity_log(user_id);

CREATE INDEX IF NOT EXISTS idx_task_notifications_user_id ON task_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_task_id ON task_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_is_read ON task_notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_task_templates_company_id ON task_templates(company_id);

CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON task_checklists(task_id);

-- =====================================================
-- Trigger لتحديث updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_updated_at();

DROP TRIGGER IF EXISTS trigger_task_comments_updated_at ON task_comments;
CREATE TRIGGER trigger_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_task_updated_at();

DROP TRIGGER IF EXISTS trigger_task_templates_updated_at ON task_templates;
CREATE TRIGGER trigger_task_templates_updated_at
    BEFORE UPDATE ON task_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_task_updated_at();

-- =====================================================
-- Trigger لتسجيل النشاط تلقائياً
-- =====================================================

CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields JSONB := '{}';
BEGIN
    -- تسجيل التغييرات في الحالة
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        changed_fields := changed_fields || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    
    -- تسجيل التغييرات في المسؤول
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        changed_fields := changed_fields || jsonb_build_object('assigned_to', jsonb_build_object('old', OLD.assigned_to, 'new', NEW.assigned_to));
    END IF;
    
    -- تسجيل التغييرات في الأولوية
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        changed_fields := changed_fields || jsonb_build_object('priority', jsonb_build_object('old', OLD.priority, 'new', NEW.priority));
    END IF;
    
    -- إدراج سجل النشاط إذا كانت هناك تغييرات
    IF changed_fields != '{}' THEN
        INSERT INTO task_activity_log (task_id, user_id, action, old_value, new_value, description)
        VALUES (
            NEW.id,
            COALESCE(NEW.assigned_to, NEW.created_by),
            'update',
            to_jsonb(OLD),
            to_jsonb(NEW),
            'تم تحديث المهمة'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_task_changes ON tasks;
CREATE TRIGGER trigger_log_task_changes
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_changes();

-- =====================================================
-- تعيين completed_at عند إكمال المهمة
-- =====================================================

CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_task_completed_at ON tasks;
CREATE TRIGGER trigger_set_task_completed_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_task_completed_at();
;
