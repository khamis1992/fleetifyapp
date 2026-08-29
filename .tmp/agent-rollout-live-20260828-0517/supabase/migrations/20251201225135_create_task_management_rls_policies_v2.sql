
-- =====================================================
-- RLS Policies لنظام إدارة المهام (النسخة المصححة)
-- =====================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- دالة مساعدة للتحقق من صلاحيات المدير
-- =====================================================

CREATE OR REPLACE FUNCTION is_company_manager(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND company_id = p_company_id 
        AND role IN ('admin', 'manager', 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على company_id الخاص بالمستخدم
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
        UNION
        SELECT company_id FROM employees WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- سياسات جدول المهام (tasks)
-- =====================================================

-- المستخدم يمكنه رؤية المهام في شركته
DROP POLICY IF EXISTS "users_can_view_company_tasks" ON tasks;
CREATE POLICY "users_can_view_company_tasks" ON tasks
    FOR SELECT
    USING (company_id = get_user_company_id());

-- المستخدم يمكنه إنشاء مهام في شركته
DROP POLICY IF EXISTS "users_can_create_tasks" ON tasks;
CREATE POLICY "users_can_create_tasks" ON tasks
    FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id()
        AND created_by = auth.uid()
    );

-- المستخدم يمكنه تحديث المهام المسندة إليه أو التي أنشأها أو إذا كان مدير
DROP POLICY IF EXISTS "users_can_update_tasks" ON tasks;
CREATE POLICY "users_can_update_tasks" ON tasks
    FOR UPDATE
    USING (
        created_by = auth.uid() 
        OR assigned_to = auth.uid()
        OR is_company_manager(company_id)
    );

-- فقط المنشئ أو المدير يمكنه حذف المهام
DROP POLICY IF EXISTS "users_can_delete_tasks" ON tasks;
CREATE POLICY "users_can_delete_tasks" ON tasks
    FOR DELETE
    USING (
        created_by = auth.uid()
        OR is_company_manager(company_id)
    );

-- =====================================================
-- سياسات جدول التعليقات (task_comments)
-- =====================================================

DROP POLICY IF EXISTS "users_can_view_task_comments" ON task_comments;
CREATE POLICY "users_can_view_task_comments" ON task_comments
    FOR SELECT
    USING (
        task_id IN (SELECT id FROM tasks WHERE company_id = get_user_company_id())
    );

DROP POLICY IF EXISTS "users_can_create_comments" ON task_comments;
CREATE POLICY "users_can_create_comments" ON task_comments
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND task_id IN (SELECT id FROM tasks WHERE company_id = get_user_company_id())
    );

DROP POLICY IF EXISTS "users_can_update_own_comments" ON task_comments;
CREATE POLICY "users_can_update_own_comments" ON task_comments
    FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_delete_own_comments" ON task_comments;
CREATE POLICY "users_can_delete_own_comments" ON task_comments
    FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================
-- سياسات سجل النشاط (task_activity_log)
-- =====================================================

DROP POLICY IF EXISTS "users_can_view_activity_log" ON task_activity_log;
CREATE POLICY "users_can_view_activity_log" ON task_activity_log
    FOR SELECT
    USING (
        task_id IN (SELECT id FROM tasks WHERE company_id = get_user_company_id())
    );

-- السماح بالإدراج من triggers والنظام
DROP POLICY IF EXISTS "system_can_insert_activity_log" ON task_activity_log;
CREATE POLICY "system_can_insert_activity_log" ON task_activity_log
    FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- سياسات التنبيهات (task_notifications)
-- =====================================================

DROP POLICY IF EXISTS "users_can_view_own_notifications" ON task_notifications;
CREATE POLICY "users_can_view_own_notifications" ON task_notifications
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_update_own_notifications" ON task_notifications;
CREATE POLICY "users_can_update_own_notifications" ON task_notifications
    FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "system_can_insert_notifications" ON task_notifications;
CREATE POLICY "system_can_insert_notifications" ON task_notifications
    FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- سياسات القوالب (task_templates)
-- =====================================================

DROP POLICY IF EXISTS "users_can_view_company_templates" ON task_templates;
CREATE POLICY "users_can_view_company_templates" ON task_templates
    FOR SELECT
    USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "managers_can_create_templates" ON task_templates;
CREATE POLICY "managers_can_create_templates" ON task_templates
    FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id()
        AND is_company_manager(company_id)
    );

DROP POLICY IF EXISTS "managers_can_update_templates" ON task_templates;
CREATE POLICY "managers_can_update_templates" ON task_templates
    FOR UPDATE
    USING (is_company_manager(company_id));

DROP POLICY IF EXISTS "managers_can_delete_templates" ON task_templates;
CREATE POLICY "managers_can_delete_templates" ON task_templates
    FOR DELETE
    USING (is_company_manager(company_id));

-- =====================================================
-- سياسات قوائم التحقق (task_checklists)
-- =====================================================

DROP POLICY IF EXISTS "users_can_view_task_checklists" ON task_checklists;
CREATE POLICY "users_can_view_task_checklists" ON task_checklists
    FOR SELECT
    USING (
        task_id IN (SELECT id FROM tasks WHERE company_id = get_user_company_id())
    );

DROP POLICY IF EXISTS "users_can_create_checklists" ON task_checklists;
CREATE POLICY "users_can_create_checklists" ON task_checklists
    FOR INSERT
    WITH CHECK (
        task_id IN (
            SELECT id FROM tasks 
            WHERE created_by = auth.uid() 
               OR assigned_to = auth.uid()
               OR is_company_manager(company_id)
        )
    );

DROP POLICY IF EXISTS "users_can_update_checklists" ON task_checklists;
CREATE POLICY "users_can_update_checklists" ON task_checklists
    FOR UPDATE
    USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE created_by = auth.uid() 
               OR assigned_to = auth.uid()
               OR is_company_manager(company_id)
        )
    );

DROP POLICY IF EXISTS "users_can_delete_checklists" ON task_checklists;
CREATE POLICY "users_can_delete_checklists" ON task_checklists
    FOR DELETE
    USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE created_by = auth.uid() 
               OR is_company_manager(company_id)
        )
    );
;
