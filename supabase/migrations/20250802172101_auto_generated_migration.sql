-- =================================================================
-- تطوير نظام الموردين المتقدم
-- تاريخ الإنشاء: 2 أغسطس 2025
-- الهدف: إضافة التكامل المحاسبي وتتبع المشتريات والمدفوعات
-- =================================================================

-- =====================================================
-- 1. جدول ربط الموردين بالحسابات المحاسبية
-- =====================================================

CREATE TABLE public.vendor_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    vendor_id UUID NOT NULL,
    account_id UUID NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'payable',
    is_default BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(vendor_id, account_type)
);

-- =====================================================
-- 2. جدول أوامر الشراء
-- =====================================================

CREATE TABLE public.purchase_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    vendor_id UUID NOT NULL,
    order_number TEXT NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'draft',
    subtotal NUMERIC(15,3) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15,3) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,3) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'KWD',
    notes TEXT,
    terms_and_conditions TEXT,
    delivery_address TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, order_number)
);

-- =====================================================
-- 3. جدول عناصر أوامر الشراء
-- =====================================================

CREATE TABLE public.purchase_order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID NOT NULL,
    item_code TEXT,
    description TEXT NOT NULL,
    description_ar TEXT,
    quantity NUMERIC(15,3) NOT NULL DEFAULT 1,
    unit_price NUMERIC(15,3) NOT NULL DEFAULT 0,
    total_price NUMERIC(15,3) NOT NULL DEFAULT 0,
    unit_of_measure TEXT DEFAULT 'PCS',
    received_quantity NUMERIC(15,3) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. جدول مدفوعات الموردين
-- =====================================================

CREATE TABLE public.vendor_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    vendor_id UUID NOT NULL,
    payment_number TEXT NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(15,3) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'KWD',
    payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
    reference_number TEXT,
    description TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    bank_id UUID,
    journal_entry_id UUID,
    purchase_order_id UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, payment_number)
);

-- =====================================================
-- 5. جدول استلام البضائع
-- =====================================================

CREATE TABLE public.goods_receipts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    purchase_order_id UUID NOT NULL,
    receipt_number TEXT NOT NULL,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID NOT NULL,
    delivery_note_number TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, receipt_number)
);

-- =====================================================
-- 6. جدول عناصر استلام البضائع
-- =====================================================

CREATE TABLE public.goods_receipt_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    goods_receipt_id UUID NOT NULL,
    purchase_order_item_id UUID NOT NULL,
    received_quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 7. إنشاء الفهارس
-- =====================================================

-- فهارس vendor_accounts
CREATE INDEX idx_vendor_accounts_company_id ON public.vendor_accounts(company_id);
CREATE INDEX idx_vendor_accounts_vendor_id ON public.vendor_accounts(vendor_id);
CREATE INDEX idx_vendor_accounts_account_id ON public.vendor_accounts(account_id);

-- فهارس purchase_orders
CREATE INDEX idx_purchase_orders_company_id ON public.purchase_orders(company_id);
CREATE INDEX idx_purchase_orders_vendor_id ON public.purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_orders_order_date ON public.purchase_orders(order_date);
CREATE INDEX idx_purchase_orders_created_by ON public.purchase_orders(created_by);

-- فهارس purchase_order_items
CREATE INDEX idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);

-- فهارس vendor_payments
CREATE INDEX idx_vendor_payments_company_id ON public.vendor_payments(company_id);
CREATE INDEX idx_vendor_payments_vendor_id ON public.vendor_payments(vendor_id);
CREATE INDEX idx_vendor_payments_payment_date ON public.vendor_payments(payment_date);
CREATE INDEX idx_vendor_payments_status ON public.vendor_payments(status);

-- فهارس goods_receipts
CREATE INDEX idx_goods_receipts_company_id ON public.goods_receipts(company_id);
CREATE INDEX idx_goods_receipts_po_id ON public.goods_receipts(purchase_order_id);
CREATE INDEX idx_goods_receipts_receipt_date ON public.goods_receipts(receipt_date);

-- فهارس goods_receipt_items
CREATE INDEX idx_goods_receipt_items_receipt_id ON public.goods_receipt_items(goods_receipt_id);
CREATE INDEX idx_goods_receipt_items_po_item_id ON public.goods_receipt_items(purchase_order_item_id);

-- =====================================================
-- 8. تمكين Row Level Security
-- =====================================================

ALTER TABLE public.vendor_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. إنشاء سياسات الأمان (RLS Policies)
-- =====================================================

