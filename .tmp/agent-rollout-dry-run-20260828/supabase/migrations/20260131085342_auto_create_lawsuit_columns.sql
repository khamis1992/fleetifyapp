-- Add columns for auto-created lawsuits
ALTER TABLE lawsuit_templates 
ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_task_id UUID REFERENCES customer_verification_tasks(id);

COMMENT ON COLUMN lawsuit_templates.auto_created IS 'تم إنشاء القضية تلقائياً عند التحقق من العميل';
COMMENT ON COLUMN lawsuit_templates.verification_task_id IS 'معرف مهمة التحقق المرتبطة';;
