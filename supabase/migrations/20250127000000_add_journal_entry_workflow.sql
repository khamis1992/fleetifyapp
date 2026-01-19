-- =====================================================
-- Migration: Add Journal Entry Workflow System
-- إضافة نظام مراحل القيود المحاسبية
-- Date: 2025-01-27
-- =====================================================

-- 1. تحديث القيود المسموحة لحقل status
-- Update allowed status values
ALTER TABLE public.journal_entries 
DROP CONSTRAINT IF EXISTS journal_entries_status_check;

ALTER TABLE public.journal_entries 
ADD CONSTRAINT journal_entries_status_check 
CHECK (status IN ('draft', 'under_review', 'approved', 'posted', 'reversed', 'cancelled'));

-- 2. إضافة حقول جديدة للتتبع
-- Add new tracking fields
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS workflow_notes TEXT;

-- 3. إنشاء جدول سجل التغييرات (Audit Trail)
-- Create journal entry status history table
CREATE TABLE IF NOT EXISTS public.journal_entry_status_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. إنشاء فهارس لتحسين الأداء
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_status 
ON public.journal_entries(status);

CREATE INDEX IF NOT EXISTS idx_journal_entries_reviewed_by 
ON public.journal_entries(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_journal_entries_posted_by 
ON public.journal_entries(posted_by);

CREATE INDEX IF NOT EXISTS idx_journal_entry_status_history_entry_id 
ON public.journal_entry_status_history(journal_entry_id);

CREATE INDEX IF NOT EXISTS idx_journal_entry_status_history_changed_by 
ON public.journal_entry_status_history(changed_by);

-- 5. إنشاء دالة لتسجيل تغييرات الحالة
-- Create function to log status changes
CREATE OR REPLACE FUNCTION log_journal_entry_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- فقط إذا تغيرت الحالة ويوجد مستخدم قام بالتحديث
    -- Only if status changed and there's a user who made the update
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.updated_by IS NOT NULL THEN
        INSERT INTO public.journal_entry_status_history (
            journal_entry_id,
            from_status,
            to_status,
            changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.updated_by,
            NEW.workflow_notes
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. إضافة حقل updated_by إذا لم يكن موجوداً
-- Add updated_by field if not exists
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 7. إنشاء trigger لتسجيل تغييرات الحالة
-- Create trigger for logging status changes
DROP TRIGGER IF EXISTS trg_journal_entry_status_change ON public.journal_entries;

CREATE TRIGGER trg_journal_entry_status_change
AFTER UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION log_journal_entry_status_change();

-- 8. إنشاء دالة للانتقال بين المراحل
-- Create function for workflow transitions
CREATE OR REPLACE FUNCTION change_journal_entry_status(
    p_entry_id UUID,
    p_new_status TEXT,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_current_status TEXT;
    v_valid_transition BOOLEAN := FALSE;
BEGIN
    -- الحصول على الحالة الحالية
    -- Get current status
    SELECT status INTO v_current_status
    FROM public.journal_entries
    WHERE id = p_entry_id;

    IF v_current_status IS NULL THEN
        RETURN QUERY SELECT FALSE, 'القيد غير موجود'::TEXT;
        RETURN;
    END IF;

    -- التحقق من صحة الانتقال
    -- Validate transition
    CASE v_current_status
        WHEN 'draft' THEN
            v_valid_transition := p_new_status IN ('under_review', 'cancelled');
        WHEN 'under_review' THEN
            v_valid_transition := p_new_status IN ('approved', 'draft', 'cancelled');
        WHEN 'approved' THEN
            v_valid_transition := p_new_status IN ('posted', 'under_review', 'cancelled');
        WHEN 'posted' THEN
            v_valid_transition := p_new_status IN ('reversed');
        ELSE
            v_valid_transition := FALSE;
    END CASE;

    IF NOT v_valid_transition THEN
        RETURN QUERY SELECT FALSE, 
            format('لا يمكن الانتقال من %s إلى %s', v_current_status, p_new_status)::TEXT;
        RETURN;
    END IF;

    -- تحديث الحالة
    -- Update status
    UPDATE public.journal_entries
    SET 
        status = p_new_status,
        updated_by = p_user_id,
        updated_at = now(),
        workflow_notes = p_notes,
        reviewed_by = CASE WHEN p_new_status = 'approved' THEN p_user_id ELSE reviewed_by END,
        reviewed_at = CASE WHEN p_new_status = 'approved' THEN now() ELSE reviewed_at END,
        posted_by = CASE WHEN p_new_status = 'posted' THEN p_user_id ELSE posted_by END,
        posted_at = CASE WHEN p_new_status = 'posted' THEN now() ELSE posted_at END,
        approved_by = CASE WHEN p_new_status = 'approved' THEN p_user_id ELSE approved_by END,
        approved_at = CASE WHEN p_new_status = 'approved' THEN now() ELSE approved_at END
    WHERE id = p_entry_id;

    RETURN QUERY SELECT TRUE, 'تم تغيير الحالة بنجاح'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. تحديث القيود الموجودة
-- Update existing entries (set 'draft' entries that have been used to 'posted')
UPDATE public.journal_entries
SET status = 'posted'
WHERE status = 'draft'
AND id IN (
    SELECT DISTINCT journal_entry_id
    FROM public.journal_entry_lines
);

-- 10. إضافة تعليقات على الجداول والأعمدة
-- Add comments
COMMENT ON COLUMN public.journal_entries.status IS 'حالة القيد: draft=مسودة, under_review=قيد المراجعة, approved=معتمد, posted=مرحل, reversed=معكوس, cancelled=ملغي';
COMMENT ON COLUMN public.journal_entries.reviewed_by IS 'المستخدم الذي راجع القيد';
COMMENT ON COLUMN public.journal_entries.reviewed_at IS 'تاريخ ووقت المراجعة';
COMMENT ON COLUMN public.journal_entries.posted_by IS 'المستخدم الذي رحّل القيد';
COMMENT ON COLUMN public.journal_entries.posted_at IS 'تاريخ ووقت الترحيل';
COMMENT ON COLUMN public.journal_entries.workflow_notes IS 'ملاحظات حول تغيير الحالة';
COMMENT ON TABLE public.journal_entry_status_history IS 'سجل تغييرات حالة القيود المحاسبية';

-- 11. منح الصلاحيات
-- Grant permissions
GRANT SELECT ON public.journal_entry_status_history TO authenticated;
GRANT INSERT ON public.journal_entry_status_history TO authenticated;
GRANT EXECUTE ON FUNCTION change_journal_entry_status TO authenticated;

-- =====================================================
-- Migration completed successfully
-- اكتملت عملية الترحيل بنجاح
-- =====================================================

