-- ================================================================
-- Migration: Review non-rent receipts flagging table
-- Created: 2026-08-30
-- (mirror of applied migration review_non_rent_receipts_flagging)
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'review_non_rent_receipts'
  ) THEN
    CREATE TABLE public.review_non_rent_receipts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES public.companies(id),
      payment_id uuid NOT NULL REFERENCES public.payments(id),
      contract_id uuid REFERENCES public.contracts(id),
      contract_number text,
      payment_number text NOT NULL,
      amount numeric NOT NULL CHECK (amount > 0),
      receipt_kind text NOT NULL
        CHECK (receipt_kind IN ('traffic_fine', 'insurance', 'vehicle_damage', 'istimara', 'other_non_rent')),
      evidence text,
      status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'reclassified', 'refunded', 'dismissed')),
      decision_note text,
      decided_at timestamptz,
      decided_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (company_id, payment_id)
    );

    CREATE INDEX idx_review_non_rent_company
      ON public.review_non_rent_receipts (company_id, status);
    CREATE INDEX idx_review_non_rent_contract
      ON public.review_non_rent_receipts (contract_id);

    ALTER TABLE public.review_non_rent_receipts ENABLE ROW LEVEL SECURITY;

    CREATE POLICY review_non_rent_company_read
      ON public.review_non_rent_receipts
      FOR SELECT
      USING (
        company_id = user_company_id()
        OR has_role(auth.uid(), 'super_admin')
      );

    CREATE POLICY review_non_rent_admin_write
      ON public.review_non_rent_receipts
      FOR ALL
      USING (
        has_role(auth.uid(), 'super_admin')
        OR (
          company_id = get_user_company(auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.company_id = company_id
              AND p.role IN ('admin', 'super_admin', 'company_admin', 'manager', 'accountant')
              AND p.is_active = true
          )
        )
      )
      WITH CHECK (
        has_role(auth.uid(), 'super_admin')
        OR (
          company_id = get_user_company(auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.company_id = company_id
              AND p.role IN ('admin', 'super_admin', 'company_admin', 'manager', 'accountant')
              AND p.is_active = true
          )
        )
      );

    RAISE NOTICE 'Created review_non_rent_receipts';
  END IF;
END $$;