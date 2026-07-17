UPDATE public.payments
SET allocation_status = 'unallocated'
WHERE allocation_status = 'cancelled';

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_allocation_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_allocation_status_check
  CHECK (allocation_status IN (
    'unallocated',
    'partially_allocated',
    'fully_allocated'
  ));
