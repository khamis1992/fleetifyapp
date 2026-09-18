-- =====================================================
-- Migration: Add Journal Entry Workflow System (Fixed)
-- =====================================================

-- 1. إضافة حقل updated_by أولاً
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 2. تحديث القيود المسموحة لحقل status
ALTER TABLE public.journal_entries 
DROP CONSTRAINT IF EXISTS journal_entries_status_check;

ALTER TABLE public.journal_entries 
ADD CONSTRAINT journal_entries_status_check 
CHECK (status IN ('draft', 'under_review', 'approved', 'posted', 'reversed', 'cancelled'));

-- 3. إضافة حقول جديدة للتتبع
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS workflow_notes TEXT;

-- 4. إنشاء جدول سجل التغييرات
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

-- 5. إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reviewed_by ON public.journal_entries(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_journal_entries_posted_by ON public.journal_entries(posted_by);
CREATE INDEX IF NOT EXISTS idx_journal_entry_status_history_entry_id ON public.journal_entry_status_history(journal_entry_id);

-- 6. إنشاء دالة لتسجيل تغييرات الحالة (مع التحقق من updated_by)
CREATE OR REPLACE FUNCTION log_journal_entry_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.updated_by IS NOT NULL THEN
        INSERT INTO public.journal_entry_status_history (
            journal_entry_id, from_status, to_status, changed_by, notes
        ) VALUES (
            NEW.id, OLD.status, NEW.status, NEW.updated_by, NEW.workflow_notes
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. إنشاء trigger
DROP TRIGGER IF EXISTS trg_journal_entry_status_change ON public.journal_entries;
CREATE TRIGGER trg_journal_entry_status_change
AFTER UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION log_journal_entry_status_change();

-- 8. تحديث القيود الموجودة
UPDATE public.journal_entries SET status = 'posted'
WHERE status = 'draft' AND id IN (SELECT DISTINCT journal_entry_id FROM public.journal_entry_lines);

-- 9. منح الصلاحيات
GRANT SELECT ON public.journal_entry_status_history TO authenticated;
GRANT INSERT ON public.journal_entry_status_history TO authenticated;;