-- سياسات vendor_accounts
CREATE POLICY "المديرون يمكنهم إدارة حسابات الموردين في شركتهم"
ON public.vendor_accounts FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض حسابات الموردين في شركتهم"
ON public.vendor_accounts FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- سياسات purchase_orders
CREATE POLICY "المديرون يمكنهم إدارة أوامر الشراء في شركتهم"
ON public.purchase_orders FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض أوامر الشراء في شركتهم"
ON public.purchase_orders FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- سياسات purchase_order_items
CREATE POLICY "المستخدمون يمكنهم إدارة عناصر أوامر الشراء"
ON public.purchase_order_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
        AND po.company_id = get_user_company(auth.uid())
        AND (has_role(auth.uid(), 'super_admin'::user_role) OR 
             has_role(auth.uid(), 'company_admin'::user_role) OR 
             has_role(auth.uid(), 'manager'::user_role) OR
             has_role(auth.uid(), 'sales_agent'::user_role))
    )
);

CREATE POLICY "المستخدمون يمكنهم عرض عناصر أوامر الشراء في شركتهم"
ON public.purchase_order_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
        AND po.company_id = get_user_company(auth.uid())
    )
);

-- سياسات vendor_payments
CREATE POLICY "المديرون يمكنهم إدارة مدفوعات الموردين في شركتهم"
ON public.vendor_payments FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض مدفوعات الموردين في شركتهم"
ON public.vendor_payments FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- سياسات goods_receipts
CREATE POLICY "المديرون يمكنهم إدارة استلام البضائع في شركتهم"
ON public.goods_receipts FOR ALL
TO authenticated
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

CREATE POLICY "المستخدمون يمكنهم عرض استلام البضائع في شركتهم"
ON public.goods_receipts FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- سياسات goods_receipt_items
CREATE POLICY "المستخدمون يمكنهم إدارة عناصر استلام البضائع"
ON public.goods_receipt_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.goods_receipts gr
        WHERE gr.id = goods_receipt_items.goods_receipt_id
        AND gr.company_id = get_user_company(auth.uid())
        AND (has_role(auth.uid(), 'super_admin'::user_role) OR 
             has_role(auth.uid(), 'company_admin'::user_role) OR 
             has_role(auth.uid(), 'manager'::user_role) OR
             has_role(auth.uid(), 'sales_agent'::user_role))
    )
);

CREATE POLICY "المستخدمون يمكنهم عرض عناصر استلام البضائع في شركتهم"
ON public.goods_receipt_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.goods_receipts gr
        WHERE gr.id = goods_receipt_items.goods_receipt_id
        AND gr.company_id = get_user_company(auth.uid())
    )
);

-- =====================================================
-- 10. إنشاء دوال مساعدة
-- =====================================================

