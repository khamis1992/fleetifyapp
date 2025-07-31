-- تحديث حالة القيود المحاسبية من draft إلى posted
UPDATE public.journal_entries 
SET status = 'posted' 
WHERE status = 'draft';