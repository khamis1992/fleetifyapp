-- Migration: Create Payment Queue Table
-- Created: 2026-01-10
-- Description: This migration creates a table to manage payment queue
--              for asynchronous processing and retries.

-- =========================================
-- Table: payment_queue
-- =========================================
CREATE TABLE IF NOT EXISTS public.payment_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    queue_type TEXT NOT NULL CHECK (queue_type IN ('processing', 'retry', 'manual_review')),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_attempt_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one payment can only be in one queue type at a time
    UNIQUE (payment_id, queue_type)
);

COMMENT ON TABLE public.payment_queue IS
    'Manages payment queue for asynchronous processing, retries, and manual review.';

COMMENT ON COLUMN public.payment_queue.queue_type IS
    'The type of queue: processing (new payments), retry (failed payments), manual_review (requires human intervention).';

COMMENT ON COLUMN public.payment_queue.attempts IS
    'Number of retry attempts made for this payment.';

COMMENT ON COLUMN public.payment_queue.next_attempt_at IS
    'When to attempt processing again for this payment.';

-- =========================================
-- RLS Policies
-- =========================================
ALTER TABLE public.payment_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable full access for users based on company_id" ON public.payment_queue;
CREATE POLICY "Enable full access for users based on company_id" ON public.payment_queue
    FOR ALL USING (auth.uid() IN ( SELECT profiles.id FROM profiles WHERE profiles.company_id = payment_queue.company_id ));

-- =========================================
-- Trigger for updated_at
-- =========================================
DROP TRIGGER IF EXISTS set_payment_queue_updated_at ON public.payment_queue;
CREATE TRIGGER set_payment_queue_updated_at
    BEFORE UPDATE ON public.payment_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();;