-- دالة إنشاء حساب مورد تلقائياً
CREATE OR REPLACE FUNCTION public.create_vendor_financial_account(
    vendor_id_param UUID,
    company_id_param UUID,
    vendor_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_id UUID;
    parent_account_id UUID;
    vendor_name TEXT;
    account_code TEXT;
    account_sequence INTEGER;
BEGIN
    -- البحث عن الحساب الأب للدائنين (المورديين)
    SELECT id INTO parent_account_id
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'liabilities'
    AND (account_name ILIKE '%payable%' 
         OR account_name ILIKE '%دائن%' 
         OR account_name ILIKE '%مورد%'
         OR account_code LIKE '21%')
    AND is_active = true
    ORDER BY account_code
    LIMIT 1;
    
    -- إذا لم يتم العثور على حساب الدائنين، قم بإنشاء واحد
    IF parent_account_id IS NULL THEN
        INSERT INTO public.chart_of_accounts (
            id,
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            balance_type,
            is_header,
            is_active,
            account_level,
            current_balance
        ) VALUES (
            gen_random_uuid(),
            company_id_param,
            '2110',
            'Trade Payables - Local',
            'ذمم الموردين المحلية',
            'liabilities',
            'credit',
            true,
            true,
            2,
            0
        ) RETURNING id INTO parent_account_id;
    END IF;
    
    -- إنشاء اسم الحساب
    IF vendor_data IS NOT NULL THEN
        vendor_name := COALESCE(vendor_data->>'vendor_name', 'Vendor');
    ELSE
        vendor_name := 'Vendor Account';
    END IF;
    
    -- إنشاء رقم تسلسلي للحساب
    SELECT COALESCE(MAX(CAST(SUBSTRING(account_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO account_sequence
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND parent_account_id = parent_account_id
    AND account_code ~ '^211[0-9]-[0-9]+$';
    
    -- إنشاء رمز الحساب
    account_code := '2111-' || LPAD(account_sequence::text, 4, '0');
    
    -- إنشاء الحساب
    INSERT INTO public.chart_of_accounts (
        id,
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        balance_type,
        parent_account_id,
        is_header,
        is_active,
        account_level,
        current_balance,
        description
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        account_code,
        vendor_name,
        vendor_name,
        'liabilities',
        'credit',
        parent_account_id,
        false,
        true,
        3,
        0,
        'Vendor account for: ' || vendor_name
    ) RETURNING id INTO account_id;
    
    -- ربط الحساب بالمورد
    INSERT INTO public.vendor_accounts (
        id,
        company_id,
        vendor_id,
        account_id,
        account_type,
        is_default
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        vendor_id_param,
        account_id,
        'payable',
        true
    );
    
    RETURN account_id;
END;
$$;

-- دالة توليد رقم أمر الشراء
CREATE OR REPLACE FUNCTION public.generate_purchase_order_number(company_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    order_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- الحصول على السنة الحالية
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- عد أوامر الشراء الموجودة للشركة في السنة الحالية
    SELECT COUNT(*) + 1 INTO order_count
    FROM public.purchase_orders 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إرجاع رقم أمر الشراء المنسق
    RETURN 'PO-' || year_suffix || '-' || LPAD(order_count::TEXT, 4, '0');
END;
$$;

-- دالة توليد رقم دفع المورد
CREATE OR REPLACE FUNCTION public.generate_vendor_payment_number(company_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    payment_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- الحصول على السنة الحالية
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- عد المدفوعات الموجودة للشركة في السنة الحالية
    SELECT COUNT(*) + 1 INTO payment_count
    FROM public.vendor_payments 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إرجاع رقم الدفعة المنسق
    RETURN 'VP-' || year_suffix || '-' || LPAD(payment_count::TEXT, 4, '0');
END;
$$;

-- دالة توليد رقم استلام البضائع
CREATE OR REPLACE FUNCTION public.generate_goods_receipt_number(company_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    receipt_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- الحصول على السنة الحالية
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- عد إيصالات الاستلام الموجودة للشركة في السنة الحالية
    SELECT COUNT(*) + 1 INTO receipt_count
    FROM public.goods_receipts 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM receipt_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إرجاع رقم إيصال الاستلام المنسق
    RETURN 'GR-' || year_suffix || '-' || LPAD(receipt_count::TEXT, 4, '0');
END;
$$;

-- =====================================================
-- 11. إنشاء triggers لتحديث التواريخ
-- =====================================================

-- دالة تحديث updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء triggers
CREATE TRIGGER update_vendor_accounts_updated_at
    BEFORE UPDATE ON public.vendor_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_order_items_updated_at
    BEFORE UPDATE ON public.purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_payments_updated_at
    BEFORE UPDATE ON public.vendor_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goods_receipts_updated_at
    BEFORE UPDATE ON public.goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 12. رسائل التأكيد
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== تم إكمال تطوير نظام الموردين المتقدم ===';
    RAISE NOTICE 'الجداول المنشأة:';
    RAISE NOTICE '1. vendor_accounts - ربط الموردين بالحسابات المحاسبية';
    RAISE NOTICE '2. purchase_orders - أوامر الشراء';
    RAISE NOTICE '3. purchase_order_items - عناصر أوامر الشراء';
    RAISE NOTICE '4. vendor_payments - مدفوعات الموردين';
    RAISE NOTICE '5. goods_receipts - استلام البضائع';
    RAISE NOTICE '6. goods_receipt_items - عناصر استلام البضائع';
    RAISE NOTICE '';
    RAISE NOTICE 'الدوال المنشأة:';
    RAISE NOTICE '1. create_vendor_financial_account() - إنشاء حساب مالي للمورد';
    RAISE NOTICE '2. generate_purchase_order_number() - توليد رقم أمر الشراء';
    RAISE NOTICE '3. generate_vendor_payment_number() - توليد رقم دفع المورد';
    RAISE NOTICE '4. generate_goods_receipt_number() - توليد رقم استلام البضائع';
    RAISE NOTICE '';
    RAISE NOTICE 'النظام جاهز لتطوير واجهات المستخدم والتكامل مع باقي النظام!';
END $$;