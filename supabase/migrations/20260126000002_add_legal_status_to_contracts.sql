-- إضافة حقل legal_status لجدول العقود
-- هذا الحقل يسمح بتتبع الحالة القانونية للعقد بشكل منفصل عن حالته الأصلية

-- إضافة العمود
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS legal_status TEXT DEFAULT NULL;

-- إضافة قيد للتحقق من القيم المسموح بها
ALTER TABLE contracts
ADD CONSTRAINT check_legal_status 
CHECK (legal_status IS NULL OR legal_status IN ('under_legal_action', 'legal_case_filed', 'in_court', 'judgment_issued', 'execution_phase', 'settled', 'closed'));

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_contracts_legal_status 
ON contracts(legal_status) 
WHERE legal_status IS NOT NULL;

-- إنشاء فهرس مركب للبحث السريع
CREATE INDEX IF NOT EXISTS idx_contracts_status_legal_status 
ON contracts(status, legal_status) 
WHERE legal_status IS NOT NULL;

-- تحديث العقود الموجودة التي حالتها "under_legal_procedure" 
-- لتحويلها إلى الحالة الجديدة
UPDATE contracts 
SET 
  legal_status = 'under_legal_action',
  status = CASE 
    WHEN status = 'under_legal_procedure' THEN 'active'  -- افتراضياً نرجعها لـ active
    ELSE status 
  END
WHERE status = 'under_legal_procedure';

-- إضافة تعليق توضيحي
COMMENT ON COLUMN contracts.legal_status IS 'الحالة القانونية للعقد (منفصلة عن الحالة الأصلية): under_legal_action, legal_case_filed, in_court, judgment_issued, execution_phase, settled, closed';
