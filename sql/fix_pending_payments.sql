-- إصلاح المدفوعات المعلقة - تحديث حالة المعالجة والتوزيع
-- Script to fix pending payments that cannot be linked

-- 1. تحديث المدفوعات التي لديها عقود لكن حالة المعالجة معلقة
UPDATE public.payments 
SET 
  processing_status = 'completed',
  allocation_status = 'fully_allocated',
  linking_confidence = 0.8,
  processing_notes = 'إصلاح تلقائي - المدفوعة مربوطة بعقد',
  updated_at = now()
WHERE 
  contract_id IS NOT NULL 
  AND processing_status = 'pending'
  AND allocation_status = 'unallocated';

-- 2. تحديث المدفوعات التي لديها عملاء لكن بدون عقود
UPDATE public.payments 
SET 
  processing_status = 'pending',
  allocation_status = 'unallocated', 
  linking_confidence = 0.3,
  processing_notes = 'يحتاج ربط بعقد - عميل محدد',
  updated_at = now()
WHERE 
  customer_id IS NOT NULL 
  AND contract_id IS NULL 
  AND processing_status = 'completed';

-- 3. تحديث المدفوعات غير المربوطة بأي شيء
UPDATE public.payments 
SET 
  processing_status = 'pending',
  allocation_status = 'unallocated',
  linking_confidence = 0.1,
  processing_notes = 'يحتاج ربط يدوي - لا توجد بيانات ربط',
  updated_at = now()
WHERE 
  customer_id IS NULL 
  AND contract_id IS NULL 
  AND (processing_status != 'pending' OR allocation_status != 'unallocated');

-- 4. إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_payments_processing_status 
ON public.payments(company_id, processing_status);

CREATE INDEX IF NOT EXISTS idx_payments_allocation_status 
ON public.payments(company_id, allocation_status);

CREATE INDEX IF NOT EXISTS idx_payments_linking_confidence 
ON public.payments(company_id, linking_confidence);

-- 5. دالة لإعادة معالجة المدفوعات المعلقة
CREATE OR REPLACE FUNCTION fix_pending_payments(target_company_id UUID DEFAULT NULL)
RETURNS TABLE (
  payment_id UUID,
  payment_number TEXT,
  old_status TEXT,
  new_status TEXT,
  action_taken TEXT
) AS $$
DECLARE
  payment_record RECORD;
  potential_contract RECORD;
  confidence_score NUMERIC;
BEGIN
  -- معالجة جميع المدفوعات المعلقة للشركة المحددة أو جميع الشركات
  FOR payment_record IN 
    SELECT p.*
    FROM public.payments p
    WHERE (target_company_id IS NULL OR p.company_id = target_company_id)
      AND p.processing_status = 'pending'
      AND p.allocation_status = 'unallocated'
  LOOP
    -- محاولة العثور على عقد مطابق
    confidence_score := 0;
    potential_contract := NULL;
    
    -- البحث برقم الاتفاقية
    IF payment_record.agreement_number IS NOT NULL THEN
      SELECT c.* INTO potential_contract
      FROM public.contracts c
      WHERE c.company_id = payment_record.company_id
        AND c.status = 'active'
        AND c.contract_number ILIKE '%' || payment_record.agreement_number || '%'
      LIMIT 1;
      
      IF potential_contract IS NOT NULL THEN
        confidence_score := 0.9;
      END IF;
    END IF;
    
    -- البحث بالعميل والمبلغ
    IF potential_contract IS NULL AND payment_record.customer_id IS NOT NULL THEN
      SELECT c.* INTO potential_contract
      FROM public.contracts c
      WHERE c.company_id = payment_record.company_id
        AND c.customer_id = payment_record.customer_id
        AND c.status = 'active'
        AND c.balance_due >= payment_record.amount * 0.8
        AND c.balance_due <= payment_record.amount * 1.2
      ORDER BY ABS(c.monthly_amount - payment_record.amount)
      LIMIT 1;
      
      IF potential_contract IS NOT NULL THEN
        confidence_score := 0.7;
      END IF;
    END IF;
    
    -- تطبيق الإصلاح
    IF potential_contract IS NOT NULL THEN
      -- ربط بالعقد
      UPDATE public.payments 
      SET 
        contract_id = potential_contract.id,
        customer_id = potential_contract.customer_id,
        processing_status = 'completed',
        allocation_status = 'fully_allocated',
        linking_confidence = confidence_score,
        processing_notes = 'إصلاح تلقائي - ربط ذكي بالعقد',
        updated_at = now()
      WHERE id = payment_record.id;
      
      RETURN QUERY SELECT 
        payment_record.id,
        payment_record.payment_number,
        'pending'::TEXT,
        'completed'::TEXT,
        'ربط تلقائي بالعقد'::TEXT;
    ELSE
      -- تحديث كحالة تحتاج مراجعة يدوية
      UPDATE public.payments 
      SET 
        processing_notes = 'يحتاج مراجعة يدوية - لا توجد مطابقات تلقائية',
        linking_confidence = 0.1,
        updated_at = now()
      WHERE id = payment_record.id;
      
      RETURN QUERY SELECT 
        payment_record.id,
        payment_record.payment_number,
        'pending'::TEXT,
        'pending'::TEXT,
        'يحتاج مراجعة يدوية'::TEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. دالة لإحصائيات المدفوعات المعلقة
CREATE OR REPLACE FUNCTION get_pending_payments_stats(target_company_id UUID)
RETURNS TABLE (
  total_pending INTEGER,
  unlinked_with_customer INTEGER,
  unlinked_without_customer INTEGER,
  low_confidence INTEGER,
  needs_manual_review INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_pending,
    COUNT(CASE WHEN customer_id IS NOT NULL AND contract_id IS NULL THEN 1 END)::INTEGER AS unlinked_with_customer,
    COUNT(CASE WHEN customer_id IS NULL AND contract_id IS NULL THEN 1 END)::INTEGER AS unlinked_without_customer,
    COUNT(CASE WHEN linking_confidence < 0.5 THEN 1 END)::INTEGER AS low_confidence,
    COUNT(CASE WHEN processing_status = 'pending' AND allocation_status = 'unallocated' THEN 1 END)::INTEGER AS needs_manual_review
  FROM public.payments
  WHERE company_id = target_company_id
    AND (processing_status = 'pending' OR allocation_status = 'unallocated' OR linking_confidence < 0.5);
END;
$$ LANGUAGE plpgsql;

-- تعليقات للجداول والحقول
COMMENT ON COLUMN public.payments.processing_status IS 'حالة معالجة المدفوعة: pending (معلق), processing (جاري المعالجة), completed (مكتمل), failed (فشل)';
COMMENT ON COLUMN public.payments.allocation_status IS 'حالة توزيع المدفوعة: unallocated (غير موزع), partially_allocated (موزع جزئياً), fully_allocated (موزع كلياً)';
COMMENT ON COLUMN public.payments.linking_confidence IS 'مستوى الثقة في ربط المدفوعة (0-1): أقل من 0.5 يحتاج مراجعة يدوية';
COMMENT ON COLUMN public.payments.processing_notes IS 'ملاحظات المعالجة والربط';

-- مثال على الاستخدام:
-- SELECT * FROM fix_pending_payments('your-company-id-here');
-- SELECT * FROM get_pending_payments_stats('your-company-id-here');