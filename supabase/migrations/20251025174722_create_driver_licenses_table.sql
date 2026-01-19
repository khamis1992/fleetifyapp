-- Migration: Create Driver Licenses Table
-- Description: Comprehensive driver license management system for car rental tracking
-- Author: Claude Code
-- Date: 2025-10-25

-- ===============================
-- Table: driver_licenses
-- ===============================
CREATE TABLE IF NOT EXISTS public.driver_licenses (
    -- Primary identification
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Foreign keys
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

    -- License information
    license_number VARCHAR(50) NOT NULL,
    issue_date DATE,
    expiry_date DATE NOT NULL,
    issuing_country VARCHAR(100) NOT NULL DEFAULT 'SA',

    -- Document images (stored in Supabase storage)
    front_image_url TEXT,
    back_image_url TEXT,

    -- Verification tracking
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,

    -- Additional information
    notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),

    -- Constraints
    CONSTRAINT unique_customer_license UNIQUE (customer_id, license_number),
    CONSTRAINT valid_expiry_date CHECK (expiry_date > issue_date OR issue_date IS NULL),
    CONSTRAINT valid_verification CHECK (
        (verification_status != 'verified') OR
        (verification_status = 'verified' AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
    )
);

-- ===============================
-- Indexes for Performance
-- ===============================
CREATE INDEX idx_driver_licenses_company_id ON public.driver_licenses(company_id);
CREATE INDEX idx_driver_licenses_customer_id ON public.driver_licenses(customer_id);
CREATE INDEX idx_driver_licenses_expiry_date ON public.driver_licenses(expiry_date);
CREATE INDEX idx_driver_licenses_verification_status ON public.driver_licenses(verification_status);
CREATE INDEX idx_driver_licenses_created_at ON public.driver_licenses(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_driver_licenses_company_customer ON public.driver_licenses(company_id, customer_id);

-- ===============================
-- Row Level Security (RLS)
-- ===============================
ALTER TABLE public.driver_licenses ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can view licenses from their company
CREATE POLICY "Users can view driver licenses from their company"
ON public.driver_licenses
FOR SELECT
USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

-- Policy: INSERT - Users can create licenses for their company
CREATE POLICY "Users can create driver licenses for their company"
ON public.driver_licenses
FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

-- Policy: UPDATE - Users can update licenses from their company
CREATE POLICY "Users can update driver licenses from their company"
ON public.driver_licenses
FOR UPDATE
USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
)
WITH CHECK (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

-- Policy: DELETE - Users can delete licenses from their company
CREATE POLICY "Users can delete driver licenses from their company"
ON public.driver_licenses
FOR DELETE
USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

-- ===============================
-- Function: Get Expiring Licenses
-- ===============================
CREATE OR REPLACE FUNCTION public.get_expiring_licenses(days_threshold INT DEFAULT 30)
RETURNS TABLE (
    license_id UUID,
    customer_id UUID,
    customer_name TEXT,
    license_number VARCHAR(50),
    expiry_date DATE,
    days_until_expiry INT,
    company_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dl.id AS license_id,
        dl.customer_id,
        CASE
            WHEN c.customer_type = 'individual'
            THEN COALESCE(c.first_name || ' ' || c.last_name, c.first_name_ar || ' ' || c.last_name_ar, 'N/A')
            ELSE COALESCE(c.company_name, c.company_name_ar, 'N/A')
        END AS customer_name,
        dl.license_number,
        dl.expiry_date,
        (dl.expiry_date - CURRENT_DATE)::INT AS days_until_expiry,
        dl.company_id
    FROM public.driver_licenses dl
    JOIN public.customers c ON dl.customer_id = c.id
    WHERE
        dl.expiry_date <= (CURRENT_DATE + days_threshold)
        AND dl.expiry_date >= CURRENT_DATE
        AND dl.verification_status = 'verified'
        AND dl.company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE id = auth.uid()
        )
    ORDER BY dl.expiry_date ASC;
END;
$$;

-- ===============================
-- Function: Auto-Update Expired Status
-- ===============================
CREATE OR REPLACE FUNCTION public.update_expired_licenses()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.driver_licenses
    SET
        verification_status = 'expired',
        updated_at = now()
    WHERE
        expiry_date < CURRENT_DATE
        AND verification_status IN ('verified', 'pending');
END;
$$;

-- ===============================
-- Trigger: Auto-update updated_at
-- ===============================
CREATE OR REPLACE FUNCTION public.update_driver_licenses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_driver_licenses_updated_at
    BEFORE UPDATE ON public.driver_licenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_driver_licenses_updated_at();

-- ===============================
-- Trigger: Auto-update created_by
-- ===============================
CREATE OR REPLACE FUNCTION public.set_driver_license_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_driver_license_created_by
    BEFORE INSERT ON public.driver_licenses
    FOR EACH ROW
    EXECUTE FUNCTION public.set_driver_license_created_by();

-- ===============================
-- Comments for Documentation
-- ===============================
COMMENT ON TABLE public.driver_licenses IS 'Stores driver license information for customers including verification status and expiry tracking';
COMMENT ON COLUMN public.driver_licenses.verification_status IS 'Status: pending (newly uploaded), verified (approved by staff), rejected (invalid), expired (past expiry date)';
COMMENT ON COLUMN public.driver_licenses.issuing_country IS 'ISO country code or full country name (e.g., SA, AE, KW, QA)';
COMMENT ON FUNCTION public.get_expiring_licenses IS 'Returns licenses expiring within specified days threshold (default 30 days)';
COMMENT ON FUNCTION public.update_expired_licenses IS 'Marks all expired licenses with expired status - should be run daily via cron';
