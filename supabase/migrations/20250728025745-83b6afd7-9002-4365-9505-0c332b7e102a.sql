-- Update create_vehicle_purchase_journal_entry function to use account mappings
CREATE OR REPLACE FUNCTION public.create_vehicle_purchase_journal_entry(vehicle_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    vehicle_record RECORD;
    journal_entry_id UUID;
    asset_account_id UUID;
    cash_account_id UUID;
    fleet_cost_center_id UUID;
    entry_number TEXT;
BEGIN
    -- الحصول على تفاصيل المركبة
    SELECT * INTO vehicle_record
    FROM public.vehicles
    WHERE id = vehicle_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle not found';
    END IF;
    
    -- التحقق من وجود تكلفة شراء
    IF COALESCE(vehicle_record.purchase_cost, 0) <= 0 THEN
        RETURN NULL;
    END IF;
    
    -- الحصول على مركز تكلفة الأسطول
    SELECT id INTO fleet_cost_center_id
    FROM public.cost_centers
    WHERE company_id = vehicle_record.company_id
    AND center_code = 'FLEET'
    AND is_active = true
    LIMIT 1;
    
    -- إذا لم يوجد مركز أسطول، استخدم الإداري
    IF fleet_cost_center_id IS NULL THEN
        SELECT id INTO fleet_cost_center_id
        FROM public.cost_centers
        WHERE company_id = vehicle_record.company_id
        AND center_code = 'ADMIN'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- استخدام نظام ربط الحسابات للعثور على الحسابات المناسبة
    asset_account_id := public.get_mapped_account_id(vehicle_record.company_id, 'VEHICLES');
    cash_account_id := public.get_mapped_account_id(vehicle_record.company_id, 'CASH');
    
    -- إذا لم يتم العثور على حساب النقدية، جرب حساب البنك
    IF cash_account_id IS NULL THEN
        cash_account_id := public.get_mapped_account_id(vehicle_record.company_id, 'BANK');
    END IF;
    
    -- توليد رقم القيد
    SELECT 'VEH-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(
        (COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+$') AS INTEGER)), 0) + 1)::TEXT, 
        6, '0'
    ) INTO entry_number
    FROM public.journal_entries
    WHERE company_id = vehicle_record.company_id
    AND entry_number LIKE 'VEH-%';
    
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
        vehicle_record.company_id,
        entry_number,
        COALESCE(vehicle_record.purchase_date, vehicle_record.created_at::date),
        'Vehicle Purchase - ' || COALESCE(vehicle_record.plate_number, 'Unknown') || 
        ' (' || COALESCE(vehicle_record.make, '') || ' ' || COALESCE(vehicle_record.model, '') || ')',
        'vehicle_purchase',
        vehicle_record.id,
        vehicle_record.purchase_cost,
        vehicle_record.purchase_cost,
        'draft',
        vehicle_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- إنشاء بنود القيد
    -- مدين: الأصول الثابتة (المركبات)
    IF asset_account_id IS NOT NULL THEN
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
            asset_account_id,
            fleet_cost_center_id,
            1,
            'Vehicle Asset - ' || COALESCE(vehicle_record.plate_number, 'Unknown'),
            vehicle_record.purchase_cost,
            0
        );
    END IF;
    
    -- دائن: النقدية أو البنك
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
            fleet_cost_center_id,
            2,
            'Cash/Bank Payment - Vehicle Purchase',
            0,
            vehicle_record.purchase_cost
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;

-- Update create_invoice_journal_entry function to use account mappings
CREATE OR REPLACE FUNCTION public.create_invoice_journal_entry(invoice_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    invoice_record record;
    journal_entry_id uuid;
    receivable_account_id uuid;
    revenue_account_id uuid;
    sales_cost_center_id uuid;
BEGIN
    SELECT * INTO invoice_record
    FROM public.invoices
    WHERE id = invoice_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    SELECT id INTO sales_cost_center_id
    FROM public.cost_centers
    WHERE company_id = invoice_record.company_id
    AND center_code = 'SALES'
    AND is_active = true
    LIMIT 1;
    
    -- استخدام نظام ربط الحسابات
    receivable_account_id := public.get_mapped_account_id(invoice_record.company_id, 'RECEIVABLES');
    revenue_account_id := public.get_mapped_account_id(invoice_record.company_id, 'SALES_REVENUE');
    
    -- إذا لم يتم العثور على إيرادات المبيعات، جرب إيرادات الإيجار
    IF revenue_account_id IS NULL THEN
        revenue_account_id := public.get_mapped_account_id(invoice_record.company_id, 'RENTAL_REVENUE');
    END IF;
    
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
        invoice_record.company_id,
        generate_journal_entry_number(invoice_record.company_id),
        invoice_record.invoice_date,
        'Invoice #' || invoice_record.invoice_number,
        'invoice',
        invoice_record.id,
        invoice_record.total_amount,
        invoice_record.total_amount,
        'draft',
        invoice_record.created_by
    ) RETURNING id INTO journal_entry_id;
    
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
            sales_cost_center_id,
            1,
            'Accounts Receivable - Invoice #' || invoice_record.invoice_number,
            invoice_record.total_amount,
            0
        );
    END IF;
    
    IF revenue_account_id IS NOT NULL THEN
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
            revenue_account_id,
            sales_cost_center_id,
            2,
            'Sales Revenue - Invoice #' || invoice_record.invoice_number,
            0,
            invoice_record.total_amount
        );
    END IF;
    
    RETURN journal_entry_id;
END;
$function$;