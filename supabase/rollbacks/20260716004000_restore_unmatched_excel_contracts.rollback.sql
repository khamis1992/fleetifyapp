DELETE FROM public.contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND created_via = 'excel_import_recovery'
  AND contract_number IN (
    'HIST-XLS-B70-648144',
    'HIST-XLS-B70-706150',
    'HIST-XLS-B70-893406',
    'HIST-XLS-T77-7038',
    'HIST-XLS-T77-7054',
    'HIST-XLS-T77-5900',
    'HIST-XLS-T77-7071',
    'HIST-XLS-GAC-8213'
  );

DELETE FROM public.customers customer
WHERE customer.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND customer.customer_code IN (
    'HIST-XLS-SUFIAN-648144',
    'HIST-XLS-ELIAS-706150',
    'HIST-XLS-MAHMOUD-893406',
    'HIST-XLS-MEHDI-7038',
    'HIST-XLS-OMAR-7054',
    'HIST-XLS-MOHSEN-5900',
    'HIST-XLS-HAMZA-7071',
    'HIST-XLS-YOSRI-8213'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.contracts contract WHERE contract.customer_id = customer.id
  );
