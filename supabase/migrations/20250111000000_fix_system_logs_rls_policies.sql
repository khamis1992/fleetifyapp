-- =====================================================
-- Fix System Logs RLS Policies  
-- Created: 2025-01-11
-- Description: إضافة سياسات RLS لجدول system_logs لتمكين قراءة النشاطات الأخيرة
-- =====================================================

-- التأكد من تفعيل RLS على جدول system_logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- سياسة القراءة: السماح للمستخدمين بقراءة سجلات شركتهم فقط
-- =====================================================
DROP POLICY IF EXISTS "Users can view their company system logs" ON system_logs;

CREATE POLICY "Users can view their company system logs"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    -- السماح بقراءة السجلات للشركة المرتبطة بالمستخدم
    company_id IN (
      SELECT DISTINCT p.company_id
      FROM profiles p
      WHERE p.user_id = auth.uid()
    )
    OR
    -- السماح للمشرفين العامين بقراءة جميع السجلات
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );

-- =====================================================
-- سياسة الإدراج: السماح للنظام بإدراج السجلات
-- =====================================================
DROP POLICY IF EXISTS "System can insert system logs" ON system_logs;

CREATE POLICY "System can insert system logs"
  ON system_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- منع التحديث والحذف للحفاظ على سلامة السجلات
-- =====================================================
DROP POLICY IF EXISTS "System logs are immutable update" ON system_logs;
DROP POLICY IF EXISTS "System logs are immutable delete" ON system_logs;

CREATE POLICY "System logs are immutable update"
  ON system_logs
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "System logs are immutable delete"
  ON system_logs
  FOR DELETE
  TO authenticated
  USING (
    -- السماح للمشرفين العامين فقط بالحذف
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
  );

-- =====================================================
-- إضافة بيانات تجريبية للنشاطات (اختياري)
-- =====================================================

-- دالة لإنشاء بيانات تجريبية للنشاطات
CREATE OR REPLACE FUNCTION create_sample_system_logs(p_company_id UUID)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- الحصول على معرف مستخدم من الشركة
  SELECT user_id INTO v_user_id
  FROM profiles
  WHERE company_id = p_company_id
  LIMIT 1;

  -- إنشاء نشاطات تجريبية متنوعة
  INSERT INTO system_logs (company_id, user_id, level, category, action, message, created_at)
  VALUES
    -- نشاطات العقود
    (p_company_id, v_user_id, 'info', 'contracts', 'create', 'تم إنشاء عقد جديد', NOW() - INTERVAL '30 minutes'),
    (p_company_id, v_user_id, 'info', 'contracts', 'update', 'تم تحديث بيانات عقد', NOW() - INTERVAL '1 hour'),
    
    -- نشاطات العملاء
    (p_company_id, v_user_id, 'info', 'customers', 'create', 'تم تسجيل عميل جديد', NOW() - INTERVAL '2 hours'),
    (p_company_id, v_user_id, 'info', 'customers', 'update', 'تم تحديث بيانات عميل', NOW() - INTERVAL '3 hours'),
    
    -- نشاطات المركبات
    (p_company_id, v_user_id, 'info', 'fleet', 'create', 'تم إضافة مركبة جديدة للأسطول', NOW() - INTERVAL '4 hours'),
    (p_company_id, v_user_id, 'info', 'fleet', 'update', 'تم تحديث بيانات مركبة', NOW() - INTERVAL '5 hours'),
    
    -- نشاطات مالية
    (p_company_id, v_user_id, 'info', 'finance', 'create', 'تم تسجيل دفعة مالية جديدة', NOW() - INTERVAL '6 hours'),
    (p_company_id, v_user_id, 'warning', 'finance', 'update', 'تحذير: دفعة متأخرة', NOW() - INTERVAL '7 hours'),
    
    -- نشاطات الموارد البشرية
    (p_company_id, v_user_id, 'info', 'hr', 'create', 'تم إضافة موظف جديد', NOW() - INTERVAL '1 day'),
    (p_company_id, v_user_id, 'info', 'hr', 'update', 'تم تحديث بيانات موظف', NOW() - INTERVAL '2 days'),
    
    -- نشاطات النظام
    (p_company_id, v_user_id, 'info', 'system', 'login', 'تم تسجيل الدخول للنظام', NOW() - INTERVAL '15 minutes'),
    (p_company_id, v_user_id, 'error', 'system', 'export', 'فشل تصدير البيانات', NOW() - INTERVAL '3 days')
  ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- تعليق توضيحي
-- =====================================================
COMMENT ON TABLE system_logs IS 'جدول سجلات النظام لتتبع جميع العمليات والنشاطات';
COMMENT ON FUNCTION create_sample_system_logs IS 'دالة لإنشاء بيانات تجريبية للنشاطات - استخدمها مع معرف الشركة';

-- =====================================================
-- ملاحظة: لإنشاء بيانات تجريبية، قم بتشغيل:
-- SELECT create_sample_system_logs('company-uuid-here');
-- =====================================================



