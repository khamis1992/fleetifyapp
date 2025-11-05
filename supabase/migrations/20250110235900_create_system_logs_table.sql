-- =====================================================
-- Create System Logs Table
-- Created: 2025-01-10
-- Description: جدول لتسجيل جميع النشاطات والعمليات في النظام
-- =====================================================

-- إنشاء جدول system_logs إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warning', 'error', 'debug')),
  category VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  message TEXT NOT NULL,
  metadata JSONB,
  duration_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_system_logs_company_id ON system_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_resource ON system_logs(resource_type, resource_id);

-- إنشاء فهرس مركب للاستعلامات الشائعة
CREATE INDEX IF NOT EXISTS idx_system_logs_company_created 
  ON system_logs(company_id, created_at DESC);

-- تعليقات توضيحية
COMMENT ON TABLE system_logs IS 'سجل شامل لجميع النشاطات والعمليات في النظام';
COMMENT ON COLUMN system_logs.level IS 'مستوى الخطورة: info, warning, error, debug';
COMMENT ON COLUMN system_logs.category IS 'تصنيف النشاط: contracts, customers, fleet, hr, finance, system';
COMMENT ON COLUMN system_logs.action IS 'نوع العملية: create, update, delete, view, search';
COMMENT ON COLUMN system_logs.resource_type IS 'نوع المورد المتأثر بالعملية';
COMMENT ON COLUMN system_logs.resource_id IS 'معرف المورد المتأثر بالعملية';
COMMENT ON COLUMN system_logs.message IS 'وصف النشاط بشكل مفصل';
COMMENT ON COLUMN system_logs.metadata IS 'بيانات إضافية بصيغة JSON';
COMMENT ON COLUMN system_logs.duration_ms IS 'مدة تنفيذ العملية بالميلي ثانية';



