-- Migration: Workflows System Tables
-- تاريخ: 2025-11-06
-- الوصف: إنشاء جداول نظام الموافقات (Workflows)

-- ============================================
-- 1. جدول Workflows الرئيسي
-- ============================================
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_step INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_workflows_company_id ON workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_entity ON workflows(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC);

-- ============================================
-- 2. جدول Workflow Templates
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditions JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_entity_type ON workflow_templates(entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_company_id ON workflow_templates(company_id);

-- ============================================
-- 3. جدول Workflow History (للأرشفة)
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES profiles(id),
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  step_number INTEGER,
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow_id ON workflow_history(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_performed_by ON workflow_history(performed_by);

-- ============================================
-- 4. Trigger: Update updated_at automatically
-- ============================================
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflows_updated_at_trigger
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflows_updated_at();

-- ============================================
-- 5. Function: Get pending approvals for user
-- ============================================
CREATE OR REPLACE FUNCTION get_pending_approvals_for_user(
  p_user_id UUID,
  p_user_roles TEXT[]
)
RETURNS TABLE(
  workflow_id UUID,
  entity_type VARCHAR(50),
  entity_id UUID,
  current_step INTEGER,
  step_name TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.entity_type,
    w.entity_id,
    w.current_step,
    (w.steps->w.current_step->>'name')::TEXT,
    w.created_at
  FROM workflows w
  WHERE w.status IN ('pending', 'in_progress')
    AND (
      (w.steps->w.current_step->>'approver_user_id')::UUID = p_user_id
      OR (w.steps->w.current_step->'approver_role' ?| p_user_roles)
    )
  ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- تعليقات على الجداول
-- ============================================
COMMENT ON TABLE workflows IS 'نظام الموافقات المركزي - يدير جميع workflows الموافقات';
COMMENT ON TABLE workflow_templates IS 'قوالب الموافقات المعدة مسبقاً';
COMMENT ON TABLE workflow_history IS 'سجل تاريخ الموافقات والإجراءات';

-- ============================================
-- نهاية Migration
-- ============================================

