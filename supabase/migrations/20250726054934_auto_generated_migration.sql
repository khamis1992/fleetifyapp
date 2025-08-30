-- إضافة جدول المدفوعات للمخالفات المرورية
CREATE TABLE public.traffic_violation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  traffic_violation_id UUID NOT NULL REFERENCES public.penalties(id) ON DELETE CASCADE,
  payment_number TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_type TEXT NOT NULL DEFAULT 'full', -- full, partial
  bank_account TEXT,
  check_number TEXT,
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- completed, pending, cancelled
  journal_entry_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- فهرس فريد لرقم الدفع لكل شركة
  UNIQUE(company_id, payment_number)
);

-- تفعيل Row Level Security
ALTER TABLE public.traffic_violation_payments ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "المستخدمون يمكنهم عرض مدفوعات المخالفات في شركتهم"
ON public.traffic_violation_payments
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "الموظفون يمكنهم إدارة مدفوعات المخالفات في شركتهم"
ON public.traffic_violation_payments
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::user_role) OR 
  (
    company_id = get_user_company(auth.uid()) AND 
    (
      has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)
    )
  )
);

-- إنشاء دالة لتوليد رقم الدفع
CREATE OR REPLACE FUNCTION generate_traffic_payment_number(company_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    payment_count INTEGER;
    payment_number TEXT;
BEGIN
    -- حساب عدد المدفوعات للشركة
    SELECT COUNT(*) INTO payment_count
    FROM public.traffic_violation_payments
    WHERE company_id = company_id_param;
    
    -- توليد رقم الدفع
    payment_number := 'TVP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((payment_count + 1)::TEXT, 6, '0');
    
    RETURN payment_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة trigger لتحديث updated_at
CREATE TRIGGER update_traffic_violation_payments_updated_at
  BEFORE UPDATE ON public.traffic_violation_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- دالة لتحديث حالة الدفع للمخالفة عند إضافة دفعة جديدة
CREATE OR REPLACE FUNCTION update_violation_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    violation_amount NUMERIC;
    total_paid NUMERIC;
    new_payment_status TEXT;
BEGIN
    -- الحصول على مبلغ المخالفة
    SELECT amount INTO violation_amount
    FROM public.penalties
    WHERE id = NEW.traffic_violation_id;
    
    -- حساب إجمالي المبلغ المدفوع
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.traffic_violation_payments
    WHERE traffic_violation_id = NEW.traffic_violation_id
    AND status = 'completed';
    
    -- تحديد حالة الدفع الجديدة
    IF total_paid >= violation_amount THEN
        new_payment_status := 'paid';
    ELSIF total_paid > 0 THEN
        new_payment_status := 'partially_paid';
    ELSE
        new_payment_status := 'unpaid';
    END IF;
    
    -- تحديث حالة الدفع في جدول المخالفات
    UPDATE public.penalties
    SET payment_status = new_payment_status,
        updated_at = now()
    WHERE id = NEW.traffic_violation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لتحديث حالة الدفع
CREATE TRIGGER update_violation_payment_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.traffic_violation_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_violation_payment_status();

-- إضافة دالة لإنشاء قيد محاسبي لدفع المخالفة
CREATE OR REPLACE FUNCTION create_traffic_payment_journal_entry(payment_id_param UUID)
RETURNS UUID AS $$
DECLARE
    payment_record RECORD;
    violation_record RECORD;
    journal_entry_id UUID;
    cash_account_id UUID;
    receivable_account_id UUID;
    penalties_cost_center_id UUID;
BEGIN
    -- الحصول على تفاصيل الدفع
    SELECT * INTO payment_record
    FROM public.traffic_violation_payments
    WHERE id = payment_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- الحصول على تفاصيل المخالفة
    SELECT * INTO violation_record
    FROM public.penalties
    WHERE id = payment_record.traffic_violation_id;
    
    -- الحصول على مركز تكلفة الغرامات والمخالفات
    SELECT id INTO penalties_cost_center_id
    FROM public.cost_centers
    WHERE company_id = payment_record.company_id
    AND center_code = 'PENALTIES_FINES'
    AND is_active = true
    LIMIT 1;
    
    -- في حالة عدم وجوده، استخدم مركز المبيعات
    IF penalties_cost_center_id IS NULL THEN
        SELECT id INTO penalties_cost_center_id
        FROM public.cost_centers
        WHERE company_id = payment_record.company_id
        AND center_code = 'SALES'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- العثور على الحسابات المطلوبة
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'assets'
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%bank%')
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO receivable_account_id
    FROM public.chart_of_accounts
    WHERE company_id = payment_record.company_id
    AND account_type = 'assets'
    AND account_name ILIKE '%receivable%'
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء القيد اليومي
    INSERT INTO public.journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_debit,
        total_credit,
        status,
        created_by
    ) VALUES (
        gen_random_uuid(),
        payment_record.company_id,
        generate_journal_entry_number(payment_record.company_id),
        payment_record.payment_date,
        'Traffic Violation Payment #' || payment_record.payment_number || ' - Penalty #' || violation_record.penalty_number,
        'traffic_payment',
        payment_record.id,
        payment_record.amount,
        payment_record.amount,
        'draft',
        payment_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد
    -- مدين: النقدية/البنك
    IF cash_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            cash_account_id,
            penalties_cost_center_id,
            1,
            'Cash received - Traffic Violation Payment #' || payment_record.payment_number,
            payment_record.amount,
            0
        );
    END IF;
    
    -- دائن: حسابات العملاء
    IF receivable_account_id IS NOT NULL THEN
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            cost_center_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_entry_id,
            receivable_account_id,
            penalties_cost_center_id,
            2,
            'Accounts Receivable - Traffic Violation Payment #' || payment_record.payment_number,
            0,
            payment_record.amount
        );
    END IF;
    
    -- تحديث الدفع بمرجع القيد
    UPDATE public.traffic_violation_payments
    SET journal_entry_id = journal_entry_id
    WHERE id = payment_id_param;
    
    RETURN journal_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- trigger لإنشاء القيد المحاسبي عند إكمال الدفع
CREATE OR REPLACE FUNCTION handle_traffic_payment_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء قيد محاسبي عند إكمال الدفع
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_traffic_payment_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status = 'completed' AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_traffic_payment_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_traffic_payment_changes_trigger
    BEFORE INSERT OR UPDATE ON public.traffic_violation_payments
    FOR EACH ROW
    EXECUTE FUNCTION handle_traffic_payment_changes();