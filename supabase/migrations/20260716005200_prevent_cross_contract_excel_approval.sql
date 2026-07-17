CREATE UNIQUE INDEX IF NOT EXISTS idx_excel_import_versions_company_approved_content
  ON public.excel_import_versions(company_id, content_hash)
  WHERE status = 'approved';

COMMENT ON INDEX public.idx_excel_import_versions_company_approved_content IS
  'Prevents the same workbook content from being approved against two contracts in one company.';
