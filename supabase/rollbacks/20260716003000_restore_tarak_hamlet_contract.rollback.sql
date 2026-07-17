DELETE FROM public.contracts
WHERE id = 'c6a9657a-c206-467e-bb42-82b2b2e3f32a'
  AND company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND created_via = 'excel_import_recovery';

DELETE FROM public.customers customer
WHERE customer.id = '7e28b728-2b1e-4ad4-9ff8-989400011400'
  AND customer.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND customer.customer_code = 'HIST-XLS-TARAK-9894'
  AND NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.customer_id = customer.id
  );
