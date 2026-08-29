ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_allocation_status_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_allocation_status_check
  CHECK (allocation_status IN (
    'unallocated',
    'partially_allocated',
    'fully_allocated',
    'cancelled'
  ));
COMMENT ON CONSTRAINT payments_allocation_status_check ON public.payments IS
  'Allows the canonical cancellation RPC to mark a cancelled payment allocation explicitly.';
