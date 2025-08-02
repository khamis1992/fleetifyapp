-- إنشاء جدول العقود المعلقة لقيود اليومية فقط (بدون الجداول الأخرى)
CREATE TABLE IF NOT EXISTS public.pending_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  contract_id UUID NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'contract_activation',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT now() + INTERVAL '5 minutes',
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 5,
  
  CONSTRAINT fk_pending_journal_entries_company FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT fk_pending_journal_entries_contract FOREIGN KEY (contract_id) REFERENCES public.contracts(id)
);

-- إنشاء القيود للجدول الجديد
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'pending_journal_entries_status_check') THEN
    ALTER TABLE public.pending_journal_entries ADD CONSTRAINT pending_journal_entries_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
  END IF;
END $$;

-- إنشاء فهارس للجدول الجديد
CREATE INDEX IF NOT EXISTS idx_pending_journal_entries_status ON public.pending_journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_pending_journal_entries_next_retry ON public.pending_journal_entries(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_pending_journal_entries_company ON public.pending_journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_pending_journal_entries_contract ON public.pending_journal_entries(contract_id);

-- تمكين RLS على الجدول الجديد
ALTER TABLE public.pending_journal_entries ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للقيود المعلقة
DROP POLICY IF EXISTS "Users can view pending entries in their company" ON public.pending_journal_entries;
DROP POLICY IF EXISTS "Managers can manage pending entries in their company" ON public.pending_journal_entries;
CREATE POLICY "Users can view pending entries in their company" ON public.pending_journal_entries FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers can manage pending entries in their company" ON public.pending_journal_entries FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))));