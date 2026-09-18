-- Migration: Add payment_id to invoices table
-- Created: 2026-01-10
-- Description: This migration adds payment_id column to invoices table
--              to allow linking invoices to payments and prevent duplicates.

-- =========================================
-- Step 1: Add payment_id column to invoices
-- =========================================
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.invoices.payment_id IS
    'The payment that generated this invoice. Used to prevent duplicate invoices from the same payment.';

-- =========================================
-- Step 2: Create unique constraint to prevent duplicates
-- =========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'invoices_company_id_payment_id_unique'
    ) THEN
        ALTER TABLE public.invoices
        ADD CONSTRAINT invoices_company_id_payment_id_unique UNIQUE (company_id, payment_id);

        COMMENT ON CONSTRAINT invoices_company_id_payment_id_unique ON public.invoices IS
            'Ensures that a payment can only generate one invoice per company.';
    END IF;
END $$;

-- =========================================
-- Step 3: Create function to cleanup duplicate invoices
-- =========================================
CREATE OR REPLACE FUNCTION cleanup_duplicate_invoices()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Starting cleanup of duplicate invoices...';

    FOR r IN
        SELECT
            company_id,
            payment_id,
            MIN(id) AS keep_id,
            COUNT(*) AS duplicate_count
        FROM
            public.invoices
        WHERE
            payment_id IS NOT NULL
        GROUP BY
            company_id,
            payment_id
        HAVING
            COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Found % duplicate invoices for company_id: %, payment_id: %. Keeping invoice_id: %',
                     r.duplicate_count, r.company_id, r.payment_id, r.keep_id;

        DELETE FROM public.invoices
        WHERE
            company_id = r.company_id AND payment_id = r.payment_id AND id != r.keep_id;

        RAISE NOTICE 'Deleted % duplicate invoices.', r.duplicate_count - 1;
    END LOOP;

    RAISE NOTICE 'Cleanup of duplicate invoices completed.';
END;
$$;

COMMENT ON FUNCTION cleanup_duplicate_invoices IS
    'Identifies and deletes duplicate invoices based on company_id and payment_id, keeping the oldest one.';

-- =========================================
-- Step 4: Create function to create invoice from payment
-- =========================================
CREATE OR REPLACE FUNCTION create_invoice_from_payment(
    p_payment_id UUID,
    p_company_id UUID,
    p_customer_id UUID,
    p_amount NUMERIC,
    p_due_date DATE DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice_id UUID;
    v_existing_invoice_id UUID;
    v_invoice_number TEXT;
BEGIN
    -- Check if an invoice already exists for this payment
    SELECT id INTO v_existing_invoice_id
    FROM public.invoices
    WHERE company_id = p_company_id AND payment_id = p_payment_id;

    IF v_existing_invoice_id IS NOT NULL THEN
        RAISE WARNING 'Invoice already exists for payment_id % (invoice_id: %). Returning existing invoice ID.', p_payment_id, v_existing_invoice_id;
        RETURN v_existing_invoice_id;
    END IF;

    -- Generate a unique invoice number
    -- Using timestamp-based generation to ensure uniqueness
    SELECT 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
           LPAD(EXTRACT(MICROSECONDS FROM NOW())::TEXT, 6, '0')
    INTO v_invoice_number;

    -- Create the invoice
    INSERT INTO public.invoices (
        company_id,
        customer_id,
        payment_id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        status,
        payment_status,
        notes
    ) VALUES (
        p_company_id,
        p_customer_id,
        p_payment_id,
        v_invoice_number,
        CURRENT_DATE,
        COALESCE(p_due_date, CURRENT_DATE + 30), -- Default 30 days
        p_amount,
        'pending',
        'unpaid',
        COALESCE(p_description, 'Invoice for payment ' || p_payment_id)
    )
    RETURNING id INTO v_invoice_id;

    RETURN v_invoice_id;
END;
$$;

COMMENT ON FUNCTION create_invoice_from_payment IS
    'Creates a new invoice for a given payment, preventing duplicates if one already exists.';;
